/**
 * tests/unit/kernel-conformance.test.ts — the guardrail that stops shell drift.
 *
 * Imports every command-bar shell in the manifest and asserts the kernel owns
 * the parsing logic. A shell that copy-pastes a parser is a Tier-0 violation:
 * policy must live in the kernel (lib/commands/parse.ts), the shell only
 * calls it.
 *
 * Three states per shell (from the manifest):
 *   "hollowed"    → MUST import the kernel parser, MUST NOT define its own
 *   "inherited"   → MUST NOT define its own parser (conforms by absence)
 *   "as-is"       → KNOWN violation: still copy-pasted. Tracked so the debt
 *                    is visible; it flips to "hollowed" in its Phase-4 PR.
 *
 * This is a static conformance check, not a runtime test — it catches the
 * "someone added a 16th bar with its own parseCommand" case the moment the
 * file lands.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { COMMAND_BARS_MANIFEST } from "@/components/approver/command-bars.manifest";

// tests/unit/kernel-conformance.test.ts → repo root → src/components/approver
const APPROVER_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../src/components/approver",
);

// A conformed shell imports the kernel parser.
const KERNEL_IMPORT = 'from "@/lib/commands/parse"';
// Forbidden anywhere in a shell: a shell-local parseCommand *definition*.
const OWN_PARSER_DEF = /function\s+parseCommand\s*\(/;

describe("command-bar kernel conformance", () => {
  it("manifest is non-empty", () => {
    expect(COMMAND_BARS_MANIFEST.length).toBeGreaterThan(0);
  });

  // Every bar in the manifest must exist on disk.
  it("all manifest files exist", () => {
    for (const entry of COMMAND_BARS_MANIFEST) {
      const path = resolve(APPROVER_DIR, entry.file);
      expect(existsSync(path), `${entry.file} not found`).toBe(true);
    }
  });

  // Hollowed bars: import the kernel, define nothing.
  for (const entry of COMMAND_BARS_MANIFEST.filter((e) => e.conformed === "hollowed")) {
    it(`${entry.file} [hollowed] imports the kernel parser and defines none of its own`, () => {
      const src = readFileSync(resolve(APPROVER_DIR, entry.file), "utf8");
      expect(src, `${entry.file} must import the kernel parser`).toContain(KERNEL_IMPORT);
      expect(
        OWN_PARSER_DEF.test(src),
        `${entry.file} must not define its own parseCommand`,
      ).toBe(false);
    });
  }

  // Inherited bars: no parser of their own (conform by absence).
  for (const entry of COMMAND_BARS_MANIFEST.filter((e) => e.conformed === "inherited")) {
    it(`${entry.file} [inherited] defines no parser of its own`, () => {
      const src = readFileSync(resolve(APPROVER_DIR, entry.file), "utf8");
      expect(
        OWN_PARSER_DEF.test(src),
        `${entry.file} must not define its own parseCommand`,
      ).toBe(false);
    });
  }

  // As-is bars: KNOWN debt. Tracked so the list is visible + greppable.
  // Each flips to "hollowed" in its Phase-4 PR and moves into that group.
  const asIs = COMMAND_BARS_MANIFEST.filter((e) => e.conformed === "as-is");
  it(`tracks ${asIs.length} as-is bars pending hollow-out (known debt)`, () => {
    for (const entry of asIs) {
      const src = readFileSync(resolve(APPROVER_DIR, entry.file), "utf8");
      // A copy-pasted (as-is) bar still defines its own parser today.
      expect(
        OWN_PARSER_DEF.test(src),
        `${entry.file} [as-is] should still have its own parser until it is hollowed`,
      ).toBe(true);
    }
  });

  // Global invariant: no NEW shell can sneak in with its own parser. Any bar
  // on disk that is NOT in the manifest and defines its own parser is a
  // conformance failure.
  it("no unlisted command-bar shell defines its own parser", () => {
    const listed = new Set(COMMAND_BARS_MANIFEST.map((e) => e.file));
    const allBars = readdirSync(APPROVER_DIR).filter((f) => f.endsWith("CommandBar.tsx"));
    for (const bar of allBars) {
      if (listed.has(bar)) continue;
      const src = readFileSync(resolve(APPROVER_DIR, bar), "utf8");
      expect(
        OWN_PARSER_DEF.test(src),
        `${bar} defines its own parser but is NOT in the manifest — add it to command-bars.manifest.ts`,
      ).toBe(false);
    }
  });
});
