#!/usr/bin/env bash
# Fails if the operator console ever re-couples to shared visual chrome.
# Same design, independent code — enforced.
set -euo pipefail
cd "$(dirname "$0")/.."

RED='\033'; GRN='\033'; YEL='\033'; NC='\033'
fail=0
warn=0

echo "🔒 Operator console independence check"
echo "───────────────────────────────────"

# 1. No imports from @/components/shared/* EXCEPT the allowed infrastructure set
#    (auth, global singletons, UI primitives, and a few role-agnostic utilities).
#    AuthGuard + ErrorBoundary are the only ones strictly required.
#    DevContactStrip is a dev-only strip that stays shared across all roles.
#    RoleConsole is the shell mount used by operator's worker layout.
#    QuickActions is a shared quick-actions utility.
#    CountUp + GlossyFloatingContainer are visual primitives used by operator stats.
#    PersonBadge is a shared person display utility.
ALLOWED_SHARED="AuthGuard|ErrorBoundary|DevContactStrip|RoleConsole|QuickActions|CountUp|GlossyFloatingContainer|PersonBadge"

# Only check actual import statements in operator source files (not comments/docstrings).
# The anchored pattern `^[[:space:]]*import` ensures we only match lines that begin an import.
SHARED=$(grep -rhE '^[[:space:]]*import[^\n]*from [\"'"'"']@/components/shared/' 'src/app/(operator)' "src/components/operator" 2>/dev/null \
  | grep -oE '@/components/shared/[A-Za-z]+' \
  | sed 's|@/components/shared/||' | sort -u \
  | grep -vE "^($ALLOWED_SHARED)$" || true)
if [ -n "$SHARED" ]; then
  echo -e "${RED}❌ Operator imports shared visual chrome (should use @/components/operator/shared/*):${NC}"
  echo "$SHARED" | sed 's/^/     /'
  fail=1
fi

# 2. Verify the operator-owned copies actually exist
for f in OperatorWidgetBoundary OperatorLoading OperatorEmptyState OperatorConfirm \
         OperatorStatusBadge OperatorNotifications OperatorThemeToggle; do
  if [ ! -f "src/components/operator/shared/$f.tsx" ]; then
    echo -e "${RED}❌ Missing operator-owned: src/components/operator/shared/$f.tsx${NC}"
    fail=1
  fi
done
for f in OperatorProfile OperatorChangePassword; do
  if [ ! -f "src/components/operator/profile/$f.tsx" ]; then
    echo -e "${RED}❌ Missing operator-owned: src/components/operator/profile/$f.tsx${NC}"
    fail=1
  fi
done

echo "───────────────────────────────────"
if [ "$fail" -ne 0 ]; then
  echo -e "${RED}FAILED${NC} — operator console is not independent."
  exit 1
fi
if [ "$warn" -ne 0 ]; then
  echo -e "${YEL}PASSED with $warn warning(s)${NC}"
else
  echo -e "${GRN}✅ Operator console is fully independent${NC}"
fi
