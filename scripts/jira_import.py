#!/usr/bin/env python3
"""jira:import — push validated source CSVs to Jira via REST API v3.

Credentials (env vars):
  JIRA_BASE_URL   e.g. https://yourteam.atlassian.net
  JIRA_EMAIL      account email
  JIRA_API_TOKEN  API token from https://id.atlassian.com/manage-profile/security/api-tokens

Usage:
  python3 scripts/jira_import.py            # dry run: print payloads, create nothing
  python3 scripts/jira_import.py --apply    # actually create issues
"""
import os
import sys
import json
import base64
import csv
import urllib.request
import urllib.error
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import jira_lib as jl

STATE_FILE = "jira/automation/import-state.json"  # basename -> {cr_id: issue_key}


def http_json(url, method, body, auth_header, timeout=30):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", auth_header)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            text = resp.read().decode("utf-8")
            return resp.status, json.loads(text) if text else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        return e.code, {"errorMessages": [detail]}
    except urllib.error.URLError as e:
        return 0, {"errorMessages": [str(e)]}


def load_state(root_dir):
    p = os.path.join(root_dir, STATE_FILE)
    if os.path.exists(p):
        try:
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def save_state(root_dir, state):
    p = os.path.join(root_dir, STATE_FILE)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, sort_keys=True)


def main():
    parser = argparse.ArgumentParser(description="Push source issue CSVs to Jira (REST API v3)")
    parser.add_argument("--apply", action="store_true", help="Actually create issues (default: dry run)")
    args = parser.parse_args()

    config = jl.load_config()
    paths = config["resolved_paths"]
    project_key = config["project"]["key"]
    team = jl.load_roles_schema(paths["roles_schema"])
    files = jl.discover_issue_files(config)

    base_url = os.environ.get("JIRA_BASE_URL", "").rstrip("/")
    email = os.environ.get("JIRA_EMAIL", "")
    token = os.environ.get("JIRA_API_TOKEN", "")
    if args.apply and not (base_url and email and token):
        jl.die("Set JIRA_BASE_URL, JIRA_EMAIL and JIRA_API_TOKEN env vars to use --apply.")
    auth = "Basic " + base64.b64encode(f"{email}:{token}".encode()).decode()

    mode = "APPLY (will create issues)" if args.apply else "DRY RUN (no issues will be created)"
    print(f"Jira Import — {mode}")
    print("────────────────────────────")
    if args.apply:
        print(f"Target: {base_url} (project {project_key})")

    state = load_state(config["root_dir"])
    total_created = total_skipped = total_failed = 0

    for issues_file in files:
        name = os.path.basename(issues_file)
        tasks, errors = jl.load_issues_file(issues_file)
        for t in tasks:
            if t["Primary Owner"] not in team:
                errors.append(f"CR {t['CR ID']}: unknown Primary Owner '{t['Primary Owner']}'")
        if errors:
            print(f"\n✗ {name}: {len(errors)} validation error(s) — file skipped")
            for e in errors:
                print(f"  - {e}")
            total_failed += len(errors)
            continue

        file_state = state.setdefault(name, {})
        created = skipped = failed = 0
        print(f"\n✓ {name}: {len(tasks)} task(s)")
        for row_num, t in enumerate(tasks, start=2):
            cr = t["CR ID"] or f"row-{row_num}"
            if file_state.get(cr):
                print(f"  → {cr}: already imported as {file_state[cr]} — SKIPPED")
                skipped += 1
                continue
            payload = jl.build_api_payload(t, team, project_key)
            account_id = payload.pop("_account_id")
            if not args.apply:
                who = t["Primary Owner"]
                print(f"  → {cr}: [dry run] would create Task for {who}")
                continue
            status, resp = http_json(f"{base_url}/rest/api/3/issue", "POST", payload, auth)
            if status in (200, 201) and resp.get("key"):
                file_state[cr] = resp["key"]
                print(f"  → {cr}: CREATED {resp['key']}")
                created += 1
            else:
                msg = "; ".join(resp.get("errorMessages", [])) or str(resp.get("errors", resp))
                print(f"  → {cr}: FAILED ({status}): {msg[:300]}")
                failed += 1

        total_created += created
        total_skipped += skipped
        total_failed += failed

    if args.apply:
        save_state(config["root_dir"], state)

    print("\nSummary")
    print("───────")
    print(f"Created: {total_created}  Skipped (already imported): {total_skipped}  Failed: {total_failed}")
    if not args.apply:
        print("This was a dry run. Re-run with --apply (and JIRA_* env vars set) to create issues.")
    if total_failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
