#!/usr/bin/env python3
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

TELEGRAM_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
_auth_chat_id = os.environ.get("TELEGRAM_CHAT_ID")

if not TELEGRAM_TOKEN:
    raise SystemExit("FATAL: TELEGRAM_BOT_TOKEN must be set")
if not _auth_chat_id:
    raise SystemExit("FATAL: TELEGRAM_CHAT_ID must be set")

AUTHORIZED_CHAT_ID = int(_auth_chat_id)
BASE_DIR = Path("/root/monitoring")

# Explicit command allowlist
ALLOWED_COMMANDS = {"help", "status", "status", "log", "restart", "health", "deploylog", "deploystatus", "checkstatus", "stats", "tail", "ps", "updates"}

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

def handle(cmd: str, chat_id: int) -> str:
    # Defense in depth: re-verify authorization inside handle()
    if chat_id != AUTHORIZED_CHAT_ID:
        print(f"[SECURITY] Unauthorized command from chat {chat_id}: {cmd!r}")
        return "Unauthorized."

    parts = cmd.strip().split()
    if not parts:
        return "No command provided."
    verb = parts[0].lower()

    if verb not in ALLOWED_COMMANDS:
        return f"Unknown command: {verb}"

    if verb == "deploylog":
        try:
            out = subprocess.run(["tail", "-n", "30", "/var/log/monitoring-deploy.log"], capture_output=True, text=True, timeout=5).stdout
            if not out.strip(): return "Log is empty."
            return f"📜 *Last 30 lines of Deploy Log:*\n\n`{out}`"
        except Exception as e:
            return f"Error reading log: {e}"

    if verb == "deploystatus":
        try:
            last_run = subprocess.check_output(["stat", "-c", "%y", "/var/log/monitoring-deploy.log"], text=True).strip()
            cron_check = subprocess.run(["crontab", "-l"], capture_output=True, text=True).stdout
            is_scheduled = "auto-check.sh" in cron_check
            return f"🤖 *Auto-Deploy Status*\n\n• *Scheduled:* {'✅ Yes' if is_scheduled else '❌ No'}\n• *Last Activity:* `{last_run}`"
        except Exception as e:
            return f"Error checking status: {e}"

    if verb == "checkstatus":
        try:
            mtime = os.path.getmtime("/var/log/monitoring-heartbeat.log")
            last_check = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(mtime))
            return f"✅ Auto-deploy cron is running.\n🕒 Last check: {last_check}"
        except:
            return "❌ Heartbeat file not found."

    if verb == "stats":
        return run(["uptime"]) + "\n\n" + run(["free", "-h"])
    elif verb == "tail":
        svc = parts[1] if len(parts)>1 else "gate-web"
        return run(["docker", "compose", "-f", str(BASE_DIR/"docker-compose.yml"), "logs", "--tail=20", svc])
    elif verb == "ps":
        return run(["docker", "compose", "-f", str(BASE_DIR/"docker-compose.yml"), "ps"])
    elif verb == "updates":
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
                if not text or not text.startswith("/"): continue
                
                response = handle(text[1:], chat)
                tg_send(response, chat)
        except Exception:
            time.sleep(5)

if __name__ == "__main__": main()
