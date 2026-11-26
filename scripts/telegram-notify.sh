#!/bin/sh
# Send Telegram notification for server startup, shutdown, or health alerts
MESSAGE="${1:-Gate Monitor notification}"
TOKEN="${TELEGRAM_BOT_TOKEN:-}"
CHAT_ID="${TELEGRAM_CHAT_ID:-}"

if [ -z "$TOKEN" ] || [ -z "$CHAT_ID" ]; then
  # Gracefully skip notification if not configured in environment
  exit 0
fi

export TOKEN CHAT_ID MESSAGE
exec node -e '
const token = process.env.TOKEN;
const chatId = process.env.CHAT_ID;
const text = process.env.MESSAGE;
const url = `https://api.telegram.org/bot${token}/sendMessage`;
const body = new URLSearchParams({ chat_id: chatId, text }).toString();
fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body,
  signal: AbortSignal.timeout(5000),
}).catch((err) => {
  console.error("Failed to send telegram notification:", err?.message || err);
});
'
