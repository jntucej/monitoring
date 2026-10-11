#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import { join, extname, relative } from "node:path";

const args = process.argv.slice(2);
const getArg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };

const dir = getArg("--dir", "docs/kb");
const roleArg = getArg("--role", "all");
const roles = roleArg.split(",").map((s) => s.trim()).filter(Boolean);
const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const jwt = process.env.ADMIN_JWT;

if (!jwt) {
  console.error("Missing ADMIN_JWT. Example: ADMIN_JWT=$(...) node scripts/ingest-kb.mjs");
  process.exit(1);
}

const ALLOWED = new Set([".md", ".txt", ".csv", ".json"]);

async function walk(root, out = []) {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    for (const e of entries) {
      const p = join(root, e.name);
      if (e.isDirectory()) await walk(p, out);
      else if (ALLOWED.has(extname(e.name).toLowerCase())) out.push(p);
    }
  } catch {}
  return out;
}

async function ingestOne(path) {
  const raw = await readFile(path, "utf8");
  const info = await stat(path);
  if (info.size > 500_000) {
    console.warn(`  · skip (too large >500KB): ${path}`);
    return { ok: false };
  }
  const rel = relative(process.cwd(), path);
  const title = rel.replace(/^docs\/kb\//, "").replace(/\.(md|txt|csv|json)$/i, "");

  const res = await fetch(`${appUrl}/api/admin/kb/documents`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ title, source: rel, content: raw, roles }),
  });
  if (!res.ok) {
    console.error(`  ✗ ${title}: ${res.status} ${await res.text()}`);
    return { ok: false };
  }
  const body = await res.json();
  console.log(`  ✓ ${title}  →  ${body.chunkCount} chunks`);
  return { ok: true, chunks: body.chunkCount };
}

(async () => {
  console.log(`⛵ Ingesting from ${dir}  (roles: ${roles.join(", ")})\n`);
  const files = await walk(dir);
  if (!files.length) { console.log("Nothing to ingest (dir not found or empty)."); return; }

  let total = 0, ok = 0;
  for (const f of files) {
    const r = await ingestOne(f);
    if (r.ok) { ok++; total += r.chunks || 0; }
  }
  console.log(`\n⛵ Done — ${ok}/${files.length} files, ${total} chunks total.`);
})();
