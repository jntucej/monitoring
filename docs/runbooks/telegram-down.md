# Runbook: `telegram_down`

**Alert:** Telegram sendMessage failing 3+ times in 5 min
**Severity:** SEV-3 (alerts are generated but not delivered)
**Runbook URL:** /sysadmin/runbooks#telegram-down

## What this means
Alerts still fire and are written to the `alerts` and `status_updates`
tables — the dashboard is the fallback. What's broken is the push channel.

## Fallback chain (already in place)
1. Telegram (primary) →
2. Email via Brevo →
3. SMS via Twilio →
4. `alerts` table + dashboard banner (always available)

## Manual steps
```bash
# 1. Check the bot token
docker exec gate_worker env | grep TELEGRAM_BOT_TOKEN

# 2. Test the API directly
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe" | jq

# 3. If the token was revoked, re-issue it from @BotFather and update:
#    Update the .env / docker-compose.yml env block, then:
docker compose -f /opt/monitoring/compose/docker-compose.yml up -d --force-recreate worker

# 4. Check the worker log for the specific error
docker logs gate_worker --tail 50 | grep -i telegram
```

## Escalation
- 15 min: sysadmin
- 1 hour: principal (if no alerts have been delivered for > 1h)
