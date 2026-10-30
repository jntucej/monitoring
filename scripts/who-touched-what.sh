#!/usr/bin/env bash
set -euo pipefail
USER_QUERY="${1:-}"
OUT="${2:-who-touched-what.csv}"
if [ -z "$USER_QUERY" ]; then
  echo "Usage: $0 <user_id_or_unique_id> [output_csv]"
  exit 1
fi
docker exec -e Q="$USER_QUERY" gate_postgres psql -U postgres -d gate_monitor -v q="$USER_QUERY" -c "\copy (
  SELECT id, action, user_id, user_name, user_role, details, ip_address, timestamp 
  FROM audit_logs 
  WHERE user_id::text = :'q'
     OR user_id IN (SELECT id FROM users WHERE unique_id ILIKE '%' || :'q' || '%' OR email ILIKE '%' || :'q' || '%')
) TO STDOUT WITH CSV HEADER" > "$OUT"
echo "Done. Exported to $OUT"
