/**
 * Active Directory / LDAP Directory Synchronizer.
 *
 * ponytail: No real LDAP connector is wired yet — there is no LDAP server
 * config store and no ldapjs dependency in this project. We deliberately do
 * NOT fabricate sync counts; a run without configuration reports
 * NOT_CONFIGURED so admins aren't misled by fake numbers like the previous
 * random-number stub. Upgrade path: add `ldapts`, store bind credentials in
 * system_config, then implement paged search + user upsert here.
 */

export interface LDAPSyncResult {
  syncedAt: string;
  usersProcessed: number;
  usersCreated: number;
  usersUpdated: number;
  status: "success" | "partial_error" | "not_configured";
  errors: string[];
}

const LDAP_URL = process.env.LDAP_URL;
const LDAP_BIND_DN = process.env.LDAP_BIND_DN;
const LDAP_BIND_PASSWORD = process.env.LDAP_BIND_PASSWORD;
const LDAP_BASE_DN = process.env.LDAP_BASE_DN;

export function isLdapConfigured(): boolean {
  return Boolean(LDAP_URL && LDAP_BIND_DN && LDAP_BIND_PASSWORD && LDAP_BASE_DN);
}

export async function executeLDAPSync(): Promise<LDAPSyncResult> {
  if (!isLdapConfigured()) {
    return {
      syncedAt: new Date().toISOString(),
      usersProcessed: 0,
      usersCreated: 0,
      usersUpdated: 0,
      status: "not_configured",
      errors: [
        "LDAP integration is not configured. Set LDAP_URL, LDAP_BIND_DN, LDAP_BIND_PASSWORD and LDAP_BASE_DN to enable directory sync.",
      ],
    };
  }

  // Configuration exists but no connector library is installed; do not fake results.
  return {
    syncedAt: new Date().toISOString(),
    usersProcessed: 0,
    usersCreated: 0,
    usersUpdated: 0,
    status: "partial_error",
    errors: ["LDAP connector is configured but not implemented. Install an LDAP client (e.g. ldapts) to enable sync."],
  };
}

