#!/usr/bin/env python3
"""Create CEJ issues from jira/automation/issues_*.csv via Jira REST API v3.

This workspace's CEJ project uses standard Jira fields and the standard
priority scheme (Highest/High/Medium/Low), NOT the repo's legacy P0..P3 +
customfield_* payload that scripts/jira_import.py targets. This importer maps
to standard fields only and assigns by accountId, matching the team table in
jira/schema/jira-team.md.

Routing: Label (IT/FS/IS/QA) -> assignee account id.
  IT -> Akarsh | FS -> Moola Ashwitha | IS -> Djengo | QA -> Dhanavarsha Ponnala

Idempotent: a per-file state file (jira/automation/cej-import-state.json) records
created issue keys so re-runs skip already-created rows. --apply required to
actually create; default is a dry run.

Env: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN (or --base-url/--email/--token).
"""
import argparse
import base64
import csv
import glob
import json
import os
import sys
import urllib.error
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
AUTOMATION_DIR = os.path.join(ROOT, "jira", "automation")
STATE_FILE = os.path.join(AUTOMATION_DIR, "cej-import-state.json")
PROJECT_KEY = "CEJ"

# Label -> (assignee accountId, display name) from jira/schema/jira-team.md.
ROLE_TO_ACCOUNT = {
    "IT": ("712020:16a67b9d-d582-46a5-af1e-970b5490a0f3", "Akarsh"),
    "FS": ("712020:15669266-bf45-44f9-b682-e91570a97e1e", "Moola Ashwitha"),
    "IS": ("712020:ed627590-0379-4530-9e33-3461ca83db0c", "Djengo"),
    "QA": ("712020:70c9a8e5-066f-4717-89d0-6073d0190dc5", "Dhanavarsha Ponnala"),
}

# repo source priority -> standard Jira priority name
PRIORITY_MAP = {"P0": "Highest", "P1": "High", "P2": "Medium", "P3": "Low"}

ISSUE_TYPE = "Task"


def die(msg):
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def http_json(url, method, body, auth, timeout=30):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", auth)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            text = resp.read().decode("utf-8")
            return resp.status, (json.loads(text) if text else {})
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(detail)
        except Exception:
            return e.code, {"errorMessages": [detail]}
    except urllib.error.URLError as e:
        return 0, {"errorMessages": [str(e)]}



def adf_paragraphs(text):
    """Turn plain text (with blank-line paragraph breaks) into an ADF doc."""
    content = []
    for block in text.split("\n\n"):
        block = block.strip()
        if not block:
            continue
        content.append({"type": "paragraph", "content": [{"type": "text", "text": block}]})
    if not content:
        content = [{"type": "paragraph", "content": [{"type": "text", "text": ""}]}]
    return {"type": "doc", "version": 1, "content": content}


def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def save_state(state):
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, sort_keys=True)


def iter_rows(only=None):
    """Yield (basename, row_number, row) for every automation CSV.

    `only` (e.g. "issues_3.csv") restricts to a single file when given.
    """
    for path in sorted(glob.glob(os.path.join(AUTOMATION_DIR, "issues_*.csv"))):
        base = os.path.basename(path)
        if only and base != only:
            continue
        with open(path, "r", encoding="utf-8", newline="") as f:
            for i, row in enumerate(csv.DictReader(f), start=2):
                yield base, i, row


def build_payload(row):
    labels = [x.strip() for x in row.get("Labels", "").split(",") if x.strip()]
    assignee = None
    for label in labels:
        if label in ROLE_TO_ACCOUNT:
            assignee = ROLE_TO_ACCOUNT[label][0]
            break
    fields = {
        "project": {"key": PROJECT_KEY},
        "issuetype": {"name": ISSUE_TYPE},
        "summary": row["Summary"][:250],
        "description": adf_paragraphs(row.get("Description", "")),
        "priority": {"name": PRIORITY_MAP.get(row.get("Priority", ""), "Medium")},
    }
    if labels:
        fields["labels"] = labels
    if assignee:
        fields["assignee"] = {"id": assignee}
    return {"fields": fields}


def main():
    ap = argparse.ArgumentParser(description="Create CEJ issues from automation CSVs")
    ap.add_argument("--apply", action="store_true", help="actually create (default: dry run)")
    ap.add_argument("--base-url", default=os.environ.get("JIRA_BASE_URL", ""))
    ap.add_argument("--email", default=os.environ.get("JIRA_EMAIL", ""))
    ap.add_argument("--token", default=os.environ.get("JIRA_API_TOKEN", ""))
    ap.add_argument("--file", default=None, help="only import this automation csv (e.g. issues_3.csv)")
    args = ap.parse_args()

    base = args.base_url.rstrip("/")
    if not base or base.startswith("https://your-domain"):
        die("Set JIRA_BASE_URL (e.g. https://djsnakeflow99.atlassian.net).")
    if args.apply and not (args.email and args.token):
        die("Set JIRA_EMAIL and JIRA_API_TOKEN to use --apply.")
    auth = "Basic " + base64.b64encode(f"{args.email}:{args.token}".encode()).decode()

    state = load_state()
    rows = list(iter_rows(args.file))
    mode = "APPLY" if args.apply else "DRY RUN"
    print(f"CEJ importer — {mode} | project {PROJECT_KEY} | {len(rows)} rows across automation/*.csv")

    created = skipped = failed = 0
    for base_name, row_num, row in rows:
        key = f"{base_name}#{row_num}"
        if state.get(key):
            skipped += 1
            continue
        payload = build_payload(row)
        fields = payload["fields"]
        who = fields.get("assignee", {}).get("id", "unassigned")
        if not args.apply:
            print(f"  → {key}: would create '{row['Summary'][:60]}' "
                  f"[{row.get('Labels','')} -> {who}] pri={fields['priority']['name']}")
            continue
        status, resp = http_json(f"{base}/rest/api/3/issue", "POST", payload, auth)
        if status in (200, 201) and resp.get("key"):
            state[key] = resp["key"]
            created += 1
            print(f"  → {key}: CREATED {resp['key']}")
        else:
            failed += 1
            msg = "; ".join(resp.get("errorMessages", [])) or json.dumps(resp.get("errors", resp))
            print(f"  → {key}: FAILED ({status}) {msg[:200]}")

    if args.apply:
        save_state(state)
    print(f"\nCreated: {created}  Skipped: {skipped}  Failed: {failed}")
    if not args.apply:
        print("Dry run only. Re-run with --apply to create issues.")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
