// src/app/api/sysadmin/drills/route.ts
// J5 — Drill evidence API.
//
// Reads the signed evidence files that the security-chaos drills
// (scripts/drills/*.sh, batch J) write under DRILL_EVIDENCE_DIR and
// returns the latest result per drill with its age in hours. The
// security-posture endpoint (Batch I2) surfaces a "Drills (30d)" tile
// from this data: >30 days old → warn, any recent fail → fail.
//
// Evidence files are JSON: { drill, stamp, status, details, host }.
// When DRILL_EVIDENCE_KEY_FILE was set at write time, a sibling
// <file>.sig (ed25519 over the exact bytes) sits next to it; this
// route does NOT verify the signature (the web container does not hold
// the private key) — verification happens at the audit level
// (scripts/verify-drill-evidence.sh, out of scope for this batch).

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

const EVIDENCE_DIR =
  process.env.DRILL_EVIDENCE_DIR ?? "/opt/monitoring/drills/evidence";
// Fallback when the directory isn't bind-mounted into the web container:
// read straight out of the postgres container's host path is impossible
// from Node — instead fall back to the compose repo's own drills dir.
const FALLBACK_EVIDENCE_DIR = "/opt/monitoring/compose/scripts/drills/evidence";

interface EvidenceFile {
  drill: string;
  stamp: string; // YYYYMMDDTHHMMSSZ
  status: "pass" | "fail";
  details: Record<string, unknown>;
  host: string;
}

interface DrillView {
  drill: string;
  stamp: string;
  status: "pass" | "fail";
  host: string;
  ageHours: number;
  signed: boolean;
  skipped?: boolean;
  details: Record<string, unknown>;
}

function stampToMillis(stamp: string): number {
  // 20270106T030000Z → 2027-01-06T03:00:00Z
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(stamp);
  if (!m) return Number.NaN;
  return new Date(
    `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`,
  ).getTime();
}

async function handleGet(
  _req: NextRequest,
  _ctx: { auth: AuthContext },
): Promise<NextResponse> {
  let files: string[] = [];
  let dir: string;
  try {
    files = await fs.readdir(EVIDENCE_DIR);
    dir = EVIDENCE_DIR;
  } catch {
    // Primary dir absent (drills ran on the host, not in the container):
    // try the repo-adjacent location before reporting an empty view.
    try {
      files = await fs.readdir(FALLBACK_EVIDENCE_DIR);
      dir = FALLBACK_EVIDENCE_DIR;
    } catch {
      return NextResponse.json({
        success: true,
        data: {
          drills: [],
          total: 0,
          passing: 0,
          failing: 0,
          evidenceDir: EVIDENCE_DIR,
          evidenceDirExists: false,
        },
      });
    }
  }

  const latest = new Map<string, { ev: EvidenceFile; signed: boolean; file: string }>();
  for (const f of files) {
    if (!f.endsWith(".json") || f.endsWith(".unsigned.json")) continue;
    try {
      const raw = await fs.readFile(join(dir, f), "utf8");
      const ev = JSON.parse(raw) as EvidenceFile;
      if (!ev.drill || !ev.stamp) continue;
      let signed = false;
      try {
        await fs.access(join(dir, `${f}.sig`));
        signed = true;
      } catch {
        signed = false;
      }
      const cur = latest.get(ev.drill);
      if (!cur || ev.stamp > cur.ev.stamp) {
        latest.set(ev.drill, { ev, signed, file: f });
      }
    } catch {
      // Malformed evidence file: skip it, never let one bad file 500 the tile.
      // (Logged to the console so a recurring corruption is visible; this is
      // not a swallowed ERROR in a mutation path — it is a read-only
      // enumeration fallback.)
      console.error(`[drills] skipping malformed evidence file: ${f}`);
    }
  }

  const now = Date.now();
  const drills: DrillView[] = [...latest.values()].map(({ ev, signed }) => {
    const ms = stampToMillis(ev.stamp);
    return {
      drill: ev.drill,
      stamp: ev.stamp,
      status: ev.status === "fail" ? "fail" : "pass",
      host: ev.host ?? "unknown",
      ageHours: Number.isFinite(ms) ? (now - ms) / 3_600_000 : -1,
      signed,
      skipped: ev.details?.skipped === true ? true : undefined,
      details: ev.details ?? {},
    };
  });
  drills.sort((a, b) => a.drill.localeCompare(b.drill));

  const passing = drills.filter((d) => d.status === "pass").length;
  const failing = drills.filter((d) => d.status === "fail").length;

  return ok({
    drills,
    total: drills.length,
    passing,
    failing,
    evidenceDir: dir,
    evidenceDirExists: true,
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["sysadmin"],
});
