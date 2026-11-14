/**
 * Icon scale — single source of truth for icon sizing.
 * unslop-ui flags any file with 3+ distinct icon sizes, so new code
 * imports this and uses at most two of the three steps.
 */
export const ICON = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-6",
} as const;

export type IconScale = keyof typeof ICON;
