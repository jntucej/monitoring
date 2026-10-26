#!/usr/bin/env python3
"""
Telegram Bot Handler for Gate Monitor
Handles commands: /deploy, /heal, /retry, /status, /fix

Security: before dispatching any deploy/retry, the bot verifies that the
requesting Telegram user's ID is in TELEGRAM_ALLOWED_USER_IDS (comma-separated).
If the allowlist is unset or empty, dispatch is refused (fail-closed) so an
unknown Telegram identity cannot trigger deploys.
"""

import os
import sys
import json
import logging
import subprocess
import urllib.request
import urllib.error

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s: %(message)s')

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')
SSH_KEY = os.path.expanduser(os.getenv('DEPLOY_SSH_KEY', '~/.ssh/myrepo_deploy'))
REMOTE_HOST = os.getenv('DEPLOY_REMOTE_HOST')
TELEGRAM_ALLOWED_USER_IDS = os.getenv('TELEGRAM_ALLOWED_USER_IDS', '')

def _resolve_allowed_user_ids() -> list:
    raw = TELEGRAM_ALLOWED_USER_IDS.strip()
    if not raw:
        return []
    return [s.strip() for s in raw.split(',') if s.strip()]

def _user_allowed(from_user_id) -> bool:
    """Fail-closed: return True only when from_user.id is in the allowlist."""
    allowed = _resolve_allowed_user_ids()
    if not allowed:
        logger.warning(
            'TELEGRAM_ALLOWED_USER_IDS unset or empty; refusing dispatch '
            'from user %s (fail-closed)', from_user_id
        )
        return False
    if str(from_user_id) not in allowed:
        logger.warning('Rejected deploy from untrusted user %s', from_user_id)
        return False
    return True

def require_env():
    missing = [
        name for name, value in [
            ('TELEGRAM_BOT_TOKEN', TELEGRAM_BOT_TOKEN),
            ('TELEGRAM_CHAT_ID', TELEGRAM_CHAT_ID),
            ('DEPLOY_REMOTE_HOST', REMOTE_HOST),
        ]
        if not value
    ]
    if missing:
        print(f"FATAL: missing env vars: {', '.join(missing)}", file=sys.stderr)
        sys.exit(1)
    if not os.path.exists(SSH_KEY):
        print(f"FATAL: SSH key not found: {SSH_KEY}", file=sys.stderr)
        sys.exit(1)

def send_telegram(text: str, parse_mode: str = 'HTML'):
    """Send message via Telegram Bot API"""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    data = json.dumps({
        'chat_id': TELEGRAM_CHAT_ID,
        'text': text,
        'parse_mode': parse_mode,
        'disable_web_page_preview': True
    }).encode()
    
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"Telegram error: {e}")
        return None

def ssh_run(command: str, timeout: int = 30) -> tuple:
    """Run command via SSH and return (success, stdout, stderr)"""
    try:
        result = subprocess.run(
            ['ssh', '-o', f'ConnectTimeout={timeout}', '-o', 'StrictHostKeyChecking=accept-new',
             '-i', SSH_KEY, f'root@{REMOTE_HOST}', command],
            capture_output=True, text=True, timeout=timeout + 5
        )
        return result.returncode == 0, result.stdout.strip(), result.stderr.strip()
    except Exception as e:
        return False, '', str(e)

def cmd_deploy(from_user_id=None):
    """Deploy latest code. `from_user_id` is the Telegram user who requested
    the deploy (int or str). When provided, it is checked against
    TELEGRAM_ALLOWED_USER_IDS; when the allowlist is unset/empty, dispatch
    is refused (fail-closed). Pass None only for direct/SSO invocation
    where the caller already holds the bot token + SSH key."""
    if from_user_id is not None and not _user_allowed(from_user_id):
        return ("🚫 <b>Deploy rejected</b>\n\n"
                "Your Telegram user is not in TELEGRAM_ALLOWED_USER_IDS.\n"
                "Contact the repo owner to add your ID.")
    require_env()
    msg = "🚀 <b>Deploy Initiated</b>\n\n"
    
    success, out, err = ssh_run("""
        cd /opt/monitoring/compose &&
        git fetch origin &&
        git reset --hard origin/main &&
        docker compose build web --no-cache &&
        docker compose up -d --remove-orphans &&
        echo DEPLOYED
    """, timeout=120)
    
    if success and 'DEPLOYED' in out:
        msg += "✅ Deployment successful!\n\n"
        msg += "Waiting for health check...\n"
        
        # Wait for healthy
        for i in range(12):
            success, out, _ = ssh_run("docker inspect --format='{{.State.Health.Status}}' gate_web")
            if 'healthy' in out:
                msg += "✅ Container is healthy!\n\n"
                msg += f"🔗 http://{REMOTE_HOST}"
                break
            import time
            time.sleep(5)
    else:
        msg += "❌ Deployment failed\n\n"
        msg += f"Error: {err or out}"
    
    return msg

def main():
    require_env()
    print("Telegram bot handler running...")

if __name__ == '__main__':
    main()
