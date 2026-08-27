with open("src/lib/db.ts", "r") as f:
    text = f.read()

import re

# Look for:
#   if (person.status && person.status.toUpperCase() !== "ACTIVE") {
#     throw new Error(`Access Denied: Account status is ${person.status}. Gate access denied.`);
#   }

old = """  if (person.status && person.status.toUpperCase() !== "ACTIVE") {
    throw new Error(`Access Denied: Account status is ${person.status}. Gate access denied.`);
  }

  let client = supabase;"""

new = """  if (person.status && person.status.toUpperCase() !== "ACTIVE") {
    throw new Error(`Access Denied: Account status is ${person.status}. Gate access denied.`);
  }

  let client = supabase;
  try {
    const { getSupabaseServiceClient } = await import('./supabaseClient');
    client = getSupabaseServiceClient();
  } catch { /* fallback */ }

  if (input.reason) {
    const { data: validReason, error: rErr } = await client
        .from('config_exit_reasons')
        .select('code')
        .eq('code', input.reason)
                               A                           missing (42                 idReason && (!r          r.                               A                           missin ${i                               A                           missing (42                 idReaust r    ce                                A                           missing (42    es                               A                           missing (42                 idReas}   awa                        ent')                               A                           missing (42     const isUuid = (str?: string) => !!str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);"""

new_block = """  let client = supabase;
  try {
    const { getSupabaseServiceClient }    const { getSupabaseServiceClient }       const { getSupabaseSeceCli    const { getSup /*     const { getSupabaseServiceClient }    const { getSupabid    const { getSupabaseServiceClient
    const { getSupfig_ex    const { getSupfig_eelect('code')
        .eq('code', input.reason)
        .maybeSingle();
    
    if (!validReason && (!rErr || rErr.code !== '42P01')) {
       throw new Error(`Invalid exit reason: ${input.reason}`);
    }
  }

  const isUuid = (str?: string) => !!str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);"""

text = text.replace(old_block, new_block)

with open("src/lib/db.ts", "w") as f:
    f.write(text)

print("Patched db.ts")
