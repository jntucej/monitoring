#!/usr/bin/env bash
set -euo pipefail
fail=0

# Every .spec.ts under tests/ must have at least one `test(` or `it(`
for f in tests/*.spec.ts; do
  [ -f "$f" ] || continue
  if ! grep -qE '\b(test|it)\s*\(' "$f"; then
    echo "❌ $f contains no test() calls"
    fail=1
  fi
done

# Every scripts/test-*.ts and scripts/test_*.ts must have a main() invocation
for f in scripts/test-*.ts scripts/test_*.ts scripts/verify-*.ts; do
  [ -f "$f" ] || continue
  if grep -qE 'function main\(' "$f" && ! grep -qE 'main\(\)\.catch|main\(\)\.then|^main\(\);' "$f"; then
    echo "❌ $f defines main() but never calls it"
    fail=1
  fi
done

# playwright.config.ts must export a config
if [ -f "playwright.config.ts" ] && ! grep -q "export default" playwright.config.ts; then
  echo "❌ playwright.config.ts does not export a config"
  fail=1
fi

# vitest.config.ts must export a config
for f in packages/*/vitest.config.ts; do
  [ -f "$f" ] || continue
  if ! grep -q "export default" "$f"; then
    echo "❌ $f does not export a config"
    fail=1
  fi
done

exit $fail
