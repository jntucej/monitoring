"use client";

import { CollegeInfoForm } from "@/components/admin/CollegeInfoForm";

/**
 * Backward-compat re-export. The canonical implementation lives in
 * @/components/admin/CollegeInfoForm.
 */
export function CollegeInfoFormCompat() {
  return <CollegeInfoForm />;
}

// Keep the original named export for any direct imports
export { CollegeInfoForm };
