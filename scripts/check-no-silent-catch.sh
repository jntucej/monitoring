#!/usr/bin/env bash
# check-no-silent-catch.sh — flag catch blocks that neither log nor audit.
#
# A catch that does nothing (not even a comment explaining why) is how the
# mess auto-revoke regression was missed: the failure was silent by accident,
# not by design. Every silent catch needs an explicit // eslint-disable-next-line
# no-silent-catch comment or a log/audit call in the same block.
#
# This is a WARN-only gate initially; promote to FAIL once the list is clean.
set -uo pipefail

warn=0
while IFS= read -r match; do
  file=$(echo "$match" | cut -d: -f1)
  line=$(echo "$match" | cut -d: -f2)
  # Grab the catch block body (up to 8 lines)
  body=$(sed -n "${line},$((line + 8))p" "$file")
  if ! echo "$body" | grep -qE 'log\(|console\.(error|warn)|addAudit|auditWrite|eslint-disable-next-line no-silent-catch|// silent|// ignore|// expected'; then
    echo "WARN: silent catch at $file:$line"
    warn=$((warn + 1))
  fi
done < <(grep -rEn 'catch\s*\(\)|catch\s*\{?' src --include='*.ts' --include='*.tsx' 2>/dev/null | grep -v 'catch (e' | grep -v 'catch (err' | head -300)

echo "Total silent catches (no log/audit): $warn"
[ "$warn" -eq 0 ] && echo "PASS: no silent catches" || echo "WARN: $warn silent catches found (see above)"
# Currently warn-only; change to exit 1 once the list is empty.
exit 0
