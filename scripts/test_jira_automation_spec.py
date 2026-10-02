#!/usr/bin/env python3
"""Self-check for the six-field automation generator. No frameworks.

Run: python3 scripts/test_jira_automation_spec.py   (npm run jira:automation:test)
Covers the 8 required scenarios from jira/jira_prompt.md §24.
Exits non-zero on the first broken invariant.
"""
import contextlib
import csv
import io
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import jira_automation as ja

HEADER = "CR ID,Summary,Description,Priority,Component Area,role,Primary Owner\n"
ROW = ('CR-01,"WebAuthn scanner verifies operator, not student",'
       '"Replace scanner verification with target-bound Face ID verification API.",'
       'P0,Authentication,FS,Akarsh\n')


def make_env(tmp, sources, existing=None):
    """Build a temp jira-shaped tree: issues/ + automation/ + real schema files."""
    issues = os.path.join(tmp, "issues")
    automation = os.path.join(tmp, "automation")
    os.makedirs(issues, exist_ok=True)
    os.makedirs(automation, exist_ok=True)
    for name, content in sources.items():
        with open(os.path.join(issues, name), "w", encoding="utf-8") as f:
            f.write(content)
    for name, content in (existing or {}).items():
        with open(os.path.join(automation, name), "w", encoding="utf-8") as f:
            f.write(content)
    config = {
        "paths": {
            "issues": issues,
            "automation": automation,
            "jira_schema": ja.resolve_path("jira/schema/jira-fields.json"),
        },
        "files": {"issue_pattern": "issues_*.csv"},
        "generation": {
            "create_only_if_missing": True,
            "output_fields": ja.APPROVED_FIELDS,
            "defaults": {"Issue Type": "Task", "Status": "To Do"},
        },
        "resolved_paths": None,  # filled below (same keys as load_config)
    }
    config["resolved_paths"] = dict(config["paths"])
    return config


def run(config):
    """Run the generator pipeline over a config; return (stdout, counts)."""
    ja.inspect_schemas(config)
    buf = io.StringIO()
    counts = {"CREATED": 0, "SKIPPED": 0, "FAILED": 0}
    with contextlib.redirect_stdout(buf):
        for src in ja.discover_source_files(config):
            status, _ = ja.process_file(config, src)
            counts[status] += 1
    return buf.getvalue(), counts


def read_csv(path):
    with open(path, "r", encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        header = next(reader)
        rows = list(reader)
    return header, rows



def main():
    root_config = ja.load_config()  # the real repo config must load
    assert root_config["resolved_paths"]["issues"].endswith("jira/issues")

    # Test 1 — missing automation file -> created with exactly six fields, no Assignee.
    with tempfile.TemporaryDirectory() as tmp:
        config = make_env(tmp, {"issues_3.csv": HEADER + ROW})
        out, counts = run(config)
        assert counts == {"CREATED": 1, "SKIPPED": 0, "FAILED": 0}, counts
        target = os.path.join(tmp, "automation", "issues_3.csv")
        header, rows = read_csv(target)
        assert header == ["Summary", "Description", "Issue Type", "Priority", "Status", "Labels"], header
        assert "Assignee" not in header
        assert rows[0][2] == "Task" and rows[0][4] == "To Do" and rows[0][5] == "FS"
        # Description preserves legacy context fields + original prose verbatim.
        assert "CR ID: CR-01" in rows[0][1], rows[0][1]
        assert "Component Area: Authentication" in rows[0][1], rows[0][1]
        assert rows[0][1].endswith("Replace scanner verification with target-bound Face ID verification API."), rows[0][1]
        print("✓ Test 1: missing automation file created with six fields, no Assignee")

    # Test 2 — existing automation file -> unchanged (byte-for-byte).
    with tempfile.TemporaryDirectory() as tmp:
        existing = {"issues_3.csv": "USER CONTROLLED,NOT A JIRA CSV\nkeep,me\n"}
        config = make_env(tmp, {"issues_3.csv": HEADER + ROW}, existing)
        target = os.path.join(tmp, "automation", "issues_3.csv")
        before = open(target, "rb").read()
        out, counts = run(config)
        assert counts == {"CREATED": 0, "SKIPPED": 1, "FAILED": 0}, counts
        assert open(target, "rb").read() == before
        assert "SKIPPED" in out
        print("✓ Test 2: existing automation file skipped and unchanged")

    # Test 3 — multiple/growing numeric suffixes all discovered.
    with tempfile.TemporaryDirectory() as tmp:
        names = [f"issues_{n}.csv" for n in (1, 2, 3, 10, 25)]
        config = make_env(tmp, {n: HEADER + ROW for n in names})
        out, counts = run(config)
        assert counts["CREATED"] == 5, counts
        found = sorted(os.listdir(os.path.join(tmp, "automation")))
        assert found == sorted(names), found
        print("✓ Test 3: issues_1/2/3/10/25.csv all discovered and generated")

    # Test 4 — invalid source CSV (malformed row) -> clear error, nothing created.
    with tempfile.TemporaryDirectory() as tmp:
        bad = HEADER + "CR-01,OnlyThreeColumns\n"  # 2 of 7 columns
        config = make_env(tmp, {"issues_4.csv": bad})
        out, counts = run(config)
        assert counts["FAILED"] == 1 and counts["CREATED"] == 0, counts
        assert "malformed" in out, out
        assert not os.path.exists(os.path.join(tmp, "automation", "issues_4.csv"))
        print("✓ Test 4: malformed source rejected, no automation file created")

    # Test 5 — invalid role label (Backend) -> clarification required, nothing created.
    with tempfile.TemporaryDirectory() as tmp:
        row = ROW.replace(",FS,Akarsh", ",Backend,Akarsh")
        config = make_env(tmp, {"issues_5.csv": HEADER + row})
        out, counts = run(config)
        assert counts["FAILED"] == 1 and counts["CREATED"] == 0, counts
        assert "Backend" in out and "QA / IT / IS / FS" in out, out
        assert "CLARIFICATION REQUIRED" in out, out
        assert not os.path.exists(os.path.join(tmp, "automation", "issues_5.csv"))
        print("✓ Test 5: role 'Backend' triggers clarification, no file created")

    # Test 6 — all four approved labels accepted; multi-label normalized.
    with tempfile.TemporaryDirectory() as tmp:
        rows = "".join(
            f'CR-0{i},"Task {i}","Desc {i}",P1,Application,{lab},Akarsh\n'
            for i, lab in enumerate(["QA", "IT", "IS", "FS"], start=1))
        config = make_env(tmp, {"issues_6.csv": HEADER + rows})
        out, counts = run(config)
        assert counts["CREATED"] == 1, counts
        _, data = read_csv(os.path.join(tmp, "automation", "issues_6.csv"))
        assert [r[5] for r in data] == ["QA", "IT", "IS", "FS"], data

        # Multi-label source: order normalized to canonical QA,IT,IS,FS.
        multi = HEADER + 'CR-99,"Multi","Desc",P1,Application,"fs, qa",Akarsh\n'
        config = make_env(tmp, {"issues_6b.csv": multi})
        run(config)
        _, data = read_csv(os.path.join(tmp, "automation", "issues_6b.csv"))
        assert data[0][5] == "QA,FS", data
        print("✓ Test 6: QA/IT/IS/FS all accepted; multi-label normalized")

    # Test 7 — assignee protection: person info in source never becomes Assignee.
    with tempfile.TemporaryDirectory() as tmp:
        config = make_env(tmp, {"issues_7.csv": HEADER + ROW})  # Primary Owner: Akarsh
        run(config)
        header, data = read_csv(os.path.join(tmp, "automation", "issues_7.csv"))
        assert "Assignee" not in header and "Assignee ID" not in header
        assert all("Akarsh" not in cell and "712020:" not in cell
                   for row in data for cell in row), data
        print("✓ Test 7: no Assignee field, no Jira user resolution")

    # Test 8 — repeated execution: first CREATED, second SKIPPED, file unchanged.
    with tempfile.TemporaryDirectory() as tmp:
        config = make_env(tmp, {"issues_8.csv": HEADER + ROW})
        out1, counts1 = run(config)
        target = os.path.join(tmp, "automation", "issues_8.csv")
        blob = open(target, "rb").read()
        out2, counts2 = run(config)
        assert counts1["CREATED"] == 1 and counts2["SKIPPED"] == 1, (counts1, counts2)
        assert open(target, "rb").read() == blob
        print("✓ Test 8: idempotent — second run SKIPPED, file unchanged")

    # Config guard: output_fields in the repo config are exactly the six fields.
    assert root_config["generation"]["output_fields"] == ja.APPROVED_FIELDS
    assert root_config["generation"]["label_sources"] == ["Labels", "role"]

    # Test 9 — label source priority: `Labels` wins over `role`; role used if Labels empty.
    with tempfile.TemporaryDirectory() as tmp:
        # Labels=IT but role=QA -> Labels wins.
        conflict = HEADER.replace("role,Primary Owner", "Labels,role,Primary Owner") \
                  + 'CR-01,S,Desc,P1,App,IT,QA,Akarsh\n'
        config = make_env(tmp, {"issues_9.csv": conflict})
        run(config)
        _, data = read_csv(os.path.join(tmp, "automation", "issues_9.csv"))
        assert data[0][5] == "IT", data

        # Labels empty -> role used.
        via_role = HEADER.replace("role,Primary Owner", "Labels,role,Primary Owner") \
                   + 'CR-02,S,Desc,P1,App,,IS,Akarsh\n'
        config = make_env(tmp, {"issues_9b.csv": via_role})
        run(config)
        _, data = read_csv(os.path.join(tmp, "automation", "issues_9b.csv"))
        assert data[0][5] == "IS", data
        print("✓ Test 9: Labels column takes priority; role column is the only fallback")

    # Test 10 — no person-name inference: Primary Owner present, Labels/role empty -> clarify.
    with tempfile.TemporaryDirectory() as tmp:
        # HEADER already has role and Primary Owner columns; leave role empty.
        no_role = 'CR-01,S,Desc,P1,App,,Akarsh\n'
        config = make_env(tmp, {"issues_10.csv": HEADER + no_role})
        out, counts = run(config)
        assert counts == {"CREATED": 0, "SKIPPED": 0, "FAILED": 1}, counts
        assert "CLARIFICATION REQUIRED" in out, out
        assert "Detected value: (empty)" in out, out
        # Even a person name in the role column must not be resolved via jira-team.md.
        # Separate tmpdir so discovery only sees this one file.
    with tempfile.TemporaryDirectory() as tmp:
        named = HEADER + 'CR-02,S,Desc,P1,App,Ashwitha,Ashwitha\n'
        config = make_env(tmp, {"issues_10b.csv": named})
        out, counts = run(config)
        assert counts == {"CREATED": 0, "SKIPPED": 0, "FAILED": 1}, counts
        assert "do not map unambiguously" in out, out
        # The name was rejected, not silently converted to any label.
        assert "Detected value: Ashwitha" in out, out
        print("✓ Test 10: no Primary Owner/person-name → role inference")

    # Test 11 — structured Description: labeled source sections preserved, paths exact.
    with tempfile.TemporaryDirectory() as tmp:
        desc = ("Problem\nWebAuthn scanner accepts student credential.\n\n"
                "Expected Behavior\nOnly operators may authenticate.\n\n"
                "Affected Files\n- src/app/api/auth/route.ts\n"
                "- src/components/ScanningModal.tsx\n\n"
                "Implementation\n1. Verify credential.\n2. Reject students.\n\n"
                "Testing\n1. Test operator credential.\n2. Test student credential.")
        src = ('CR-01,"Prevent student credentials",'
               f'"{desc}",P0,Authentication,FS,Akarsh\n')
        config = make_env(tmp, {"issues_11.csv": HEADER + src})
        run(config)
        _, data = read_csv(os.path.join(tmp, "automation", "issues_11.csv"))
        body = data[0][1]
        for expected in ("Problem", "Expected Behavior", "Affected Files",
                         "Implementation", "Testing",
                         "src/app/api/auth/route.ts",
                         "src/components/ScanningModal.tsx",
                         "2. Reject students."):
            assert expected in body, (expected, body)
        # Plain prose description stays verbatim (after the context block).
        config = make_env(tmp, {"issues_11b.csv": HEADER + ROW})
        run(config)
        _, data = read_csv(os.path.join(tmp, "automation", "issues_11b.csv"))
        assert data[0][1] == ("CR ID: CR-01\n\nComponent Area: Authentication\n\n"
                              "Replace scanner verification with target-bound Face ID verification API."), data
        print("✓ Test 11: labeled Description sections preserved with exact file paths")

    # Test 12 — legacy 9-column source -> six-field output; context preserved in
    # Description; forbidden columns absent; Primary Owner fully ignored;
    # second run SKIPPED with the created file byte-identical.
    with tempfile.TemporaryDirectory() as tmp:
        # The legacy source has no Labels/role column -> clarification is the
        # correct behavior. Adding a role column (per spec) allows generation.
        legacy_header = ("CR ID,Summary,Description,Priority,Component Area,"
                         "Security Sensitive,Architecture Blocker,QA Required,"
                         "Primary Owner,role\n")
        legacy_row_no_role = ('CR-01,"Prevent student credentials from authenticating as operators",'
                              '"Validate the WebAuthn credential against the operator flow.",'
                              'P0,Authentication,Yes,Yes,Yes,Akarsh,\n')
        config = make_env(tmp, {"issues_2.csv": legacy_header + legacy_row_no_role})
        out, counts = run(config)
        # No role/Labels column data -> must ask, not guess.
        assert counts == {"CREATED": 0, "SKIPPED": 0, "FAILED": 1}, counts
        assert "CLARIFICATION REQUIRED" in out, out
        assert not os.path.exists(os.path.join(tmp, "automation", "issues_2.csv"))

        # With an explicit role value, generation succeeds with the six fields.
        legacy_row = ('CR-01,"Prevent student credentials from authenticating as operators",'
                      '"Validate the WebAuthn credential against the operator flow.",'
                      'P0,Authentication,Yes,Yes,Yes,Akarsh,FS\n')
        config = make_env(tmp, {"issues_2.csv": legacy_header + legacy_row})
        out, counts = run(config)
        assert counts == {"CREATED": 1, "SKIPPED": 0, "FAILED": 0}, counts
        target = os.path.join(tmp, "automation", "issues_2.csv")
        header, data = read_csv(target)
        # Exactly the six approved columns — none of the source/legacy ones.
        assert header == ["Summary", "Description", "Issue Type", "Priority", "Status", "Labels"], header
        for forbidden in ("CR ID", "Component Area", "Security Sensitive",
                          "Architecture Blocker", "QA Required", "Primary Owner",
                          "role", "Assignee"):
            assert forbidden not in header, forbidden
        body = data[0][1]
        # Legacy source fields preserved inside Description, per spec example.
        for expected in ("CR ID: CR-01",
                         "Component Area: Authentication",
                         "Security Sensitive: Yes",
                         "Architecture Blocker: Yes",
                         "QA Required: Yes",
                         "Validate the WebAuthn credential against the operator flow."):
            assert expected in body, (expected, body)
        # Primary Owner ignored: no person name anywhere in the row.
        assert all("Akarsh" not in cell for cell in data[0]), data[0]
        assert data[0][2] == "Task" and data[0][4] == "To Do" and data[0][5] == "FS"
        blob = open(target, "rb").read()
        # Second run: created file is skipped and byte-identical.
        out, counts = run(config)
        assert counts == {"CREATED": 0, "SKIPPED": 1, "FAILED": 0}, counts
        assert "SKIPPED" in out
        assert open(target, "rb").read() == blob
        print("✓ Test 12: legacy source → six-field output, context in Description, idempotent")

    # Test 13 — output guard: header is exactly six fields, no forbidden columns,
    # no account IDs, no person names anywhere in a generated row.
    with tempfile.TemporaryDirectory() as tmp:
        config = make_env(tmp, {"issues_13.csv": HEADER + ROW})  # Primary Owner: Akarsh
        run(config)
        header, data = read_csv(os.path.join(tmp, "automation", "issues_13.csv"))
        assert header == ja.APPROVED_FIELDS, header
        # No forbidden/source/custom/assignment column.
        for col in ja.FORBIDDEN_FIELDS:
            assert col not in header, f"forbidden column present: {col}"
        # No person name and no Jira account ID in any cell.
        for row in data:
            for cell in row:
                assert "Akarsh" not in cell, row
                assert "Ashwitha" not in cell, row
                assert "Dhanavarsha" not in cell, row
                assert "Junaid" not in cell, row
                assert "Moola" not in cell, row
                assert "712020:" not in cell, row
        print("✓ Test 13: no forbidden columns, no account IDs, no person names")

    # Test 14 — validate_output() is a real guard (rejects bad headers/rows).
    with tempfile.TemporaryDirectory() as tmp:
        good_row = {"Summary": "S", "Description": "D", "Issue Type": "Task",
                    "Priority": "P1", "Status": "To Do", "Labels": "FS"}
        # Correct header + row passes.
        assert ja.validate_output(ja.APPROVED_FIELDS, [good_row], "t") is True
        # A forbidden column in the header is rejected.
        for bad_header in (ja.APPROVED_FIELDS + ["Assignee"],
                           ja.APPROVED_FIELDS + ["CR ID"],
                           ja.APPROVED_FIELDS + ["Assignee ID"]):
            try:
                ja.validate_output(bad_header, [good_row], "t")
                raise AssertionError(f"guard accepted header: {bad_header}")
            except ValueError:
                pass
        # Extra keys on a row are rejected.
        try:
            ja.validate_output(ja.APPROVED_FIELDS, [{**good_row, "Assignee": "x"}], "t")
            raise AssertionError("guard accepted a row with Assignee")
        except ValueError:
            pass
        # A wrong header (missing/extra field) is rejected.
        try:
            ja.validate_output(["Summary", "Description"], [good_row], "t")
            raise AssertionError("guard accepted a two-field header")
        except ValueError:
            pass
        print("✓ Test 14: write-time guard rejects forbidden columns and stray keys")

    # Test 15 — role labels: only FS/QA/IS/IT accepted; nothing else is.
    with tempfile.TemporaryDirectory() as tmp:
        valid = HEADER + "".join(
            f'CR-{i},"T{i}","D{i}",P1,Application,{lab},Akarsh\n'
            for i, lab in enumerate(["FS", "QA", "IS", "IT"], start=1))
        config = make_env(tmp, {"issues_15.csv": valid})
        out, counts = run(config)
        assert counts["CREATED"] == 1, counts
        _, data = read_csv(os.path.join(tmp, "automation", "issues_15.csv"))
        assert {r[5] for r in data} == {"FS", "QA", "IS", "IT"}, data

    # Each invalid label gets its own tree so discovery sees only that one file.
    for bad in ("Backend", "Full Stack", "admin", "Akarsh", "712020:x"):
        with tempfile.TemporaryDirectory() as tmp:
            config = make_env(tmp, {"issues_15.csv": HEADER +
                                    f'CR-9,"T","D",P1,Application,{bad},Akarsh\n'})
            out, counts = run(config)
            assert counts == {"CREATED": 0, "SKIPPED": 0, "FAILED": 1}, (bad, counts)
            assert "CLARIFICATION REQUIRED" in out, (bad, out)
            assert not os.path.exists(os.path.join(
                config["resolved_paths"]["automation"], "issues_15.csv")), bad
    print("✓ Test 15: only FS/QA/IS/IT accepted; invalid labels clarify, never guess")

    print("ALL JIRA AUTOMATION (SPEC) CHECKS PASSED")


if __name__ == "__main__":
    main()
