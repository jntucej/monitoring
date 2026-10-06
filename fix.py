import sys

p = sys.argv[1] if len(sys.argv) > 1 else 'supabase/migrations/20260916000000_security_rls_and_function_hardening.sql'
with open(p, encoding='utf-8') as f:
    s = f.read()

# Fix 1: is_admin SQL function - restore deleted "id = p_uid AND" and split merged "roleIN"
old1 = "SELECT 1 public.users\n WHERE p_uid roleIN"
new1 = "SELECT 1 FROM public.users\n WHERE id = p_uid AND role IN"
if old1 not in s:
    print("ERROR: old1 not found")
    sys.exit(1)
s = s.replace(old1, new1)
print("Fix 1 applied")

# Fix 2: is_admin_check body - missing IF keyword in plpgsql IF statement
old2 = "BEGIN\n NOT public.is_admin(p_uid) THEN\n RAISE EXCEPTION 'admin only';\n END IF;"
new2 = "BEGIN\n IF NOT public.is_admin(p_uid) THEN\n RAISE EXCEPTION 'admin only';\n END IF;"
if old2 not in s:
    print("ERROR: old2 not found")
    sys.exit(1)
s = s.replace(old2, new2)
print("Fix 2 applied")

with open(p, 'w', encoding='utf-8') as f:
    f.write(s)
print("done")