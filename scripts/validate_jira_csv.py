#!/usr/bin/env python3
"""jira:validate — validate config, schemas, and every source issues_*.csv. Read-only."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import jira_lib as jl


def main():
    config = jl.load_config()
    paths = config["resolved_paths"]
    team = jl.load_roles_schema(paths["roles_schema"])
    files = jl.discover_issue_files(config)

    print("Jira Validator")
    print("──────────────")
    print(f"✓ Config loaded: {config['project']['key']} ({config['project']['name']})")
    print(f"✓ {len(team)} team members loaded: {', '.join(sorted(team))}")
    print(f"✓ Discovered {len(files)} source file(s)")

    total_tasks = 0
    failed = False
    for f in files:
        name = os.path.basename(f)
        tasks, errors = jl.load_issues_file(f)
        total_tasks += len(tasks)
        for t in tasks:
            if t["Primary Owner"] not in team:
                errors.append(f"CR {t['CR ID']}: unknown Primary Owner '{t['Primary Owner']}' "
                              f"(valid: {', '.join(sorted(team))})")
        ids = [t["CR ID"] for t in tasks if t["CR ID"]]
        dupes = {i for i in ids if ids.count(i) > 1}  # cross-file duplicate check is per-project
        if dupes:
            errors.append(f"duplicate CR IDs: {sorted(dupes)}")
        if errors:
            failed = True
            print(f"\n✗ {name}: {len(errors)} error(s)")
            for e in errors:
                print(f"  - {e}")
        else:
            print(f"✓ {name}: {len(tasks)}/{len(tasks)} tasks valid")

    print("\nSummary")
    print("───────")
    print(f"Tasks: {total_tasks}")
    if failed:
        print("RESULT: FAILED — fix errors above before running jira:build / jira:import")
        sys.exit(1)
    print("RESULT: ALL VALID")


if __name__ == "__main__":
    main()
