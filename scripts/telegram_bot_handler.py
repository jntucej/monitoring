#!/usr/bin/env python3
"""
Telegram Bot Handler for Gate Monitor
Handles commands: /deploy, /heal, /retry, /status, /fix
"""

import os
import sys
import json
import subprocess
import urllib.request
import urllib.error

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID', '1926342151')
SSH_KEY = os.path.expanduser('~/.ssh/myrepo_deploy')
REMOTE_HOST = '192.168.1.36'

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
            ['ssh', '-o', f'ConnectTimeout={timeout}', '-o', 'StrictHostKeyChecking=no',
             '-i', SSH_KEY, f'root@{REMOTE_HOST}', command],
            capture_output=True, text=True, timeout=timeout + 5
        )
        return result.returncode == 0, result.stdout.strip(), result.stderr.strip()
    except Exception as e:
        return False, '', str(e)

def cmd_deploy():
    """Deploy latest code"""
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
                msg += "🔗 http://192.168.1.36"
                break
            import time
            time.sleep(5)
    else:
        msg += "❌ Deployment failed\n\n"
        msg += f"Error: {err or out}"
    
    return msg

def cmd_heal():
    """Run auto-heal agent"""
    msg = "🤖 <b>Auto-Heal Agent</b>\n\n"
    msg += "Running diagnostics...\n\n"
    
    # Test SSH
    success, out, err = ssh_run("echo OK")
    if success:
        msg += "✅ SSH: Connected\n"
    else:
        msg += f"❌ SSH: {err}\n"
        return msg
    
    # Check containers
    success, out, _ = ssh_run("docker ps --filter name=gate --format '{{.Names}}: {{.Status}}'")
    if success:
        msg += "\n<b>Containers:</b>\n"
        for line in out.split('\n'):
            if 'healthy' in line.lower():
                msg += f"✅ {line}\n"
            elif 'unhealthy' in line.lower():
                msg += f"❌ {line}\n"
            else:
                msg += f"⚪ {line}\n"
    else:
        msg += "❌ Docker: Not accessible\n"
    
    # Check git
    success, out, _ = ssh_run("cd /opt/monitoring/compose && git log -1 --oneline")
    if success:
        msg += f"\n<b>Latest commit:</b> {out}\n"
    else:
        msg += "\n⚠️ Git: Not accessible\n"
    
    msg += "\nHealing complete."
    return msg

def cmd_fix():
    """Attempt to fix issues"""
    msg = "🔧 <b>Auto-Fix Agent</b>\n\n"
    
    fixes_applied = []
    
    # Fix 1: Restart containers
    success, out, err = ssh_run("docker compose -f /opt/monitoring/compose/docker-compose.yml restart 2>&1")
    if success:
        fixes_applied.append("Restarted containers")
    
    # Fix 2: Check and fix git
    success, out, err = ssh_run("cd /opt/monitoring/compose && git fetch origin 2>&1 && git status --short")
    if success:
        fixes_applied.append("Refreshed git")
    
    # Fix 3: Pull latest
    success, out, err = ssh_run("cd /opt/monitoring/compose && git reset --hard origin/main 2>&1")
    if success:
        fixes_applied.append("Pulled latest code")
    
    # Fix 4: Rebuild and restart
    success, out, err = ssh_run("cd /opt/monitoring/compose && docker compose build web --no-cache 2>&1 && docker compose up -d 2>&1")
    if success:
        fixes_applied.append("Rebuilt and restarted")
    
    if fixes_applied:
        msg += "Applied fixes:\n"
        for fix in fixes_applied:
            msg += f"✅ {fix}\n"
    else:
        msg += "No fixes needed or all attempts failed.\n"
    
    # Verify
    success, out, _ = ssh_run("docker ps --filter name=gate --format '{{.Names}}: {{.Status}}'")
    if success and 'healthy' in out:
        msg += "\n✅ All containers healthy!"
    else:
        msg += f"\n⚠️ Status: {out or 'unknown'}"
    
    return msg

def cmd_status():
    """Show server status"""
    msg = "📊 <b>Server Status</b>\n\n"
    
    # Container status
    success, out, _ = ssh_run("docker ps --filter name=gate --format 'table {{.Names}}\t{{.Status}}'")
    if success:
        msg += "<b>Containers:</b>\n"
        msg += out + "\n"
    else:
        msg += "❌ Could not get container status\n"
    
    # Git status
    success, out, _ = ssh_run("cd /opt/monitoring/compose && git log -1 --oneline")
    if success:
        msg += f"\n<b>Latest commit:</b> {out}\n"
    else:
        msg += "\n⚠️ Git status unavailable\n"
    
    # Uptime
    success, out, _ = ssh_run("uptime -p")
    if success:
        msg += f"\n<b>Uptime:</b> {out}\n"
    
    return msg

def cmd_retry():
    """Retry last deployment"""
    msg = "🔄 <b>Retrying Deployment</b>\n\n"
    
    # Get last commit hash
    success, last_hash, _ = ssh_run("cd /opt/monitoring/compose && git rev-parse HEAD")
    if success:
        msg += f"Retrying from: {last_hash[:8]}\n\n"
    
    # Run deploy
    return cmd_deploy()

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 telegram_bot_handler.py <command>")
        print("Commands: deploy, heal, fix, status, retry")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    handlers = {
        'deploy': cmd_deploy,
        'heal': cmd_heal,
        'fix': cmd_fix,
        'status': cmd_status,
        'retry': cmd_retry,
    }
    
    if command not in handlers:
        msg = "Unknown command. Use: /deploy, /heal, /fix, /status, /retry"
        print(msg)
        send_telegram(msg)
        sys.exit(1)
    
    message = handlers[command]()
    print(message)
    send_telegram(message)

if __name__ == '__main__':
    main()
