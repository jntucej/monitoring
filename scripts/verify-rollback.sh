#!/usr/bin/env bash
set -euo pipefail

TARGET_REF="${1:-HEAD~1}"

echo "================================================================="
echo "🛡️ PRE-ROLLBACK SAFETY AUDIT (${TARGET_REF})"
echo "================================================================="

CURRENT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
TARGET_SHA=$(git rev-parse "${TARGET_REF}" 2>/dev/null || echo "unknown")

echo "Current Git SHA: ${CURRENT_SHA}"
echo "Target Rollback SHA: ${TARGET_SHA}"

echo -e "\n==> 1. Database Migrations Diff:"
MIGRATION_DIFF=$(git diff --name-only "${TARGET_REF}" HEAD -- database/migrations/ 2>/dev/null || true)
if [ -n "${MIGRATION_DIFF}" ]; then
  echo "⚠️  WARNING: Database migrations exist between ${TARGET_REF} and HEAD:"
  echo "${MIGRATION_DIFF}"
else
  echo "✅ No database migration files touched between ${TARGET_REF} and HEAD."
fi

echo -e "\n==> 2. Environment Variables Diff:"
ENV_DIFF=$(git diff "${TARGET_REF}" HEAD -- .env.example 2>/dev/null || true)
if [ -n "${ENV_DIFF}" ]; then
  echo "⚠️  Changes detected in environment variable templates:"
  echo "${ENV_DIFF}"
else
  echo "✅ Environment templates are consistent."
fi

echo -e "\n================================================================="
echo "✅ ROLLBACK AUDIT COMPLETE"
echo "================================================================="
