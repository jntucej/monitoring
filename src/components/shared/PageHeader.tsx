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
}

/**
 * PageHeader — invisible. The role consoles dropped the per-page title
 * banner (the shell chrome + role nav already identify the page). This
 * component now only owns the document-title side effect so all the
 * existing `<PageHeader ... />` call sites keep working unchanged.
 *
 * Any new code should use `usePageTitle` instead of mounting a PageHeader.
 */
export function PageHeader({
  title,
  subtitle,
  onRefresh: _onRefresh,
  refreshing: _refreshing,
  actions: _actions,
  breadcrumb: _breadcrumb,
  pathOverride,
}: PageHeaderProps) {
  const pathname = usePathname();

  // Auto-set document title from page meta (client-side fallback for client pages)
  useEffect(() => {
    const path = pathOverride ?? pathname;
    const meta = metaFor(path);
    document.title = `${meta.title} | Gate Monitor`;
  }, [pathOverride, pathname]);

  return null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _refreshIcon = RefreshCw;

export default PageHeader;