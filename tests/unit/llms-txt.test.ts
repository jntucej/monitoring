import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("LLMs.txt Compliance", () => {
  it("verifies public/llms.txt exists and meets structure requirements", () => {
    const rootDir = "C:/Users/SHAIK JUNAID/monitoring";
    const filePath = path.join(rootDir, "public", "llms.txt");

    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, "utf-8");
    expect(content.length).toBeGreaterThan(50);
    expect(content.trim().startsWith("# ")).toBe(true);
    expect(content).toMatch(/\[[^\]]+\]\([^)]+\)/);
  });
});
