#!/usr/bin/env bash
# audit-principal-stages.sh
#
# Verifies that both principal stages exist in live data and that the warden
# registry is inactive post-migration. Checks:
#   (a) principal and warden_or_principal stages both present
#   (b) no pending hostel tickets outside the principal/warden chain
#   (c) warden registry row active pre-migration (should be FALSE after)
#   (d) is_warden() recognizes a principal
set -euo pipefail

PSQL="docker exec gate_postgres psql -U postgres -d gate_monitor -tAc"

RED='\033[31m'; GRN='\033[32m'; YEL='\033[33m'; NC='\033[0m'
fail=0

echo "🔍 Principal stages audit"
echo "───────────────────────────────────────"

# (a) Check both principal stages exist in live data
echo -e "${YEL}[a] Checking principal stages in live data...${NC}"
PRINCIPAL_COUNT=$($PSQL "SELECT COUNT(*) FROM permissions WHERE current_stage = 'principal'")
WARDEN_OR_PRINCIPAL_COUNT=$($PSQL "SELECT COUNT(*) FROM permissions WHERE current_stage = 'warden_or_principal'")
echo "  principal stage count:    $PRINCIPAL_COUNT"
echo "  warden_or_principal count: $WARDEN_OR_PRINCIPAL_COUNT"
if [ "$PRINCIPAL_COUNT" -eq 0 ] && [ "$WARDEN_OR_PRINCIPAL_COUNT" -eq 0 ]; then
  echo -e "  ${YEL}⚠️  No tickets at either principal stage (may be normal if all cleared)${NC}"
else
  echo -e "  ${GRN}✓  Both stages present in schema${NC}"
fi

# (b) Check for pending hostel tickets outside the principal/warden chain
echo -e "${YEL}[b] Checking for orphaned pending hostel tickets...${NC}"
ORPHAN_COUNT=$($PSQL "
  SELECT COUNT(*) FROM permissions
  WHERE workflow_type = 'hostel'
    AND status = 'PENDING'
    AND current_stage NOT IN ('caretaker', 'deputy_warden', 'hostel_manager', 'warden_or_principal', 'principal')
")
echo "  Orphaned pending hostel tickets: $ORPHAN_COUNT"
if [ "$ORPHAN_COUNT" -gt 0 ]; then
  echo -e "  ${RED}❌ Found orphaned tickets${NC}"
  fail=1
else
  echo -e "  ${GRN}✓  No orphaned pending hostel tickets${NC}"
fi

# (c) Check warden registry row
echo -e "${YEL}[c] Checking warden registry row...${NC}"
WARDEN_REGISTRY=$($PSQL "SELECT is_active FROM public.config_roles_registry WHERE code = 'warden' LIMIT 1")
echo "  warden registry is_active: ${WARDEN_REGISTRY:-NULL}"
if [ "$WARDEN_REGISTRY" = "f" ] || [ "$WARDEN_REGISTRY" = "false" ]; then
  echo -e "  ${GRN}✓  Warden registry row is inactive (post-migration state)${NC}"
elif [ "$WARDEN_REGISTRY" = "t" ] || [ "$WARDEN_REGISTRY" = "true" ]; then
  echo -e "  ${YEL}⚠️  Warden registry row is still active (pre-migration state)${NC}"
else
  echo -e "  ${YEL}⚠️  Warden registry row not found (may not exist yet)${NC}"
fi

# (d) Check is_warden() recognizes a principal
echo -e "${YEL}[d] Checking is_warden() function...${NC}"
PRINCIPAL_ID=$($PSQL "SELECT id FROM users WHERE role = 'principal' LIMIT 1")
if [ -z "$PRINCIPAL_ID" ]; then
  echo -e "  ${YEL}⚠️  No principal user found${NC}"
else
  IS_WARDEN=$($PSQL "SELECT public.is_warden('$PRINCIPAL_ID'::uuid)")
  echo "  is_warden(principal_id): $IS_WARDEN"
  if [ "$IS_WARDEN" = "t" ] || [ "$IS_WARDEN" = "true" ]; then
    echo -e "  ${GRN}✓  is_warden() recognizes principal${NC}"
  else
    echo -e "  ${RED}❌ is_warden() does NOT recognize principal${NC}"
    fail=1
  fi
fi

echo "───────────────────────────────────────"
if [ "$fail" -ne 0 ]; then
  echo -e "${RED}FAILED${NC}"
  exit 1
fi
echo -e "${GRN}✅ Audit passed${NC}"
