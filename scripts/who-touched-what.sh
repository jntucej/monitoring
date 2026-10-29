#!/bin/bash
# who-touched-what.sh — Forensic helper for audit_logs & api_metrics
USER_QUERY="${1:-}"
if [ -z "$USER_QUERY" ]; then
  echo "Usage: $0 <user-id | unique-id | email>" >&2
  exit 1
fi

OUT="/tmp/who-touched-what-$USER_QUERY.csv"
echo "Extracting audit and API activity for $USER_QUERY..."

docker exec gate_postgres psql -U postgres -d gate_monitor -c "\copy (
  SELECT timestamp, action, ip_address, details 
  FROM audit_logs 
  WHERE user_id::text = '$USER_QUERY' 
     OR user_id IN (SELECT id FROM users WHERE unique_id ILIKE '%$USER_QUERY%' OR email ILIKE '%$USER_QUERY%')
  ORDER BY timestamp DESC LIMIT 1000
) TO STDOUT WITH CSV HEADER" > "$OUT"

echo "Audit log activity saved to $OUT"
head -n 20 "$OUT"
