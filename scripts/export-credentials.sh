#!/bin/bash
# Master Credentials Export — dumps every credential into one readable file
set -euo pipefail

OUTPUT_DIR="/opt/monitoring/credentials"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$OUTPUT_DIR"

FILE="$OUTPUT_DIR/credentials-$TIMESTAMP.md"

{
echo "# Gate Monitor — Master Credentials & Roles"
echo ""
echo "**Generated:** $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

echo "## 🔑 Configuration Secrets"
echo '```'
echo "POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:+[SET - REDACTED]}"
echo "REDIS_PASSWORD: \${REDIS_PASSWORD:+[SET - REDACTED]}"
echo "JWT_SECRET: \${JWT_SECRET:+[SET - REDACTED]}"
echo "AUTH_SECRET: \${AUTH_SECRET:+[SET - REDACTED]}"
echo "MOBILE_TOKEN_SECRET: \${MOBILE_TOKEN_SECRET:+[SET - REDACTED]}"
echo "MFA_ENROLL_SECRET: \${MFA_ENROLL_SECRET:+[SET - REDACTED]}"
echo "SUPABASE_SERVICE_ROLE_KEY: \${SUPABASE_SERVICE_ROLE_KEY:+[SET - REDACTED]}"
echo '```'
echo ""

echo "## 👤 Users Table"
echo ""
echo "| unique_id | name | role | email | status | has_password | has_pin | 2FA |"
echo "|-----------|------|------|-------|--------|-------------|---------|-----|"
if docker ps --format '{{.Names}}' | grep -q "^gate_postgres$"; then
    docker exec gate_postgres psql -U postgres -d gate_monitor \
        -tAc "SELECT unique_id || '|' || name || '|' || role || '|' || email || '|' || status || '|' || CASE WHEN password_hash IS NOT NULL THEN 'YES' ELSE '---' END || '|' || CASE WHEN initial_pin_hash IS NOT NULL THEN 'YES' ELSE '---' END || '|' || CASE WHEN two_factor_enabled THEN 'YES' ELSE 'NO' END FROM users ORDER BY role, name;" \
        2>/dev/null | while IFS='|' read uid name role email status pw pin twofa; do
        echo "| $uid | $name | $role | $email | $status | $pw | $pin | $twofa |"
    done
else
    echo "| — | DB not running |"
fi
echo ""

echo "## 🎯 Default PIN Seed"
echo ""
echo "If seed scripts were run, the master PIN is configured in environment:"
echo "\`SEED_DEFAULT_PIN\`"
echo ""
echo "Seed script references:"
echo "- \`seed-roles.js\`: uses SEED_DEFAULT_PIN env var"
echo ""

echo "## 🛡️ Database Roles"
echo ""
echo "| Role | Type | Can Login | Notes |"
echo "|------|------|-----------|-------|"
echo "| postgres | superuser | yes | Native PG superuser |"
echo "| supabase_admin | superuser | yes | Supabase compatibility |"
echo "| service_role | basic | yes | For RLS policies |"
echo "| authenticated | basic | yes | Authenticated users |"
echo "| anon | basic | yes | Anonymous requests |"
echo "| admin | basic | yes | Admin RLS policy role |"
echo "| gate_app | basic | yes | App-specific role |"
echo ""

echo "## 📦 Backup Location"
echo ""
echo "All backups stored at: \`/opt/monitoring/backups/daily/\`"
echo "Latest backup: $(ls -t /opt/monitoring/backups/daily/gate-db-*.sql.gz 2>/dev/null | head -1 | xargs ls -lh 2>/dev/null | awk '{print $5, $9}')"
echo ""

echo "## 🔧 Recovery Commands"
echo ""
echo '\`\`\`bash'
echo "# Restore from backup:"
echo "bash /opt/monitoring/scripts/quick-recover.sh"
echo ""
echo "# Full system restart:"
echo "systemctl restart gate-stack"
echo ""
echo "# Check health:"
echo "curl -s http://localhost:80/api/health"
echo '\`\`\`'
} > "$FILE"

chmod 600 "$FILE"
echo "Credentials exported to: $FILE"
echo "Run 'quick-recover.sh' to restore from latest backup."
