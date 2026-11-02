// tests/student/redirects.test.ts
// The four legacy student routes redirect to their canonical routes.
// Each redirect page is a small server file; assert the redirect target
// by reading the source (robust, no navigation-graph mocking needed).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");

function redirectTarget(rel: string): string | null {
  const p = resolve(root, "src/app/(student)/student", rel);
  const src = readFileSync(p, "utf8");
  const m = src.match(/redirect\("([^"]+)"\)/);
  return m?.[1] ?? null;
}

describe("student legacy redirects", () => {
  it("pass-application → /student/permissions/new", () => {
    expect(redirectTarget("pass-application/page.tsx")).toBe(
      "/student/permissions/new",
    );
  });

  it("leave-requests → /student/permissions/new", () => {
    expect(redirectTarget("leave-requests/page.tsx")).toBe(
      "/student/permissions/new",
    );
  });

  it("gate-pass → /student/passes", () => {
    expect(redirectTarget("gate-pass/page.tsx")).toBe("/student/passes");
  });

  it("request-tracking → /student/permissions", () => {
    expect(redirectTarget("request-tracking/page.tsx")).toBe(
      "/student/permissions",
    );
  });

  it("notifications/alerts + announcements → standalone filtered routes", () => {
    // The no-tabs gate converted the merged feed's client tab state into
    // standalone sub-routes: /notifications is the "all" feed, and the two
    // sub-routes are their own views (each links back to the all-feed).
    const alerts = readFileSync(
      resolve(root, "src/app/(student)/student/notifications/alerts/page.tsx"),
      "utf8",
    );
    const announcements = readFileSync(
      resolve(root, "src/app/(student)/student/notifications/announcements/page.tsx"),
      "utf8",
    );
    expect(alerts).toContain("/student/notifications");
    expect(alerts).toContain("Alerts");
    expect(announcements).toContain("/student/notifications");
    expect(announcements).toContain("Announcements");
  });
});
