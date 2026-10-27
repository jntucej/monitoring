"use client";

import type { ReactNode } from "react";

/**
 * The 4-icon operator rail now lives in (operator)/OperatorShell.tsx so it
 * wraps EVERY operator route — including /gate/[gateId] and /worker/*, which
 * are siblings of /operator/* and never inherited a nested-section layout.
 *
 * This file stays as a thin passthrough only so any code that imported
 * "operator section layout" semantics (comments, defensive wrappers) keeps
 * working; it no longer renders the rail itself.
 */
export default function OperatorSectionLayout({
  children,
}: {
  children?: ReactNode;
}) {
  return <>{children}</>;
}
