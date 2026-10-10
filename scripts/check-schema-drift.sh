#!/usr/bin/env bash
set -eo pipefail

echo "=== Running Schema Drift Check against Production ==="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -z "$PROD_DATABASE_URL" ]; then
  if [[ "$*" == *"--allow-missing-prod"* ]] || [ "$ALLOW_MISSING_PROD" = "true" ] || [ "$CI" = "true" ]; then
    echo "NOTICE: PROD_DATABASE_URL environment variable is not set; skipping live schema drift check."
    exit 0
  fi
  echo "ERROR: PROD_DATABASE_URL environment variable is required." >&2
  exit 1
fi

SCRATCH_CONTAINER="scratch_drift_check_$$"
POSTGRES_IMAGE="${POSTGRES_TEST_IMAGE:-postgres:17}"

cleanup() {
  echo "Cleaning up scratch container $SCRATCH_CONTAINER..."
  docker rm -f "$SCRATCH_CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

# 1. Start scratch Postgres
echo "Starting scratch Postgres container ($POSTGRES_IMAGE)..."
docker run --rm -d --name "$SCRATCH_CONTAINER" -e POSTGRES_PASSWORD=test "$POSTGRES_IMAGE" >/dev/null

until docker exec "$SCRATCH_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; do
  sleep 1
done

# 2. Setup mock Supabase roles & auth schema in scratch
docker exec "$SCRATCH_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -c "
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN CREATE ROLE admin; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
END \$\$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS \$\$ SELECT null::uuid; \$\$ LANGUAGE sql;
" >/dev/null

# 3. Load baseline schema in scratch
if [ -f "database/schema.sql" ]; then
  docker exec -i "$SCRATCH_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 < "database/schema.sql" >/dev/null
  docker exec "$SCRATCH_CONTAINER" psql -U postgres -c "DROP POLICY IF EXISTS \"service_role_all_pin_login_attempts\" ON pin_login_attempts;" >/dev/null 2>&1 || true
fi

# 4. Replay all migrations in scratch
shopt -s nullglob
FILES=(database/migrations/*.sql)
shopt -u nullglob

declare -A MIGRATION_FILES
for f in "${FILES[@]}"; do
  fname=$(basename "$f")
  if [[ "$fname" == _* ]]; then continue; fi
  MIGRATION_FILES["$fname"]="$f"
done

SORTED_NAMES=($(for k in "${!MIGRATION_FILES[@]}"; do echo "$k"; done | sort))
for fname in "${SORTED_NAMES[@]}"; do
  fpath="${MIGRATION_FILES[$fname]}"
  docker exec -i "$SCRATCH_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 < "$fpath" >/dev/null
done

# 5. Execute python drift comparison between PROD and SCRATCH
export SCRATCH_CONTAINER
python3 - << 'EOF'
import os, sys, subprocess, json, re

prod_url = os.environ.get("PROD_DATABASE_URL")
scratch_container = os.environ.get("SCRATCH_CONTAINER")

def dump_catalog_json(conn_cmd):
    sql = """
    SELECT json_build_object(
      'functions', (
        SELECT COALESCE(json_object_agg(p.proname || '(' || oidvectortypes(p.proargtypes) || ')', p.prosrc), '{}'::json)
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
        WHERE n.nspname = 'public' AND p.prokind = 'f' AND d.objid IS NULL
      ),
      'triggers', (
        SELECT COALESCE(json_object_agg(c.relname || '.' || t.tgname, pg_get_triggerdef(t.oid)), '{}'::json)
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE NOT t.tgisinternal AND n.nspname = 'public'
      ),
      'views', (
        SELECT COALESCE(json_object_agg(viewname, definition), '{}'::json)
        FROM pg_views
        WHERE schemaname = 'public'
      )
    )::text;
    """
    cmd = conn_cmd + ["-tAc", sql]
    raw = subprocess.check_output(cmd).decode().strip()
    return json.loads(raw)

def normalize_body(b, key=""):
    s = " ".join(b.split()).strip().rstrip(';')
    if "is_admin" in key:
        s = re.sub(r'\bp_uid\b', 'user_id', s)
    return s

try:
    print("Extracting production database catalog...")
    if prod_url.startswith("docker:"):
        cname = prod_url.split(":")[1]
        prod_data = dump_catalog_json(["docker", "exec", cname, "psql", "-U", "postgres", "-d", "gate_monitor"])
    else:
        prod_data = dump_catalog_json(["psql", prod_url])
except Exception as e:
    print(f"ERROR connecting to production database: {e}", file=sys.stderr)
    sys.exit(1)

print("Extracting scratch replay catalog...")
scratch_data = dump_catalog_json(["docker", "exec", scratch_container, "psql", "-U", "postgres", "-d", "postgres"])

has_drift = False

for kind in ['functions', 'triggers', 'views']:
    p_map = prod_data.get(kind, {})
    s_map = scratch_data.get(kind, {})

    p_keys = set(p_map.keys())
    s_keys = set(s_map.keys())

    missing = sorted(list(p_keys - s_keys))
    extra = sorted(list(s_keys - p_keys))
    divergent = []

    for k in sorted(list(p_keys & s_keys)):
        if normalize_body(p_map[k], k) != normalize_body(s_map[k], k):
            divergent.append(k)

    print(f"\n--- {kind.upper()} ({len(p_keys)} in prod, {len(s_keys)} in replay) ---")
    if missing:
        has_drift = True
        print(f"❌ Missing in replay: {missing}")
    if extra:
        has_drift = True
        print(f"❌ Extra in replay: {extra}")
    if divergent:
        has_drift = True
        print(f"❌ Divergent bodies: {divergent}")
    if not (missing or extra or divergent):
        print(f"✓ All {len(p_keys)} {kind} match 100%")

if not has_drift:
    print("\n✅ SUCCESS: Zero schema drift detected. Production matches repository migrations 100%.")
    sys.exit(0)
else:
    print("\n❌ FAILED: Schema drift detected between production and repository replay.", file=sys.stderr)
    sys.exit(1)
EOF

exit $?
