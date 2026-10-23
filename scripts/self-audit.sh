#!/usr/bin/env bash
# scripts/self-audit.sh — local static audit for the bug classes found in review.
# Usage:  bash scripts/self-audit.sh [--json] [path]
# Exit:   0 = clean, 1 = findings, 2 = bad invocation
set -uo pipefail

JSON=0
ROOT="${2:-src}"
[ "${1:-}" = "--json" ] && JSON=1 && ROOT="${2:-src}"

command -v rg >/dev/null 2>&1 || { echo "install ripgrep (rg) first" >&2; exit 2; }
[ -d "$ROOT" ] || { echo "no such directory: $ROOT" >&2; exit 2; }

FINDINGS=0
declare -a RESULTS=()

record() {
  local rule="$1" severity="$2" count="$3" sample="$4"
  FINDINGS=$((FINDINGS + 1))
  if [ "$JSON" -eq 1 ]; then
    RESULTS+=("$(printf '{"rule":"%s","severity":"%s","count":%d,"sample":"%s"}' \
      "$rule" "$severity" "$count" "${sample//\"/\\\"}")")
  else
    printf "%-4s %-6s  n=%-3d  %s\n" "$rule" "$severity" "$count" "$sample"
  fi
}

# ── R1: workflowType vs workflow_type in query strings ───────────────────────
hits=$(rg -n '(\?|&)workflowType=' "$ROOT" --glob '*.tsx' --glob '*.ts' || true)
[ -n "$hits" ] && record "R1" "high" "$(echo "$hits" | wc -l)" \
  "query string uses workflowType; must be workflow_type: $(echo "$hits" | head -1 | cut -d: -f1)"

# ── R2: alert() / confirm() in page files ────────────────────────────────────
hits=$(rg -nE '\b(alert|confirm)\(' "$ROOT" --glob 'page.tsx' || true)
[ -n "$hits" ] && record "R2" "med" "$(echo "$hits" | wc -l)" \
  "alert()/confirm() in page: $(echo "$hits" | head -1)"

# ── R3: literal type="button" rendered as text inside a JSX child ────────────
hits=$(rg -n --multiline --multiline-dotall '>\s*\n\s*type="button"' "$ROOT" --glob '*.tsx' || true)
[ -n "$hits" ] && record "R3" "low" "$(echo "$hits" | wc -l)" \
  "literal type=\"button\" text node: $(echo "$hits" | head -1)"

# ── R4: empty JSX expression { } ─────────────────────────────────────────────
hits=$(rg -n --multiline --multiline-dotall '\{\s*\n\s*\}' "$ROOT" --glob '*.tsx' || true)
[ -n "$hits" ] && record "R4" "low" "$(echo "$hits" | wc -l)" \
  "empty JSX expression { }: $(echo "$hits" | head -1)"

# ── R5: unconditional <PageLoading /> at page root ───────────────────────────
hits=$(rg -n '^\s*<PageLoading\s*/>' "$ROOT" --glob 'page.tsx' || true)
[ -n "$hits" ] && record "R5" "med" "$(echo "$hits" | wc -l)" \
  "unconditional PageLoading: $(echo "$hits" | head -1)"

# ── R6: 1s or sub-5s polling (intervalMs) ────────────────────────────────────
hits=$(rg -n 'intervalMs\s*:\s*([0-4]\d{3}|\d{1,4})\b' "$ROOT" --glob '*.tsx' --glob '*.ts' \
  | rg -v '5_?000|15000|30000|60000|120000|300000' || true)
[ -n "$hits" ] && record "R6" "med" "$(echo "$hits" | wc -l)" \
  "polling faster than 5s: $(echo "$hits" | head -1)"

# ── R7: fetch() without getAuthHeaders / credentials / Authorization ────────
hits=$(rg -n '\bfetch\(' "$ROOT/app" --glob '*.tsx' --glob '*.ts' || true)
bad=""
while IFS= read -r line; do
  [ -z "$line" ] && continue
  file=$(echo "$line" | cut -d: -f1)
  ln=$(echo "$line" | cut -d: -f2)
  ctx=$(sed -n "$((ln))p;$((ln+1))p;$((ln+2))p;$((ln+3))p" "$file")
  if ! echo "$ctx" | grep -qE 'getAuthHeaders|Authorization|credentials\s*:|useApi'; then
    bad="${bad}${file}:${ln} "
  fi
done <<< "$hits"
[ -n "$bad" ] && record "R7" "high" "$(echo "$bad" | wc -w)" \
  "fetch without auth: $(echo "$bad" | awk '{print $1}')"

# ── R8: useEffect deps containing an object ref likely to churn ─────────────
hits=$(rg -n '\},\s*\[[^\]]*\b(api|store|router|searchParams)\b[^\]]*\]\)' "$ROOT" --glob '*.tsx' --glob '*.ts' || true)
[ -n "$hits" ] && record "R8" "low" "$(echo "$hits" | wc -l)" \
  "useEffect deps include unstable object: $(echo "$hits" | head -1)"

# ── R9: fake onSubmit (async body without await/fetch/setState) ─────────────
files=$(rg -l 'const handleSubmit = async' "$ROOT" --glob '*.tsx' || true)
bad=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  if ! rg -A10 'const handleSubmit = async' "$f" | grep -qE '\bawait\b'; then
    bad="${bad}${f} "
  fi
done <<< "$files"
[ -n "$bad" ] && record "R9" "med" "$(echo "$bad" | wc -w)" \
  "handleSubmit has no await (likely fake): $(echo "$bad" | awk '{print $1}')"

# ── R10: hardcoded identity fallbacks ───────────────────────────────────────
hits=$(rg -n '(\?\?|fallback|default)[^"`]*["'\''](pa-1|demo|test-|user-1)["'\'']' \
  "$ROOT" --glob '*.tsx' --glob '*.ts' || true)
[ -n "$hits" ] && record "R10" "high" "$(echo "$hits" | wc -l)" \
  "hardcoded identity fallback: $(echo "$hits" | head -1)"

# ── R11: TODO comments in page.tsx ──────────────────────────────────────────
hits=$(rg -n '\bTODO\b|\bFIXME\b' "$ROOT" --glob 'page.tsx' || true)
[ -n "$hits" ] && record "R11" "info" "$(echo "$hits" | wc -l)" \
  "TODO/FIXME in page: $(echo "$hits" | head -1)"

# ── R12: useApiResource<T> consumers that don't unwrap .data ────────────────
files=$(rg -l 'useApiResource<' "$ROOT" --glob '*.tsx' || true)
bad=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  if rg -q 'useApiResource<' "$f" \
     && ! rg -q 'unwrap|const .* = .*\.data \?\? ' "$f" \
     && rg -q '(data|Res\.data)\??\.\w+' "$f"; then
    bad="${bad}${f} "
  fi
done <<< "$files"
[ -n "$bad" ] && record "R12" "high" "$(echo "$bad" | wc -w)" \
  "possible envelope mismatch: $(echo "$bad" | awk '{print $1}')"

# ── Summary ─────────────────────────────────────────────────────────────────
if [ "$JSON" -eq 1 ]; then
  printf '{"findings":%d,"results":[%s]}\n' "$FINDINGS" "$(IFS=,; echo "${RESULTS[*]}")"
else
  echo
  if [ "$FINDINGS" -eq 0 ]; then
    echo "✓ no findings"
  else
    echo "✗ $FINDINGS rule(s) fired"
  fi
fi
exit "$([ "$FINDINGS" -eq 0 ] && echo 0 || echo 1)"
