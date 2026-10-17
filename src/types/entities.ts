/**
 * Shared entity base type used by the sysadmin console domain types generated
 * by the sysadmin-console-kit scaffold.
 */

export interface Entity {
  id: string;
  [key: string]: unknown;
}
