// Admin-owned sidebar + viz kit (decoupled from sysadmin).
// Re-export the two sub-kits so admin pages can import from either
// "@/components/admin/kit" (flat) or the specific sub-path.
export * from "./sidebar";
export * from "./viz";
