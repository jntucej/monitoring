#!/usr/bin/env python3
import json
import os
import subprocess
import sys
import time
from pathlib import Path

TELEGRAM_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
_auth_chat_id = os.environ.get("TELEGRAM_CHAT_ID")
if not _auth_chat_id:
    raise SystemExit("TELEGRAM_CHAT_ID environment variable is required")
AUTHORIZED_CHAT_ID = int(_auth_chat_id)
BASE_DIR = Path("/root/monitoring")

def tg_send(msg: str, chat_id: int = AUTHORIZED_CHAT_ID) -> None:
    if not TELEGRAM_TOKEN: return
    import urllib.request, urllib.parse
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage?chat_id={chat_id}&text={urllib.parse.quote(msg)}"
    try: urllib.request.urlopen(url, timeout=10).read()
    except Exception: pass

def run(cmd: list) -> str:
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        return (r.stdout + r.stderr).strip() or "(no output)"
    except Exception as e:
        return f"Error: {e}"

def handle(cmd: str):
    c = cmd.strip().split()[0].lower() if cmd.strip() else "help"
    if c == "deploylog":
        import subprocess
        try:
            out = subprocess.run(["tail", "-n", "30", "/var/log/monitoring-deploy.log"], capture_output=True, text=True, timeout=5).stdout
            if not out.strip(): return "Log is empty."
            return f"📜 *Last 30 lines of Deploy Log:*\n\n`{out}`"
        except Exception as e:
            return f"Error reading log: {e}"

    if c == "deploystatus":
        try:
            # Check last update time
            last_run = subprocess.check_output(["stat", "-c", "%y", "/var/log/monitoring-deploy.log"], text=True).strip()
            # Check if cron exists
            cron_check = subprocess.run(["crontab", "-l"], capture_output=True, text=True).stdout
            is_scheduled = "auto-check.sh" in cron_check
            
            return f"🤖 *Auto-Deploy Status*\n\n• *Scheduled:* {'✅ Yes' if is_scheduled else '❌ No'}\n• *Last Activity:* `{last_run}`"
        except Exception as e:
            return f"Error checking status: {e}"

    if c == "checkstatus":
        import os, datetime
        try:
            mtime = os.path.getmtime("/var/log/monitoring-heartbeat.log")
            last_check = datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M:%S')
            return f"✅ Auto-deploy cron is running.\n🕒 Last check: {last_check}"
        except:
            return "❌ Heartbeat file not found."

    if c == "stats":
        return run(["uptime"]) + "\n\n" + run(["free", "-h"])
    elif c == "tail":
        svc = cmd.split()[1] if len(cmd.split())>1 else "gate-web"
        return run(["docker", "compose", "-f", str(BASE_DIR/"docker-compose.yml"), "logs", "--tail=20", svc])
    elif c == "ps":
        return run(["docker", "compose", "-f", str(BASE_DIR/"docker-compose.yml"), "ps"])
    elif c == "updates":
        return run(["git", "-C", str(BASE_DIR), "fetch"]) + "\n" + run(["git", "-C", str(BASE_DIR), "status"])
    else:
        return """🤖 *Gate Monitor - Bot Commands*

*Infrastructure:*
/stats - Server uptime & memory
/ps - Show container status

*Deployment:*
/deploylog - Last 30 lines of deployment log
/updates - Check for new code on GitHub
/checkstatus - Check auto-deploy heartbeat
/tail <svc> - View logs for a specific service

*General:*
/help - Show this menu"""

def main():
    offset = 0
    while True:
        try:
            import urllib.request
            url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/getUpdates?offset={offset}&timeout=30"
            with urllib.request.urlopen(url, timeout=35) as resp:
                data = json.loads(resp.read())
            for update in data.get("result", []):
                offset = update["update_id"] + 1
                msg = update.get("message")
                if not msg: continue
                chat = msg.get("chat", {}).get("id")
                text = msg.get("text", "").strip()
                if str(chat) != str(AUTHORIZED_CHAT_ID): continue
                if text.startswith("/"):
                    tg_send(handle(text[1:]), chat)
        except Exception:
            time.sleep(5)

if __name__ == "__main__": main()
