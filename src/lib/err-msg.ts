/**
 * Normalize an `unknown` catch binding to a message/code string.
 * Use in place of `err.message` / `err?.message` / `err.code` when the
 * catch binding is type `unknown`, to satisfy both tsc and
 * @typescript-eslint/no-explicit-any without a per-site inline cast.
 */
export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function errCode(e: unknown): string {
  return e instanceof Error ? String((e as { code?: string }).code ?? "") : "";
}
