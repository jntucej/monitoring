"use client";

import React from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import type { Role } from "@/lib/types";

const MESS_ALLOWED_ROLES: Role[] = ["mess_incharge", "principal", "admin", "sysadmin"];

export default function MessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard allowedRoles={MESS_ALLOWED_ROLES}>{children}</AuthGuard>;
}
