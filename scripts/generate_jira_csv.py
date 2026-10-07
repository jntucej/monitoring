#!/usr/bin/env python3
"""jira:generate — validate source CSVs, resolve team mapping, emit Jira import CSVs.

Sources of truth:  data/*.csv (or *.txt) + team/roles_schema.csv
Generated outputs: jira/import/*.csv   (per team and per role)

Usage:
  python3 scripts/generate_jira_csv.py            # normal run
  python3 scripts/generate_jira_csv.py --init     # create config/ + examples, then exit
"""
import os
import sys
import csv
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import jira_lib as jl

EXAMPLE_TASKS = """CR ID,Summary,Issue Type,Priority,Primary Owner,Reporter,Component,Labels,Team,Feature,Story Points,Description
CR-101,Set up project repository and CI pipeline,Task,High,Akarsh,Akarsh,Gate Monitor,jira-automation;setup,Team A,Platform Setup,2,Initialize repo with CI pipeline
CR-102,Design attendance dashboard UI,Story,Medium,Akarsh,Akarsh,Frontend,ui;dashboard,Team A,Attendance Dashboard,5,Design mockups for the dashboard
CR-103,Implement attendance API endpoints,Story,High,Bhavana,Akarsh,Backend,api,Team A,Attendance Dashboard,8,Build REST endpoints for attendance
CR-104,Write test cases for attendance module,Task,Medium,Charan,Akarsh,QA,testing,Team A,Attendance Dashboard,3,Cover dashboard flows with tests
CR-105,Set up deployment pipeline,Task,High,Raghav,Akarsh,DevOps,devops;ci,Team A,Platform Setup,3,Configure deployment automation
"""

EXAMPLE_ROLES = """role,jiraName
Frontend Developer,Akarsh
Backend Developer,Bhavana
QA,Charan
DevOps,Raghav
"""

CONFIG_FILES = {
    "jira-schema.json": {
        "required_fields": ["CR ID", "Summary", "Issue Type", "Primary Owner"],
        "output_fields": ["CR ID", "Summary", "Issue Type", "Priority", "Assignee",
                          "Reporter", "Component", "Labels", "Team", "Feature",
                          "Story Points", "Description"],
        "field_constraints": {"Issue Type": ["Task", "Story", "Bug", "Epic"]},
    },
    "project.json": {
        "name": "Gate Monitor",
        "key": "GMON",
    },
    "sprints.json": {
        "sprints": [
            {"name": "Sprint 1", "state": "active"},
            {"name": "Sprint 2", "state": "future"},
            {"name": "Sprint 3", "state": "future"},
        ]
    },
}


def init_files(root_dir, config):
    """Create config/ skeleton (never overwrites existing files)."""
    cfg_dir = config["paths"]["config_dir"]
    os.makedirs(cfg_dir, exist_ok=True)
    created = []
    for fname, content in CONFIG_FILES.items():
        p = os.path.join(cfg_dir, fname)
        if not os.path.exists(p):
            with open(p, "w", encoding="utf-8") as f:
                json.dump(content, f, indent=2)
                f.write("\n")
            created.append(fname)
    roles_p = config["paths"]["roles_schema"]
    if not os.path.exists(roles_p):
        os.makedirs(os.path.dirname(roles_p), exist_ok=True)
        with open(roles_p, "w", encoding="utf-8") as f:
            f.write(EXAMPLE_ROLES)
        created.append(os.path.relpath(roles_p, root_dir))
    example_p = os.path.join(root_dir, "data", "example-tasks.csv")
    if not os.path.exists(example_p):
        os.makedirs(os.path.dirname(example_p), exist_ok=True)
        with open(example_p, "w", encoding="utf-8") as f:
            f.write(EXAMPLE_TASKS)
        created.append(os.path.relpath(example_p, root_dir))
    if created:
        print("✓ Created config files:")
        for c in created:
            print(f"  - {c}")
    else:
        print("✓ Config files already exist")


def validate_tasks(tasks, schema_errors, config):
    """Return valid_tasks, appending errors to the shared list.

    Validates *source* rows against SOURCE_COLUMNS (the input contract), not
    against output_fields — those are the generated Jira header, a different
    thing that to_automation_row() produces.
    """
    paths = config["paths"]
    schema = config["schema"]
    project_key = config["project"].get("key", "")
    required = schema.get("required_fields", jl.SOURCE_COLUMNS)
    allowed = set(jl.SOURCE_COLUMNS) | {"Team"}
    constraints = schema.get("field_constraints", {})
    role_by_name = jl.load_roles_schema(paths["roles_schema"])

    valid = []
    seen = set()  # dedupe within one output CSV — Jira import chokes on duplicates
    for i, task in enumerate(tasks, start=1):
        errs = []
        cr_id = task.get("CR ID", "").strip() or f"row-{i}"
        for field in required:
            if not task.get(field, "").strip():
                errs.append(f"{cr_id}: missing required field '{field}'")
        for field, value in task.items():
            if field not in allowed:
                errs.append(f"{cr_id}: field '{field}' not in the source schema")
            if field in constraints and value not in constraints[field]:
                errs.append(f"{cr_id}: '{field}' value '{value}' not in {constraints[field]}")
        if task.get("Primary Owner") and task["Primary Owner"] not in role_by_name:
            errs.append(f"{cr_id}: unknown Primary Owner '{task['Primary Owner']}' "
                        f"(not in {os.path.basename(paths['roles_schema'])})")
        if not project_key:
            errs.append(f"{cr_id}: config has no project key")
        if errs:
            schema_errors.extend(errs)
        else:
            key = tuple(sorted(task.items()))
            if key in seen:
                schema_errors.append(f"{cr_id}: duplicate task row — dropped from output")
            else:
                seen.add(key)
                valid.append(task)
    return valid


def _group(rows, key_fn):
    """Group rows by a key function, preserving insertion order."""
    grouped = {}
    for r in rows:
        grouped.setdefault(key_fn(r), []).append(r)
    return grouped


def write_csv(rows, fields, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    return len(rows)


def main():
    args = sys.argv[1:]
    config = jl.load_config()
    root_dir = config["root_dir"]

    if "--init" in args:
        init_files(root_dir, config)
        return 0

    paths = config["paths"]
    schema = config["schema"]
    out_fields = schema.get("output_fields", [])
    project_key = config["project"].get("key", "")
    team = jl.load_roles_schema(paths["roles_schema"])
    files = jl.discover_issue_files(config)

    print(f"Jira CSV Generator — project {project_key}")
    print("────────────────────────────────────")
    print(f"✓ Jira schema loaded ({len(out_fields)} output fields)")
    print(f"✓ {len(team)} team members loaded")

    all_valid, errors = [], []
    for issues_file in files:
        name = os.path.basename(issues_file)
        tasks, errs = jl.load_issues_file(issues_file)
        for e in errs:
            errors.append(f"{name}: {e}")
        valid = validate_tasks(tasks, errors, config)
        print(f"✓ {name}: {len(tasks)} task(s), {len(valid)} valid")
        all_valid.extend(valid)

    if errors:
        print(f"\n✗ {len(errors)} validation error(s) — no CSVs generated")
        for e in errors:
            print(f"  - {e}")
        return 1

    out_dir = paths["jira_import_dir"]
    project = config["project"]
    written = []
    # Project every validated task into its Jira-importable row shape.
    rows_all = [jl.to_automation_row(t, team, project) for t in all_valid]

    for team_name, rows in sorted(
            _group(rows_all, lambda r: r["Component Area"]).items()):
        out = os.path.join(out_dir, f"{team_name}-import.csv")
        written.append((out, write_csv(rows, out_fields, out)))

    for owner, rows in sorted(
            _group(rows_all, lambda r: r["Assignee"]).items()):
        slug = owner.lower().replace(" ", "-")
        out = os.path.join(out_dir, f"{slug}-tasks.csv")
        written.append((out, write_csv(rows, out_fields, out)))

    print("\n✓ All tasks valid — Jira import CSVs generated:")
    for path, count in written:
        print(f"  - {os.path.relpath(path, root_dir)} ({count} rows)")

    summary_path = os.path.join(out_dir, "summary.txt")
    with open(summary_path, "w", encoding="utf-8") as f:
        f.write(f"Project: {config['project'].get('name', '')} ({project_key})\n")
        f.write(f"Total tasks: {len(all_valid)}\n\n")
        f.write("Per team:\n")
        for path, count in written:
            if path.endswith("-import.csv"):
                f.write(f"  {os.path.basename(path)}: {count}\n")
        f.write("\nPer person:\n")
        for path, count in written:
            if not path.endswith("-import.csv"):
                f.write(f"  {os.path.basename(path)}: {count}\n")
    print(f"  - {os.path.relpath(summary_path, root_dir)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

