/**
 * CSV injection guard. Prepends a single quote to any cell that starts
 * with `=`, `+`, `-`, `@`, `\t`, or `\r` so that spreadsheet apps treat
 * it as a literal string instead of executing it as a formula.
 */
export function csvEscape(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) return "'" + s;
  return s;
}

/**
 * Escape and join CSV cells. Any cell containing a comma, double-quote,
 * or newline is wrapped in double quotes with embedded quotes doubled.
 */
export function csvRow(cells: (string | null | undefined)[]): string {
  return cells
    .map((cell) => {
      const escaped = csvEscape(cell);
      if (/[",\n\r]/.test(escaped)) {
        return `"${escaped.replace(/"/g, '""')}"`;
      }
      return escaped;
    })
    .join(",");
}
