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

  it("notifications/alerts + announcements → merged /student/notifications", () => {
    expect(redirectTarget("notifications/alerts/page.tsx")).toBe(
      "/student/notifications",
    );
    expect(redirectTarget("notifications/announcements/page.tsx")).toBe(
      "/student/notifications",
    );
  });
});
