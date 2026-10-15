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
from datetime import datetime

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID', '1926342151')
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
REPO = 'jntucej/monitoring'

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

def handle_deploy():
    """Handle /deploy command"""
    msg = "🚀 <b>Deploy Initiated</b>\n\n"
    msg += "Triggering GitHub Actions workflow...\n\n"
    
    result = trigger_github_workflow('deploy')
    
    if result['success']:
        msg += f"✅ Workflow triggered!\n"
        msg += f"Run ID: #{result['run_id']}\n\n"
        msg += "You'll get a notification when it completes."
    else:
        msg += f"❌ Failed to trigger workflow\n"
        msg += f"Error: {result['error']}"
    
    return msg

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

def handle_retry():
    """Handle /retry command"""
    msg = "🔄 <b>Retry Deployment</b>\n\n"
    msg += "Retrying the last deployment...\n\n"
    
    result = trigger_github_workflow('retry')
    
    if result['success']:
        msg += f"✅ Retry triggered!\n"
        msg += f"Run ID: #{result['run_id']}\n\n"
        msg += "You'll get a notification when it completes."
    else:
        msg += f"❌ Failed to trigger retry\n"
        msg += f"Error: {result['error']}"
    
    return msg

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
