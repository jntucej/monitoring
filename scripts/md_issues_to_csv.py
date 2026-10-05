#!/usr/bin/env python3
"""One-off converter: jira/issues/issues_3.md -> jira/issues/issues_3.csv.

The Jira automation generator (scripts/jira_automation.py) only reads
`issues_*.csv`; issues_3.md is a prose audit list. This projects each
numbered finding into the legacy nine-column source schema plus an explicit
`role` column so the generator resolves a deterministic label per row.

Ownership derives from the finding's section + severity, following the team's
responsibilities:
  IT  Akarsh        architecture, auth/session design, migrations, config/build
  FS  Ashwitha      full-stack features, API routes, schema mapping, UI/state
  IS  Junaid        infrastructure, cloud, cyber-security, scripts, worker
  QA  Dhanavarsha   verification: broken/unauth endpoints, escaping, data, parity

Never overwrites an existing output file (same invariant as the generator).
"""
import csv
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
SRC = os.path.join(ROOT, "jira", "issues", "issues_3.md")
OUT = os.path.join(ROOT, "jira", "issues", "issues_3.csv")

SEV_TO_PRIORITY = {"C": "P0", "H": "P1", "M": "P2", "L": "P3"}
SEV_TO_LABEL = {"C": "Critical", "H": "High", "M": "Medium", "L": "Low"}

# Section header keyword -> (Component Area, owner role)
SECTION_MAP = [
    ("AUTH & SESSION", ("Authentication", "IT")),
    ("AUTHORIZATION / IDOR", ("Authorization", "FS")),
    ("SCHEMA", ("Database", "IT")),
    ("MIGRATIONS", ("Database", "IS")),
    ("API ROUTE LOGIC", ("Application", "FS")),
    ("SECURITY / CRYPTO", ("Security", "IS")),
    ("STATE / HOOKS / CONTEXT", ("Application", "FS")),
    ("LIB", ("Application", "FS")),
    ("COMPONENTS", ("Application", "QA")),
    ("SCRIPTS", ("Scripts", "IS")),
    ("CONFIG / BUILD", ("Infrastructure", "IS")),
    ("WORKER", ("Infrastructure", "IS")),
    ("STUDY APP", ("Application", "QA")),
    ("MISC", ("Application", "QA")),
]

OWNER_NAMES = {"IT": "Akarsh", "FS": "Ashwitha", "IS": "Junaid", "QA": "Dhanavarsha"}

ROW_RE = re.compile(r"^\s*(\d+)\.\s+\*\*\[([CHML])\]\*\*\s+(.*)$")
BACKTICK_FIRST = re.compile(r"^`([^`]+)`\s*(.*)$")

# Force-upgrade clearly security-critical auth/session files to IT.
IT_UPGRADE_PATHS = (
    "src/app/api/auth/login/route.ts",
    "src/app/api/auth/mfa/bootstrap/route.ts",
)
IT_UPGRADE_NUMS = {65, 189, 190, 191, 192}


def die(msg):
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)



def parse_md(path):
    """Return list of dicts: {num, sev, component, role, summary, detail, security}."""
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    current = ("Application", "FS")  # safe default until first section header
    rows = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("## "):
            heading = stripped[3:].strip()
            for key, val in SECTION_MAP:
                if key in heading:
                    current = val
                    break
            continue
        m = ROW_RE.match(line)
        if not m:
            continue
        num, sev, body = int(m.group(1)), m.group(2), m.group(3).strip()
        component, role = current
        if any(f"`{p}`" in body for p in IT_UPGRADE_PATHS) and component == "Authentication":
            role = "IT"
        if num in IT_UPGRADE_NUMS:
            role = "IT"
        security = "Yes" if (component in ("Security", "Authentication", "Authorization", "Database")
                             or num in (109, 111, 112, 113)) else "No"

        summary, detail = _split_body(body)
        rows.append({
            "num": num, "sev": sev, "component": component, "role": role,
            "summary": summary, "detail": detail, "security": security,
        })
    return rows


def _split_body(body):
    """Split '`path` — detail' into (summary, detail). Summary = path: first clause."""
    body = body.strip()
    m = BACKTICK_FIRST.match(body)
    if m:
        path, rest = m.group(1), m.group(2)
        rest = rest.lstrip("—–- ").strip()
        first = rest.split(" — ")[0].split(";")[0].strip() if rest else ""
        summary = f"{path}: {first}" if first else path
        return _clean(summary), _clean(rest or path)
    parts = re.split(r"\s+—\s+", body, maxsplit=1)
    return _clean(parts[0]), _clean(body)


def _clean(text, limit=250):
    text = re.sub(r"\s+", " ", text).replace("`", "'").strip()
    if len(text) > limit:
        text = text[: limit - 3].rstrip() + "..."
    return text


def cr_id(num):
    return f"GM-{num:03d}"


def main():
    if not os.path.exists(SRC):
        die(f"source markdown not found: {SRC}")
    if os.path.exists(OUT):
        die(f"refusing to overwrite existing file: {OUT}")

    rows = parse_md(SRC)
    if not rows:
        die("no findings parsed from markdown")

    header = ["CR ID", "Summary", "Description", "Priority", "Component Area",
              "Security Sensitive", "Architecture Blocker", "QA Required",
              "Primary Owner", "role"]
    with open(OUT, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        for r in rows:
            w.writerow([
                cr_id(r["num"]),
                r["summary"],
                f"[{SEV_TO_LABEL[r['sev']]}] {r['detail']}",
                SEV_TO_PRIORITY[r["sev"]],
                r["component"],
                r["security"],
                "Yes" if r["sev"] == "C" else "No",
                "Yes",
                OWNER_NAMES[r["role"]],
                r["role"],
            ])

    from collections import Counter
    print(f"Wrote {len(rows)} rows -> {os.path.relpath(OUT, ROOT)}")
    print("By role:", dict(Counter(r["role"] for r in rows)))
    print("By severity:", dict(Counter(r["sev"] for r in rows)))


if __name__ == "__main__":
    sys.exit(main())
