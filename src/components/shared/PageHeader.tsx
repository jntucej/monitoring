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
  /** Render a visible mobile title bar even when the desktop shell hides one. */
  showMobileTitle?: boolean;
}

/**
 * PageHeader — renders a compact mobile-only title bar (below the standalone
 * shell top chrome) so students/parents on phones always see the page name.
 * On md+ the console chrome already identifies the page, so nothing renders.
 * Also owns the document-title side effect; all existing call sites keep
 * working unchanged.
 *
 * An <h1> is always emitted (visually hidden on md+) so every page has a
 * single accessible heading for screen readers and deep-link clarity.
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

  if (!title) return null;

  return (
    <div className="md:-mx-4 md:px-4 md:pt-2 md:pb-1">
      {/* Desktop: visually-hidden h1 for a11y + document context. */}
      <h1 className="sr-only">{title}</h1>
      {/* Mobile: visible title bar (the shell chrome is hidden on small screens). */}
      {showMobileTitle && (
        <div className="md:hidden -mx-4 px-4 pt-2 pb-1">
          <h2 className="text-base font-bold text-[var(--text-primary)] truncate">{title}</h2>
          {subtitle && <p className="text-xs text-[var(--text-muted)] truncate">{subtitle}</p>}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _refreshIcon = RefreshCw;

export default PageHeader;
