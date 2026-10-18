// Shared primitives for the sysadmin console pages.
//
// Thin re-export barrel so the generated domain content + page wrappers have a
// single import site. The actual implementations live in the shared component
// paths so they stay consistent with the rest of the app.
//
//   - WidgetBoundary — error boundary that isolates a failing dashboard section
//   - PageHeader     — page title / breadcrumb / refresh actions
//   - Skeleton       — loading placeholder

export { WidgetBoundary } from "@/components/shared/WidgetBoundary";
export { PageHeader } from "@/components/shared/PageHeader";
export type { PageHeaderProps } from "@/components/shared/PageHeader";
export { Skeleton } from "@/components/ui/skeleton";
