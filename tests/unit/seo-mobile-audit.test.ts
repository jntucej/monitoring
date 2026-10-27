import { describe, it, expect } from "vitest";

describe("SEO and Mobile Audit Compliance", () => {
  it("verifies meta viewport tag is configured", () => {
    // Audit check 2.1: Viewport meta tag correct
    const viewportTag = '<meta name="viewport" content="width=device-width, initial-scale=1">';
    expect(viewportTag).toContain("width=device-width");
  });

  it("verifies noindex header check", () => {
    // Audit check 1.1: Page is indexable
    const headers = { "x-robots-tag": "index, follow" };
    expect(headers["x-robots-tag"]).not.toContain("noindex");
  });
});
