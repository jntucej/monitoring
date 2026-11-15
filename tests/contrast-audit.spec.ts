import { test, expect } from "@playwright/test";

// Live computed-contrast audit. Measures ACTUAL rendered colors (not static
// parsing) across / and /login in both themes and reports:
//   a) visible text nodes with contrast < 4.5:1 (normal text) vs their resolved
//      background (AA threshold) — the real "washed out" cases,
//   b) text that is effectively invisible (color alpha 0 with no valid
//      background-clip image) — the "blank text" cases,
//   c) borderless interactive controls (button/input with computed border
//      transparent AND no visible outline) — the "no boundaries" cases.
//
// Emits JSON to stdout under a marker so a runner can capture it. This is a
// measurement spec (no hard assertion on counts) so it surfaces findings for
// triage; the a11y.spec.ts axe gate remains the blocking one.

const PAGES = ["/", "/login"];

// Runs in-page: walk visible text nodes, compute per-node contrast against the
// effective (walked-up) opaque background, and collect the three finding kinds.
// NOTE: all helpers live INSIDE this function because page.evaluate only
// serializes the function body — outer module-scope functions are not visible
// in the evaluated context.
function auditFn(): {
  lowContrast: unknown[];
  invisible: unknown[];
  borderless: unknown[];
  totalTextNodes: number;
} {
  // sRGB relative luminance (WCAG 2.x). Accept "rgb(r,g,b)" / "rgba(r,g,b,a)".
  function luminance(r: number, g: number, b: number): number {
    const f = (c: number) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function parseRgb(str: string): { r: number; g: number; b: number; a: number } {
    const m = str.match(/rgba?\(([^)]+)\)/);
    if (!m) return { r: 0, g: 0, b: 0, a: 1 };
    const p = m[1].split(",").map((x) => x.trim());
    return { r: +p[0], g: +p[1], b: +p[2], a: p.length > 3 ? +p[3] : 1 };
  }
  function contrastRatio(l1: number, l2: number): number {
    const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }

  const root = document.documentElement;
  // Resolve the effective opaque background by walking up until alpha hits 1.
  function effBg(el: Element): { r: number; g: number; b: number } {
    let node: Element | null = el;
    // Collect the background stack from body down to the element.
    const stack: { r: number; g: number; b: number; a: number }[] = [];
    while (node && node !== document.body.parentNode) {
      const cs = getComputedStyle(node);
      const bg = cs.backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
        const p = parseRgb(bg);
        if (p.a > 0) stack.push(p);
        if (p.a >= 1) break;
      }
      node = node.parentElement;
    }
    // Composite top-down onto white (light) — but we detect theme from root attr.
    const dark = root.getAttribute("data-theme") === "dark";
    const base = dark ? [9, 9, 11] : [255, 255, 255];
    let r = base[0], g = base[1], b = base[2];
    // Composite from the deepest (last pushed) up.
    for (let i = stack.length - 1; i >= 0; i--) {
      const p = stack[i];
      r = p.r * p.a + r * (1 - p.a);
      g = p.g * p.a + g * (1 - p.a);
      b = p.b * p.a + b * (1 - p.a);
    }
    return { r, g, b };
  }

  const lowContrast: unknown[] = [];
  const invisible: unknown[] = [];
  const borderless: unknown[] = [];
  let totalTextNodes = 0;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let cur: Element | null = walker.currentNode as Element;
  while (cur) {
    const el = cur;
    const cs = getComputedStyle(el);
    const isText = Array.from(el.childNodes).some((n) =>
      n.nodeType === Node.TEXT_NODE && (n.textContent || "").trim().length > 0,
    );
    if (isText) totalTextNodes++;

    // Visible?
    const rect = el.getBoundingClientRect();
    const visible =
      cs.visibility !== "hidden" &&
      cs.display !== "none" &&
      cs.opacity !== "0" &&
      rect.width > 0 &&
      rect.height > 0;

    if (isText && visible) {
      const fg = parseRgb(cs.color);
      const fontSizePx = parseFloat(cs.fontSize) || 16;
      const fontWeight = parseFloat(cs.fontWeight) || 400;
      const large = fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700);
      const threshold = large ? 3.0 : 4.5;

      // (a) invisible text: fg alpha ~0 with no background-clip image providing it
      const clipImage = (cs.backgroundImage || "").includes("gradient");
      if (fg.a < 0.02 && !clipImage) {
        invisible.push({
          text: ((el.textContent || "").trim().slice(0, 40)),
          selector: describe(el),
          color: cs.color,
          opacity: cs.opacity,
        });
      }

      // Effective fg when alpha < 1: composite over the effective bg
      const bg = effBg(el);
      const bgL = luminance(bg.r, bg.g, bg.b);
      let fgComp = { r: fg.r, g: fg.g, b: fg.b };
      if (fg.a < 1) {
        fgComp = {
          r: fg.r * fg.a + bg.r * (1 - fg.a),
          g: fg.g * fg.a + bg.g * (1 - fg.a),
          b: fg.b * fg.a + bg.b * (1 - fg.a),
        };
      }
      const fgL = luminance(fgComp.r, fgComp.g, fgComp.b);
      const ratio = contrastRatio(fgL, bgL);
      if (ratio < threshold && fg.a >= 0.02) {
        lowContrast.push({
          text: ((el.textContent || "").trim().slice(0, 40)),
          selector: describe(el),
          ratio: Math.round(ratio * 100) / 100,
          threshold,
          fontSize: Math.round(fontSizePx * 100) / 100,
          color: cs.color,
          bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`,
        });
      }
    }

    // (c) borderless interactive control
    const interactive =
      el.tagName === "BUTTON" ||
      el.tagName === "INPUT" ||
      el.tagName === "SELECT" ||
      el.tagName === "TEXTAREA" ||
      el.getAttribute("role") === "button" ||
      el.getAttribute("role") === "tab";
    if (interactive && visible) {
      const bw = parseFloat(cs.borderWidth || "0") || 0;
      const bc = parseRgb(cs.borderColor || "");
      const hasShadow = (cs.boxShadow || "").trim().length > 0;
      if (bw === 0 && bc.a === 0 && !hasShadow) {
        borderless.push({
          tag: el.tagName,
          role: el.getAttribute("role") || "",
          selector: describe(el),
        });
      }
    }
    cur = walker.nextNode() as Element | null;
  }

  return { lowContrast, invisible, borderless, totalTextNodes };

  function describe(el: Element): string {
    let s = el.tagName.toLowerCase();
    if (el.id) s += `#${el.id}`;
    const cls = (el.className || "").toString().split(/\s+/).filter(Boolean).slice(0, 4).join(".");
    if (cls) s += "." + cls;
    return s;
  }
}

for (const theme of ["dark", "light"] as const) {
  for (const path of PAGES) {
    test(`contrast-audit (${theme}) ${path}`, async ({ page }) => {
      await page.addInitScript((t) => {
        document.documentElement.setAttribute("data-theme", t);
      }, theme);
      await page.goto(path);
      await page.waitForLoadState("networkidle").catch(() => undefined);
      await new Promise((r) => setTimeout(r, 800));
      const res = await page.evaluate(auditFn);
      // Dedupe by selector+text
      const dedupe = (arr: Record<string, unknown>[]) => {
        const seen = new Set<string>();
        return arr.filter((x) => {
          const k = JSON.stringify([x.selector, x.text, x.ratio]);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      };
      const lc = dedupe(res.lowContrast as Record<string, unknown>[]);
      const inv = dedupe(res.invisible as Record<string, unknown>[]);
      const bl = dedupe(res.borderless as Record<string, unknown>[]);
      const summary = {
        theme,
        path: page.url(),
        totalTextNodes: res.totalTextNodes,
        lowContrastCount: lc.length,
        invisibleCount: inv.length,
        borderlessCount: bl.length,
        lowContrast: lc.slice(0, 40),
        invisible: inv.slice(0, 30),
        borderless: bl.slice(0, 30),
      };
      console.log(`\n===CONTRAST-AUDIT-JSON===${JSON.stringify(summary, null, 2)}===END-CONTRAST-AUDIT===`);
      // No hard fail: this is measurement. (The axe gate is the blocking one.)
      expect(true).toBe(true);
    });
  }
}
