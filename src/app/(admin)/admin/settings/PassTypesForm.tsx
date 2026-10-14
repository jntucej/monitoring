"use client";

import { PassTypesForm } from "@/components/admin/PassTypesForm";

/**
 * Backward-compat re-export. The canonical implementation lives in
 * @/components/admin/PassTypesForm.
 */
export function PassTypesFormCompat() {
  return <PassTypesForm />;
}

// Keep the original named export for any direct imports
export { PassTypesForm };
