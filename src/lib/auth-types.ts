import type { Role, AccountStatus } from "@/lib/types";

export interface LoginUserRow {
  id: string;
  email: string;
  role: Role;
  status: AccountStatus;
  session_version: number;
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  password_hash: string | null;
  pin_hash: string | null;
  initial_pin_hash: string | null;
  failed_login_count: number;
  locked_until: string | null;
  unique_id: string;
  login_identifier: string | null;
  gate_id: string | null;
  department_id: string | null;
}
