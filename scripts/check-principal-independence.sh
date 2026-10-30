#!/usr/bin/env bash
# Fails if the principal console imports shared visual chrome that should come
# from src/components/principal/shared/. Same design as the admin / operator
# guards — independent code, enforced.
#
# Approver primitives (PermissionRow, PermissionList, etc. from
# @/components/approver/*) ARE explicitly allowed, because the principal page
# tree borrows from the approver widget set while keeping its own visual shell.
set -euo pipefail
RED='\033[31m'; GRN='\033[32m'; YEL='\033[33m'; NC='\033[0m'
fail=0
warn=0

echo "🔒 Principal console independence check"
echo "───────────────────────────────────────"

# 1. Check whether the principal-owned shared copies exist today.
#    The other principal agent is still "in flight" and may not have created
#    them yet — warn, don't hard-fail on their absence. Once the copies are in
#    place, this block becomes the real gate (without it, banning imports is
#    meaningless).
COPY_DIR="src/components/principal/shared"
if [ ! -d "$COPY_DIR" ]; then
  echo -e "${YEL}⚠️  Principal shared copy dir missing: $COPY_DIR (warn, not fail — independence not yet enforceable)${NC}"
  warn=$((warn + 1))
fi

for f in PrincipalLoading EmptyState ConfirmDialog StatusBadge NotificationCenter UserProfileTab PageHeader Sidebar RoleConsole ChangePasswordCard GlassThemeToggle DevContactStrip; do
  if [ ! -f "$COPY_DIR/$f.tsx" ] && [ ! -f "$COPY_DIR/$f/index.ts" ]; then
    echo -e "${YEL}⚠️  Missing principal-owned: $COPY_DIR/$f.tsx${NC}"
    warn=$((warn + 1))
  fi
done

# 2. Only run the import-scan when the copies dir is present. If copies are
#    still in flight, scanning imports would only surface noise from pages that
#    legitimately reference shared chrome until they've been migrated.
if [ -d "$COPY_DIR" ]; then
  # 2a. No imports from @/components/shared/LoadingStates, EmptyState, etc.
  BANNED='LoadingStates|EmptyState|ConfirmDialog|StatusBadge|NotificationCenter|UserProfileTab|PageHeader|Sidebar|ChangePasswordCard|GlassThemeToggle'
  VIOLATIONS=$(grep -rln "@/components/shared/\($BANNED\)" \
    "src/app/(approver)/principal" \
    "src/components/principal" 2>/dev/null || true)
  if [ -n "$VIOLATIONS" ]; then
    echo -e "${RED}❌ Principal imports banned shared chrome:${NC}"
    echo "$VIOLATIONS" | sed 's/^/     /'
    fail=1
  fi

  # 2b. No imports from @/components/shared/ for the individual module names,
  #     so the report is actionable even when the parens regex isn't supported.
  SHARED_EXPORTS=$(grep -rhoE "@/components/shared/($BANNED)" \
    "src/app/(approver)/principal" \
    "src/components/principal" 2>/dev/null \
    | sed 's|@/components/shared/||' | sort -u || true)
  if [ -n "$SHARED_EXPORTS" ]; then
    echo -e "${RED}❌ Principal imports these banned shared modules:${NC}"
    echo "$SHARED_EXPORTS" | sed 's/^/     /'
    fail=1
  fi

  # 2c. Allowlisted: principal may still pull infra that isn't "visual chrome"
  #     (AuthGuard, WidgetBoundary, useApiResource hooks, ui primitives from
  #     @/components/ui/...). Those paths live outside the banned list and are
  #     silently ignored here — same philosophy as the admin allowed-shared set.
fi

echo "───────────────────────────────────────"
if [ "$fail" -ne 0 ]; then
  echo -e "${RED}FAILED${NC} — principal console imports shared chrome."
  exit 1
fi
if [ "$warn" -ne 0 ]; then
  echo -e "${YEL}PASSED with $warn warning(s)${NC}"
else
  echo -e "${GRN}✅ Principal console is fully independent${NC}"
fi
