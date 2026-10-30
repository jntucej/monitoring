#!/bin/bash
# Send Telegram notification for server startup, shutdown, or health alerts
MESSAGE="${1:-Gate Monitor notification}"
TOKEN="${TELEGRAM_BOT_TOKEN:-}"
CHAT_ID="${TELEGRAM_CHAT_ID:-}"

if [ -z "$TOKEN" ] || [ -z "$CHAT_ID" ]; then
  # Gracefully skip notification if not configured in environment
  exit 0
fi

python3 -c "
import urllib.request, urllib.parse, sys
token = '$TOKEN'
chat_id = '$CHAT_ID'
text = sys.argv[1]
url = f'https://api.telegram.org/bot{token}/sendMessage'
data = urllib.parse.urlencode({'chat_id': chat_id, 'text': text}).encode('utf-8')
try:
    urllib.request.urlopen(url, data=data, timeout=5)
except Exception as e:
    print('Failed to send telegram notification:', e, file=sys.stderr)
" "$MESSAGE"
