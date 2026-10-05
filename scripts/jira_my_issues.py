#!/usr/bin/env python3
"""jira:mine — list Jira issues assigned to the current user.

Reads the same creds as scripts/jira_import.py:
  JIRA_BASE_URL   e.g. https://yourteam.atlassian.net
  JIRA_EMAIL      account email
  JIRA_API_TOKEN  API token from https://id.atlassian.com/manage-profile/security/api-tokens

Usage:
  python3 scripts/jira_my_issues.py                 # issueKey | status | priority | summary
  python3 scripts/jira_my_issues.py --jql "project = CEJ AND assignee = currentUser()"
  python3 scripts/jira_my_issues.py --json          # raw JSON instead of a table
"""
import os
import sys
import json
import base64
import argparse
import urllib.request
import urllib.error

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import jira_lib as jl

# ponytail: Jira Cloud is retiring /search for /search/jql (GET /search now 410s
# for many tenants). Try the new endpoint first, fall back to the old one.
ENDPOINTS = ("/rest/api/3/search/jql", "/rest/api/3/search")
TABLE_FIELDS = "summary,status,priority,assignee,project,labels"


def http_json(url, auth, timeout=30):
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", auth)
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        return e.code, {"errorMessages": [detail]}
    except urllib.error.URLError as e:
        return 0, {"errorMessages": [str(e)]}


def fetch(base_url, auth, jql, fields=TABLE_FIELDS):
    """Return (issues, error). Tries the new JQL endpoint, then the legacy one."""
    from urllib.parse import urlencode

    last_err = None
    for endpoint in ENDPOINTS:
        query = urlencode({"jql": jql, "maxResults": 100, "fields": fields})
        status, body = http_json(f"{base_url}{endpoint}?{query}", auth)
        if status == 200:
            return body.get("issues", []), None
        last_err = f"{status}: " + "; ".join(body.get("errorMessages", []) or [str(body)])
    return [], last_err


def main():
    parser = argparse.ArgumentParser(description="List Jira issues assigned to the current user")
    parser.add_argument("--jql", default="assignee = currentUser() ORDER BY priority ASC, key ASC",
                        help="JQL query (default: assignee = currentUser())")
    parser.add_argument("--json", action="store_true", help="Print raw JSON")
    args = parser.parse_args()

    base_url = os.environ.get("JIRA_BASE_URL", "").rstrip("/")
    email = os.environ.get("JIRA_EMAIL", "")
    token = os.environ.get("JIRA_API_TOKEN", "")
    if not (base_url and email and token) or base_url.startswith("https://your-domain"):
        jl.die("Set JIRA_BASE_URL, JIRA_EMAIL and JIRA_API_TOKEN (real values, not placeholders).")

    auth = "Basic " + base64.b64encode(f"{email}:{token}".encode()).decode()
    issues, err = fetch(base_url, auth, args.jql)
    if err:
        jl.die(f"Jira query failed: {err}")

    if args.json:
        print(json.dumps(issues, indent=2))
        return

    print(f"JQL: {args.jql}")
    print(f"{len(issues)} issue(s)\n")
    if not issues:
        return
    print(f"{'KEY':<10} {'STATUS':<14} {'PRIORITY':<10} SUMMARY")
    print("-" * 90)
    for it in issues:
        f = it.get("fields", {})
        key = it.get("key", "?")
        status = (f.get("status") or {}).get("name", "-")
        priority = (f.get("priority") or {}).get("name", "-")
        summary = (f.get("summary") or "").replace("\n", " ")[:60]
        print(f"{key:<10} {status:<14} {priority:<10} {summary}")


if __name__ == "__main__":
    main()
