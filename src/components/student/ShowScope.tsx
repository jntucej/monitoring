"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ResolvedScope, ScopeKey } from "@/lib/student/scope";

const ScopeContext = createContext<ResolvedScope | null>(null);

export function StudentScopeProvider({ children }: { children: ReactNode }) {
  const [scope, setScope] = useState<ResolvedScope | null>(null);

  useEffect(() => {
    fetch("/api/me/scope")
      .then((r) => r.json())
      .then((j) => {
        if (j?.data?.scopes) setScope(j.data);
      })
      .catch(() => {});
  }, []);

  return <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>;
}

export function useStudentScope() {
  return useContext(ScopeContext);
}

export function ShowScope({
  when,
  fallback = null,
  children,
}: {
  when: ScopeKey;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const scope = useStudentScope();
  if (!scope) return null;
  return scope.scopes[when] ? <>{children}</> : <>{fallback}</>;
}
