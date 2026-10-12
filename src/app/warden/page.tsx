"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * The warden role has been folded into the principal role.
 * Any navigation to /warden is redirected to the principal command center.
 */
export default function WardenRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/principal");
  }, [router]);

  return null;
}
