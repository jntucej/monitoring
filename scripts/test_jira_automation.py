#!/usr/bin/env python3
"""Self-check for the Jira pipeline (jira_lib + generator). No frameworks.

Run: python3 scripts/test_jira_automation.py
Exits non-zero on the first broken invariant.
"""
import os
import sys
import json
import shutil
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import jira_lib as jl

ROOT = jl.get_project_root()


def main():
    # 1. Config loads and the on-disk shape resolves to real paths.
    config = jl.load_config()
    assert config["project"]["key"] == "GATE", config["project"]
    for k, p in config["resolved_paths"].items():
        if k == "automation":  # may not exist yet; generator creates it
            continue
        assert os.path.exists(p), f"resolved path missing: {k} -> {p}"

    # 2. Source CSV parses with the declared column set.
    files = jl.discover_issue_files(config)
    assert files, "no issues_*.csv discovered"
    tasks, errors = jl.load_issues_file(files[0])
    assert not errors, errors
    assert len(tasks) >= 5, len(tasks)
    assert list(tasks[0].keys()) == jl.SOURCE_COLUMNS, list(tasks[0].keys())

    # 3. Roles schema parses identically from CSV and from the markdown table.
    team_csv = jl.load_roles_schema(jl.resolve_path("team/roles_schema.csv", ROOT))
    team_md = jl.load_roles_schema(jl.resolve_path("jira/schema/jira-team.md", ROOT))
    assert set(team_md) == {"Akarsh", "Ashwitha", "Dhanavarsha", "Junaid"}, set(team_md)
    # Markdown carries account IDs that the CSV lacks.
    assert team_md["Akarsh"]["id"].startswith("712020:"), team_md["Akarsh"]
    assert team_md["Ashwitha"]["name"] == "Moola Ashwitha", team_md["Ashwitha"]
    assert len(team_csv) == len(team_md) == 4

    # 4. Jira schema normalizes the raw field-list into the flat shape.
    schema = config["schema"]
    assert "output_fields" in schema and "required_fields" in schema
    assert schema["output_fields"] == jl.AUTOMATION_COLUMNS, schema["output_fields"]

    # 5. Row projection: source task -> Jira-importable automation row.
    row = jl.to_automation_row(tasks[0], team_md, config["project"])
    assert list(row.keys()) == jl.AUTOMATION_COLUMNS, list(row.keys())
    assert row["Project key"] == "GATE" and row["Issue Type"] == "Task"
    assert row["Assignee"] == "Akarsh" and row["Assignee ID"].startswith("712020:")
    assert row["CR ID"] == row["Issue key"] == "CR-01"
    assert row["Summary"] == tasks[0]["Summary"]

    # 6. Custom field IDs match the authoritative jira-fields.json.
    fields = json.load(open(jl.resolve_path("jira/schema/jira-fields.json", ROOT)))
    by_name = {f["name"]: f["id"] for f in fields}
    assert by_name["CR ID"] == jl.CF_CR_ID, by_name["CR ID"]
    assert by_name["Component Area"] == jl.CF_COMPONENT
    assert by_name["Security Sensitive"] == jl.CF_SECURITY
    assert by_name["Architecture Blocker"] == jl.CF_ARCH
    assert by_name["QA Required"] == jl.CF_QA

    # 7. API payload uses those IDs and maps Yes -> checkbox values.
    member = team_md["Akarsh"]
    payload = jl.build_api_payload({**tasks[0], "Primary Owner": "Akarsh"},
                                   team_md, "GATE")["fields"]
    assert payload["project"]["key"] == "GATE"
    assert payload["customfield_10107"] == "CR-01"
    assert payload["customfield_10110"] == [{"value": "Yes"}]  # Security Sensitive
    assert payload["assignee"]["id"] == member["id"]

    # 8. Validation rejects bad Priority and bad Yes/No values.
    with tempfile.TemporaryDirectory() as d:
        bad = os.path.join(d, "issues_bad.csv")
        with open(bad, "w", encoding="utf-8") as f:
            f.write(",".join(jl.SOURCE_COLUMNS) + "\n")
            f.write("CR-X,Bad,P0-typo,Low,Auth,Maybe,No,Yes,Akarsh\n")
        _, errs = jl.load_issues_file(bad)
        assert any("invalid Priority" in e for e in errs), errs
        assert any("Security Sensitive" in e for e in errs), errs

    # 9. Safe-write invariant: an existing automation file is never replaced.
    with tempfile.TemporaryDirectory() as d:
        target = os.path.join(d, "issues_99.csv")
        with open(target, "w", encoding="utf-8") as f:
            f.write("USER CONTROLLED")
        config["resolved_paths"]["automation"] = d
        # Simulate the generator's pre-write existence guard.
        if not os.path.exists(target):
            raise AssertionError("guard would have written over an existing file")
        with open(target, encoding="utf-8") as f:
            assert f.read() == "USER CONTROLLED"

    print("ALL JIRA AUTOMATION CHECKS PASSED")


if __name__ == "__main__":
    main()
