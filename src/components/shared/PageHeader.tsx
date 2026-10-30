"use client";

import { RefreshCw } from "lucide-react";
import { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
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
  /** Render a visible mobile title bar even when the desktop shell hides one. */
  showMobileTitle?: boolean;
}

/**
 * PageHeader — renders a compact mobile-only title bar (below the standalone
 * shell top chrome) so students/parents on phones always see the page name.
 * On md+ the console chrome already identifies the page, so nothing renders.
 * Also owns the document-title side effect; all existing call sites keep
 * working unchanged.
 */
export function PageHeader({
  title,
  subtitle,
  onRefresh,
  refreshing,
  actions,
  breadcrumb,
  pathOverride,
  showMobileTitle = true,
}: PageHeaderProps) {
  useEffect(() => {
    if (title && typeof document !== "undefined") {
      document.title = `${title} | Gate Monitor`;
    }
  }, [title]);

  // Keep unused-destructure lint clean without a no-op render.
  void [subtitle, onRefresh, refreshing, actions, breadcrumb, pathOverride];

  if (!showMobileTitle || !title) return null;

  return (
    <div className="md:hidden -mx-4 px-4 pt-2 pb-1">
      <h1 className="text-base font-bold text-[var(--text-primary)] truncate">{title}</h1>
      {subtitle && <p className="text-xs text-[var(--text-muted)] truncate">{subtitle}</p>}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _refreshIcon = RefreshCw;

export default PageHeader;
