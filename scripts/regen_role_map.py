#!/usr/bin/env python3
"""Regenerate a ROLE_OPERATIONS.md-style role map from Next.js route files.

Scans every src/app/api/**/route.ts, extracts the `requiredRole` gate (inline
string lists AND tier constants like TIER.APPROVER / local const role lists
resolved against the defining module), and prints per-role tallies + a
route-by-route inventory. Stdlib only; safe to run headless in CI or a session.

Usage:
  python3 regen_role_map.py [repo_root] [--json out.json]

The TIER fallback table mirrors src/server/policy/roles.ts — if that file
exists under the repo root it is parsed and the fallback is ignored.
"""
import re, glob, json, sys
from collections import Counter

TIER_FALLBACK = {
    "APPROVER": ["principal","vice_principal","exam_branch","oie","hostel_manager",
                 "deputy_warden","caretaker","hod","staff","supervisor","exam_superintendent"],
    "OPERATOR": ["operator","principal","admin","sysadmin"],
    "ADMIN": ["admin","sysadmin"],
    "SYSADMIN": ["sysadmin"],
    "MESS_INCHARGE": ["mess_incharge","principal","admin","sysadmin"],
}

def main():
    args = [a for a in sys.argv[1:] if a != "--json"]
    root = args[0] if args else "."
    out_json = None
    if "--json" in sys.argv:
        out_json = sys.argv[sys.argv.index("--json") + 1]

    # 1. tier constants: parse the policy file if present, else fallback
    tiers = dict(TIER_FALLBACK)
    for policy in glob.glob(root + "/src/server/policy/roles.ts"):
        txt = open(policy).read()
        for name in list(TIER_FALLBACK) + ["PUBLIC", "SELF", "APP"]:
            m = re.search(r'"%s"\s*:\s*\[([^\]]+)\]' % name, txt)
            if m:
                tiers[name] = re.findall(r'"([a-z_]+)"', m.group(1))

    # 2. local const Role[] lists, module scope, whole src tree
    local_consts = {}
    for f in glob.glob(root + "/src/**/*.ts", recursive=True):
        txt = open(f).read()
        for m in re.finditer(
                r"(?:export\s+)?const\s+([A-Z][A-Z_]+)\s*(?::\s*Role\[\])?\s*=\s*\[([^\]]+)\]",
                txt):
            roles = sorted(set(re.findall(r'"([a-z_]+)"', m.group(2))))
            if roles:
                local_consts[m.group(1)] = roles

    # 3. per-route scan
    routes = []
    base = root + "/src/app/api"
    for f in sorted(glob.glob(base + "/**/*.ts", recursive=True)):
        if not f.endswith("/route.ts"):
            continue
        apipath = "/api" + f[len(base):].replace("/route.ts", "")
        txt = open(f).read()
        methods = sorted(set(re.findall(
            r"export (?:async )?const (GET|POST|PUT|PATCH|DELETE)\b", txt)))
        m = re.search(r"requiredRole:\s*\[([^\]]+)\]", txt)
        roles = sorted(set(re.findall(r'"([a-z_]+)"', m.group(1)))) if m else []
        cm = re.search(r"requiredRole:\s*(TIER\.[A-Z_]+|[A-Z_]{4,})\b", txt)
        kind = "inline" if m else ("tier" or "const" if cm else None)
        if cm:
            token = cm.group(1)
            if token.startswith("TIER."):
                roles = sorted(set(roles) | set(tiers.get(token[5:], [])))
                kind = "tier"
            elif token in local_consts:
                roles = sorted(set(roles) | set(local_consts[token]))
                kind = "const"
            else:
                kind = "unknown:" + token
        is_cron = "/cron/" in apipath
        gate = "cron" if is_cron else ("open" if not roles else (kind or "inline"))
        routes.append({"path": apipath, "methods": methods or [], "roles": roles,
                       "gate": gate, "rate": "withRateLimit" in txt})

    # 4. tally
    rc = Counter()
    for r in routes:
        for x in r["roles"]:
            rc[x] += 1
    summary = {
        "total": len(routes),
        "gated": sum(1 for r in routes if r["roles"]),
        "open": sum(1 for r in routes if r["gate"] == "open"),
        "cron": sum(1 for r in routes if r["gate"] == "cron"),
        "unknown_gate": sum(1 for r in routes if r["gate"].startswith("unknown")),
        "unknown_list": [r["path"] for r in routes if r["gate"].startswith("unknown")],
        "by_role": dict(rc.most_common()),
    }
    print(json.dumps(summary, indent=1))
    if out_json:
        json.dump(routes, open(out_json, "w"), indent=1)
        print("wrote", out_json)

if __name__ == "__main__":
    main()
