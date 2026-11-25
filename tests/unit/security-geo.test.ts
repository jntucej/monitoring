import { describe, it, expect } from "vitest";
import { distanceM } from "../../src/lib/security/geo";

describe("security geo distanceM", () => {
  it("returns 0 for identical coordinates", () => {
    expect(distanceM(17.9784, 79.5942, 17.9784, 79.5942)).toBe(0);
  });

  it("computes realistic campus distance (~40-60m)", () => {
    const d = distanceM(17.9784, 79.5942, 17.9788, 79.5945);
    expect(d).toBeGreaterThan(30);
    expect(d).toBeLessThan(80);
  });
});
