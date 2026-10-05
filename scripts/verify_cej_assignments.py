#!/usr/bin/env python3
"""Verify CEJ assignment/routing distribution. Read-only. Run with JIRA_* env."""
import base64
import collections
import json
import os
import urllib.parse
import urllib.request

JB = os.environ["JIRA_BASE_URL"].rstrip("/")
JE = os.environ["JIRA_EMAIL"]
JT = os.environ["JIRA_API_TOKEN"]
auth = "Basic " + base64.b64encode(f"{JE}:{JT}".encode()).decode()

counts = collections.Counter()
labels = collections.Counter()
prio = collections.Counter()
tok = None
total = 0
while True:
    q = urllib.parse.quote("project=CEJ ORDER BY created ASC")
    url = f"{JB}/rest/api/3/search/jql?jql={q}&maxResults=100&fields=assignee,labels,priority"
    if tok:
        url += "&nextPageToken=" + tok
    req = urllib.request.Request(url)
    req.add_header("Authorization", auth)
    d = json.load(urllib.request.urlopen(req))
    for i in d.get("issues", []):
        f = i["fields"]
        counts[(f.get("assignee") or {}).get("displayName", "UNASSIGNED")] += 1
        prio[(f.get("priority") or {}).get("name", "?")] += 1
        for l in f.get("labels", []):
            labels[l] += 1
        total += 1
    tok = d.get("nextPageToken")
    if d.get("isLast") or not tok:
        break

print("TOTAL CEJ issues:", total)
print("BY ASSIGNEE:")
for k, v in counts.most_common():
    print(f"  {k}: {v}")
print("BY LABEL:", dict(labels))
print("BY PRIORITY:", dict(prio))
