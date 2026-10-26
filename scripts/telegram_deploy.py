#!/usr/bin/env python3
"""
Telegram Deploy Bot
Usage:
  /deploy - Trigger deployment
  /heal - Auto-heal and fix issues
  /retry - Retry failed deployment
  /status - Check server status
"""

import os
import sys
import subprocess
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s: %(message)s')

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID', '')
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
REPO = 'jntucej/monitoring'

# Comma-separated allowlist of Telegram user IDs permitted to trigger a deploy.
# Read TELEGRAM_ALLOWED_USER_IDS from env; fail-closed if unset (no allowlist
# → refuse dispatch so an unknown Telegram identity can't trigger workflows).
TELEGRAM_ALLOWED_USER_IDS = os.getenv('TELEGRAM_ALLOWED_USER_IDS', '')

if not TELEGRAM_CHAT_ID:
    raise SystemExit(
        'TELEGRAM_CHAT_ID env var is required; refusing to start with no chat target'
    )

def _resolve_allowed_user_ids() -> list:
    """Parse the TELEGRAM_ALLOWED_USER_IDS allowlist.

    Empty / unset → empty list (fail-closed). Callers MUST refuse dispatch
    when the resulting list is empty so an unknown Telegram user can never
    trigger a GitHub workflow.
    """
    raw = os.getenv('TELEGRAM_ALLOWED_USER_IDS', '').strip()
    if not raw:
        return []
    return [s.strip() for s in raw.split(',') if s.strip()]

def _dispatch_allowed(from_user_id) -> bool:
    """Fail-closed allowlist check: only dispatch when from_user.id is in
    TELEGRAM_ALLOWED_USER_IDS. Unset / empty allowlist → refuse."""
    allowed = _resolve_allowed_user_ids()
    if not allowed:
        logger.warning(
            'TELEGRAM_ALLOWED_USER_IDS unset or empty; refusing to dispatch '
            'from user %s (fail-closed)', from_user_id
        )
        return False
    if str(from_user_id) not in allowed:
        logger.warning('Rejected deploy from untrusted user %s', from_user_id)
        return False
    return True

def send_telegram_message(message: str, parse_mode: str = 'HTML'):
    """Send message to Telegram"""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    data = {
        'chat_id': TELEGRAM_CHAT_ID,
        'text': message,
        'parse_mode': parse_mode,
        'disable_web_page_preview': True
    }
    try:
        import urllib.request
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode(),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"Telegram error: {e}")
        return None

def trigger_github_workflow(action: str) -> dict:
    """Trigger GitHub Actions workflow"""
    url = f"https://api.github.com/repos/{REPO}/actions/workflows/telegram-deploy.yml/dispatches"
    
    import urllib.request
    import urllib.error
    
    data = json.dumps({
        'ref': 'main',
        'inputs': {'action': action}
    }).encode()
    
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Authorization', f'token {GITHUB_TOKEN}')
    req.add_header('Accept', 'application/vnd.github.v3+json')
    req.add_header('Content-Type', 'application/json')
    
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode())
            run_id = result.get('id', 'unknown')
            return {'success': True, 'run_id': run_id}
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        return {'success': False, 'error': error_body[:200]}
    except Exception as e:
        return {'success': False, 'error': str(e)[:200]}

def check_server_status() -> str:
    """Check server status via SSH"""
    try:
        result = subprocess.run(
            ['ssh', '-o', 'ConnectTimeout=10', '-o', 'StrictHostKeyChecking=no',
             '-i', os.path.expanduser('~/.ssh/myrepo_deploy'),
             'root@192.168.1.36',
             'docker ps --filter name=gate --format "{{.Names}}: {{.Status}}"'],
            capture_output=True, text=True, timeout=15
        )
        return result.stdout.strip() if result.returncode == 0 else "SSH failed"
    except Exception as e:
        return f"Error: {e}"

def handle_deploy(msg=None):
    """Handle /deploy command. `msg` is a Telegram Message-like object with
    .from_user.id when called from the bot handler; pass None in CLI/SSO
    mode and the call is treated as authorized (the CLI path is only
    reachable by a human who already holds the bot token + GitHub token)."""
    if msg is not None:
        user_id = getattr(msg, 'from_user', None) and msg.from_user.id
        if not _dispatch_allowed(user_id):
            return ("🚫 <b>Deploy rejected</b>\n\n"
                    "Your Telegram user is not in TELEGRAM_ALLOWED_USER_IDS.\n"
                    "Contact the repo owner to add your ID.")
    msg_html = "🚀 <b>Deploy Initiated</b>\n\n"
    msg_html += "Triggering GitHub Actions workflow...\n\n"

    result = trigger_github_workflow('deploy')

    if result['success']:
        msg_html += f"✅ Workflow triggered!\n"
        msg_html += f"Run ID: #{result['run_id']}\n\n"
        msg_html += "You'll get a notification when it completes."
    else:
        msg_html += f"❌ Failed to trigger workflow\n"
        msg_html += f"Error: {result['error']}"

    return msg_html

def handle_heal():
    """Handle /heal command"""
    msg = "🤖 <b>Auto-Heal Agent</b>\n\n"
    msg += "Diagnosing issues...\n\n"
    
    # Check SSH
    try:
        result = subprocess.run(
            ['ssh', '-o', 'ConnectTimeout=10', '-o', 'StrictHostKeyChecking=no',
             '-i', os.path.expanduser('~/.ssh/myrepo_deploy'),
             'root@192.168.1.36', 'echo OK'],
            capture_output=True, text=True, timeout=15
        )
        
        if result.returncode == 0:
            msg += "✅ SSH connectivity: Working\n"
            
            # Check Tailscale Funnel
            funnel_result = subprocess.run(
                ['ssh', '-o', 'ConnectTimeout=10', '-i', os.path.expanduser('~/.ssh/myrepo_deploy'),
                 'root@192.168.1.36', 'tailscale funnel status'],
                capture_output=True, text=True, timeout=10
            )
            
            if "No serve config" in funnel_result.stdout:
                msg += "⚠️ Tailscale Funnel: Not active\n"
                msg += "Attempting to enable...\n"
                
                # Try to enable funnel
                enable_result = subprocess.run(
                    ['ssh', '-o', 'ConnectTimeout=30', '-i', os.path.expanduser('~/.ssh/myrepo_deploy'),
                     'root@192.168.1.36', 'tailscale funnel --tcp 22'],
                    capture_output=True, text=True, timeout=35
                )
                
                if enable_result.returncode == 0:
                    msg += "✅ Tailscale Funnel enabled\n"
                else:
                    msg += "❌ Failed to enable Funnel\n"
            else:
                msg += "✅ Tailscale Funnel: Active\n"
            
            # Check Docker
            docker_result = subprocess.run(
                ['ssh', '-o', 'ConnectTimeout=10', '-i', os.path.expanduser('~/.ssh/myrepo_deploy'),
                 'root@192.168.1.36',
                 'docker ps --filter name=gate --format "{{.Status}}" | head -1'],
                capture_output=True, text=True, timeout=10
            )
            
            msg += f"✅ Docker: {docker_result.stdout.strip()}\n"
        else:
            msg += "❌ SSH connectivity: FAILED\n"
            msg += "\nTo fix manually:\n"
            msg += "1. Check server is running\n"
            msg += "2. Verify Tailscale is connected\n"
            msg += "3. Run: tailscale funnel --tcp 22\n"
    except Exception as e:
        msg += f"❌ Error during diagnosis: {e}"
    
    msg += "\nRun /deploy to attempt deployment after healing."
    
    return msg

def handle_retry(msg=None):
    """Handle /retry command. `msg` is a Telegram Message-like object with
    .from_user.id when called from the bot handler; pass None in CLI mode."""
    if msg is not None:
        user_id = getattr(msg, 'from_user', None) and msg.from_user.id
        if not _dispatch_allowed(user_id):
            return ("🚫 <b>Retry rejected</b>\n\n"
                    "Your Telegram user is not in TELEGRAM_ALLOWED_USER_IDS.\n"
                    "Contact the repo owner to add your ID.")
    msg_html = "🔄 <b>Retry Deployment</b>\n\n"
    msg_html += "Retrying the last deployment...\n\n"

    result = trigger_github_workflow('retry')

    if result['success']:
        msg_html += f"✅ Retry triggered!\n"
        msg_html += f"Run ID: #{result['run_id']}\n\n"
        msg_html += "You'll get a notification when it completes."
    else:
        msg_html += f"❌ Failed to trigger retry\n"
        msg_html += f"Error: {result['error']}"

    return msg_html

def handle_status():
    """Handle /status command"""
    msg = "📊 <b>Server Status</b>\n\n"
    
    status = check_server_status()
    msg += status + "\n\n"
    
    # Check Tailscale
    try:
        result = subprocess.run(
            ['ssh', '-o', 'ConnectTimeout=10', '-i', os.path.expanduser('~/.ssh/myrepo_deploy'),
             'root@192.168.1.36', 'tailscale status | head -3'],
            capture_output=True, text=True, timeout=10
        )
        msg += "<b>Tailscale:</b>\n"
        msg += result.stdout.strip() + "\n"
    except:
        msg += "⚠️ Could not check Tailscale\n"
    
    return msg

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 telegram_deploy.py <command>")
        print("Commands: deploy, heal, retry, status")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == 'deploy':
        message = handle_deploy()
    elif command == 'heal':
        message = handle_heal()
    elif command == 'retry':
        message = handle_retry()
    elif command == 'status':
        message = handle_status()
    else:
        message = "Unknown command. Use: /deploy, /heal, /retry, /status"
    
    print(message)
    send_telegram_message(message)

if __name__ == '__main__':
    main()
