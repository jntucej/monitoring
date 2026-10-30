#!/usr/bin/env bash
set -euo pipefail
# check-tests-nonempty.sh - Verify test files contain actual tests
# Ensures test coverage scripts are not empty stubs

ROOT_DIR="${1:-.}"
fail=0

echo "================================================================="
echo "🧪 Checking test files for non-empty content..."
echo "================================================================="

shopt -s globstar nullglob

check_file() {
  local f="$1"
  # Skip empty fixtures/mocks
  [[ "$f" == *"/fixtures/"* || "$f" == *"/mocks/"* ]] && return 0
  if ! grep -qE '\b(test|it|describe|spec)\s*\(' "$f" 2>/dev/null; then
    echo "❌ $f contains no test/it/describe/spec calls"
    fail=1
  fi
}

echo "Checking playwright tests..."
for f in tests/**/*.spec.ts; do
  check_file "$f"
done

echo "Checking unit tests..."
for f in src/**/*.test.ts src/**/*.test.tsx; do
  check_file "$f"
done

echo "Checking integration tests..."
for f in src/**/integration/**/*.test.ts src/**/integration/*.spec.ts; do
  check_file "$f"
done

if [ "$fail" -eq 0 ]; then
  echo "✅ All test files contain valid test definitions."
else
  echo "❌ Some test files appear to be empty or invalid."
  exit 1
fi
