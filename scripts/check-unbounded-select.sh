#!/usr/bin/env bash
# check-unbounded-select.sh — flag SELECTs on high-growth tables with no LIMIT.
#
# After six months of production, users/audit_logs/movement_logs/permissions/
# mess_tokens/complaints/attendance_records will hold millions of rows. Any
# list endpoint without a LIMIT or aggregate will degrade linearly. This gate
# catches that at commit time, not at month-six latency alert time.
#
# WARN-only; promote to FAIL once every route is paginated.
set -uo pipefail

TABLES='users|audit_logs|movement_logs|permissions|notifications|mess_tokens|complaints|attendance_records|sessions|enrollment_codes'
warn=0
while IFS= read -r f; do
  if grep -qE "SELECT[\s\S]*FROM (public\.)?($TABLES)" "$f" 2>/dev/null || grep -qE "FROM (public\.)?($TABLES)" "$f"; then
    # Skip files that only do DELETE/UPDATE, single-row PK lookups, or bounded/aggregate queries
    if grep -qE "SELECT " "$f" \
       && ! grep -qiE 'LIMIT |COUNT\(|MAX\(|MIN\(|GROUP BY|aggregate|WHERE ([a-z]+\.)?id = \$1|WHERE ([a-z]+\.)?id = ANY\(' "$f"; then
      echo "WARN: unbounded SELECT on high-growth table in $f"
      warn=$((warn + 1))
    fi
  fi
done < <(find src/app/api src/server src/lib -name '*.ts' 2>/dev/null | sort)

echo "Total unbounded list queries: $warn"
[ "$warn" -eq 0 ] && echo "PASS: all list queries bounded" || echo "WARN: $warn unbounded queries (see above)"
exit 0
