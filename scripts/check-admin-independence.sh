#!/usr/bin/env bash
# Fails if the admin console ever re-couples to sysadmin or to
# shared visual chrome. Same design, independent code — enforced.
set -euo pipefail
RED='\033'; GRN='\033'; YEL='\033'; NC='\033'
fail=0
warn=0

echo "🔒 Admin console independence check"
echo "───────────────────────────────────"

# 1. No imports from @/components/sysadmin/*
SYSADMIN=$(grep -rln "@/components/sysadmin" "src/app/(admin)" "src/components/admin" 2>/dev/null || true)
if [ -n "$SYSADMIN" ]; then
  echo -e "${RED}❌ Admin imports from @/components/sysadmin:${NC}"
  echo "$SYSADMIN" | sed 's/^/     /'
  fail=1
fi

# 2. No imports from @/components/shared/* EXCEPT the allowed infrastructure set
#    (auth, global singletons, UI primitives, and a few role-agnostic utilities).
#    ProfileMenuButton is deliberately shared: it is the single account/profile
#    button (avatar + appearance + sign-out) both consoles mount, so it stays in
#    shared rather than being copied per-role.
ALLOWED_SHARED="AuthGuard|DevContactStrip|PersonBadge|Board|NotificationCenter|FloatingBot|AnnouncementBanner|IconRail|Sidebar|RoleConsole|DynamicHeader|SafeAreaAppShell|NetworkStatusBanner|FloatingOrbs|AppLoadingScreen|ToastProvider|useToast|Modal|Button|Input|Select|Badge|Card|Tabs|Table|DataTable|Skeleton|ProfileMenuButton"
SHARED=$(grep -rhoE "@/components/shared/[A-Za-z]+" "src/app/(admin)" "src/components/admin" 2>/dev/null \
  | sed 's|@/components/shared/||' | sort -u \
  | grep -vE "^($ALLOWED_SHARED)$" || true)
if [ -n "$SHARED" ]; then
  echo -e "${RED}❌ Admin imports shared visual chrome (should use @/components/admin/shared/*):${NC}"
  echo "$SHARED" | sed 's/^/     /'
  fail=1
fi

# 3. Verify the admin-owned copies actually exist
for f in PageHeader WidgetBoundary EmptyState ConfirmDialog LoadingStates \
         ChartRenderer ChartTypeSwitcher ChartCard ContextPanel CountUp \
         GlassCard GlassInteractiveCard GlossyFloatingContainer; do
  if [ ! -f "src/components/admin/shared/$f.tsx" ]; then
    echo -e "${RED}❌ Missing admin-owned: src/components/admin/shared/$f.tsx${NC}"
    fail=1
  fi
done
for f in kit/sidebar/index.ts kit/viz/index.ts; do
  if [ ! -f "src/components/admin/$f" ]; then
    echo -e "${RED}❌ Missing admin-owned: src/components/admin/$f${NC}"
    fail=1
  fi
done

# 4. Warn if any admin domain references a sysadmin path in a comment
COMMENT_LEAK=$(grep -rn "sysadmin/domains" "src/components/admin/domains" 2>/dev/null || true)
if [ -n "$COMMENT_LEAK" ]; then
  echo -e "${YEL}⚠️  Admin domains reference 'sysadmin/domains' in comments:${NC}"
  echo "$COMMENT_LEAK" | head -5 | sed 's/^/     /'
  warn=$((warn + 1))
fi

echo "───────────────────────────────────"
if [ "$fail" -ne 0 ]; then
  echo -e "${RED}FAILED${NC} — admin console is not independent."
  exit 1
fi
if [ "$warn" -ne 0 ]; then
  echo -e "${YEL}PASSED with $warn warning(s)${NC}"
else
  echo -e "${GRN}✅ Admin console is fully independent${NC}"
fi
