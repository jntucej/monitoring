#!/usr/bin/env node
// Strip the redundant <AuthGuard allowedRoles={["admin","sysadmin"]}> wrapper
// from admin pages, because src/app/(admin)/layout.tsx already wraps all admin
// pages in <AuthGuard allowedRoles={["admin","sysadmin"]}>, making the inner
// wrapper pure duplication. The inner wrapper is removed only if:
//   1. It uses exactly the same role set as the layout
//   2. It wraps the entire returned JSX of the component
//   3. The import can then be safely dropped (no other uses)
// Files with a DIFFERENT role set (e.g. roles/page.tsx) are left alone.

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import path from "path";

const ADMIN_ROOT = "src/app/(admin)/admin";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (p.endsWith("page.tsx")) out.push(p);
  }
  return out;
}

// Match the open tag when its allowedRoles array equals the layout's set
// (["admin","sysadmin"] in either order).
const openRe = /<AuthGuard\s+allowedRoles=\{\s*\[\s*(?:"admin"\s*,\s*"sysadmin"\s*|\"sysadmin\"\s*,\s*"admin"\s*)\]\s*\}>/;

let changed = 0;
for (const file of walk(ADMIN_ROOT)) {
  let src = readFileSync(file, "utf8");
  const openMatch = openRe.exec(src);
  if (!openMatch) continue;
  const openIdx = openMatch.index;
  const open = openMatch[0];

  // Find matching close: walk from openIdx, count <AuthGuard...> opens,
  // match first </AuthGuard> at the right nesting depth.
  let i = openIdx + open.length;
  let depth = 1;
  let closeIdx = -1;
  const openTagRe = /<AuthGuard\b/g;
  const closeTagRe = /<\/AuthGuard>/g;
  let scan = i;
  let lastOpen = -1;
  while (true) {
    openTagRe.lastIndex = scan;
    closeTagRe.lastIndex = scan;
    const nextOpen = openTagRe.exec(src);
    const nextClose = closeTagRe.exec(src);
    const candidate = (nextOpen && (!nextClose || nextOpen.index < nextClose.index))
      ? nextOpen : nextClose;
    if (!candidate) break;
    if (candidate === nextOpen) {
      depth++;
      lastOpen = nextOpen.index;
    } else {
      depth--;
      if (depth === 0) { closeIdx = nextClose.index; break; }
    }
    scan = candidate.index + candidate[0].length;
  }
  if (closeIdx === -1) continue;
  const close = "</AuthGuard>";

  // Verify the wrapper encloses the whole function body:
  // - there must be an `export default function ... {` (or arrow) BEFORE openIdx
  //   whose opening brace is before openIdx
  // - and the close must be followed (eventually) by the function's closing brace
  // Simpler: check that the text before <AuthGuard is just `return (`, `(\n  `, or
  //   `return (\n    `. If so, we can safely replace `<AuthGuard ...>` with ``
  //   and `</AuthGuard>` with ``, then dedent inner content if needed.
  const before = src.slice(0, openIdx);
  // Find the last `(` or `return` before the open tag; we require the open tag
  // to be the first child of an outer JSX container that is a full-page wrapper.
  const tailTrim = before.replace(/\s+$/, "");
  const lastParenish = tailTrim.match(/\(\s*$|return\s*\(\s*$|return\s+$/);
  if (!lastParenish) continue; // shape we don't handle — skip for safety

  // Confirm close tag is followed by `)` or end of function body
  const after = src.slice(closeIdx + close.length);
  const afterHead = after.match(/^\s*\)\s*[,}\n]|^\s*[,}\n]/);
  if (!afterHead) continue;

  // Do the unwrap: replace the open tag with empty, and the close tag with
  // "\n" + closing paren to keep the JSX `)` on its own line.
  const indentMatch = before.match(/(\s*)$/) ;
  const indent = indentMatch ? indentMatch[1] : "    ";
  let newSrc =
    src.slice(0, openIdx) +
    src.slice(openIdx + open.length, closeIdx) +
    indent + "\n" +
    src.slice(closeIdx + close.length);
  const remainingUses = (newSrc.match(/<AuthGuard\b/g) || []).length;
  if (remainingUses === 0) {
    // Drop the import line
    newSrc = newSrc.replace(
      /^\s*import\s*\{\s*AuthGuard\s*\}\s*from\s*["']@\/components\/shared\/AuthGuard["'];?\s*\n/m,
      ""
    );
  }
  writeFileSync(file, newSrc);
  changed++;
  console.log("unwrapped:", file);
}
console.log("done, changed", changed, "files");
