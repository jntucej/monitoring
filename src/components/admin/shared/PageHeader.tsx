"use client";

import { RefreshCw } from "lucide-react";
import { ReactNode, useEffect } from "react";



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

/**
 * PageHeader — invisible. The role consoles dropped the per-page title
 * banner (the shell chrome + role nav already identify the page). This
 * component now only owns the document-title side effect so all the
 * existing `<PageHeader ... />` call sites keep working unchanged, and the
 * refresh button that used to render here is rendered by the shells.
 *
 * Any new code should use `usePageTitle` instead of mounting a PageHeader.
 */
export function PageHeader({ title, subtitle }: PageHeaderProps) {
  useEffect(() => {
    if (title && typeof document !== "undefined") {
      document.title = `${title} | Gate Monitor`;
    }
  }, [title]);

  if (!title) return null;

  return (
    <div className="space-y-0.5 pb-1">
      <h1 className="text-lg md:text-xl font-bold text-text-primary truncate">{title}</h1>
      {subtitle && <p className="text-xs md:text-sm text-text-muted">{subtitle}</p>}
    </div>
  );
}

const _refreshIcon = RefreshCw;

export default PageHeader;