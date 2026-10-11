"use client";

import { RefreshCw } from "lucide-react";
import { ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { metaFor } from "@/lib/page-meta";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  actions?: ReactNode;
  breadcrumb?: { label: string; href: string }[];
  /** Optional explicit path to look up metadata. Defaults to current pathname. */
  pathOverride?: string;
}

export function PageHeader({
  title,
  subtitle,
  onRefresh,
  refreshing,
  actions,
  breadcrumb,
  pathOverride,
}: PageHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Auto-set document title from page meta (client-side fallback for client pages)
  useEffect(() => {
    const path = pathOverride ?? pathname;
    const meta = metaFor(path);
    document.title = `${meta.title} | Gate Monitor`;
  }, [pathOverride, pathname]);

  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="mb-1 flex items-center gap-1 text-xs text-[var(--text-muted)]" aria-label="Breadcrumb">
            {breadcrumb.map((b, i) => (
              <span key={b.href}>
                <a href={b.href} className="hover:underline">
                  {b.label}
                </a>
                {i < breadcrumb.length - 1 && <span className="mx-1">/</span>}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--bg-elevated)] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        )}
      </div>
    </header>
  );
}