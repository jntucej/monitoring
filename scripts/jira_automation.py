#!/usr/bin/env python3
"""jira:automation — create missing jira/automation/issues_*.csv from jira/issues/*.csv.

Pipeline: discovery -> CSV parse -> validate -> role-label resolve -> field map
          -> safe create (never overwrite) -> report.

Output is restricted to the six approved Jira fields (config:
config/automation.json -> generation.output_fields):
  Summary, Description, Issue Type, Priority, Status, Labels
No Assignee. Role routing goes through Labels (QA/IT/IS/FS) only, resolved
exclusively from the source `Labels` / `role` columns — never from person
names, never via jira-team.md.

Existing automation files are user-controlled: only reported as SKIPPED,
never modified. Sources (issues/, schema/) are read-only.

Usage: python3 scripts/jira_automation.py   (npm run jira:automation)
"""
import csv
import glob
import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
CONFIG_PATH = (
    os.path.join(ROOT, "config", "automation.json")
    if os.path.exists(os.path.join(ROOT, "config", "automation.json"))
    else os.path.join(ROOT, "jira", "config", "automation.json")
)

# The complete field scope for automation CSVs. Never extend from the schema.
APPROVED_FIELDS = ["Summary", "Description", "Issue Type", "Priority", "Status", "Labels"]
APPROVED_ROLE_LABELS = ["QA", "IT", "IS", "FS"]  # canonical output order
VALID_PRIORITIES = ["P0", "P1", "P2", "P3"]

# Columns that must NEVER appear in a generated automation CSV. These are
# legacy/source columns, Jira custom fields, or assignment fields. Validated
# at write time so no future change can leak them into the output.
FORBIDDEN_FIELDS = [
    "CR ID", "Component Area", "Security Sensitive", "Architecture Blocker",
    "QA Required", "Primary Owner", "role", "Assignee", "Assignee ID",
    "Project", "Project key", "Project Key", "Project name", "Project type",
    "Issue key", "FIX", "Impact", "Agent Sessions", "Vulnerability",
    "Team", "Sprint", "Reporter", "Component/s", "Components",
    "Fix Version/s", "Affects Version/s", "Story Points", "Environment",
    "Due Date", "Start Date", "Parent", "Epic Link",
]


class ClarificationError(Exception):
    """A value cannot be mapped safely — stop, ask, create nothing."""

    def __init__(self, file, row, field, detected, expected, why):
        super().__init__(
            f"File: {file}\nRow: {row}\nField: {field}\nDetected value: {detected}\n"
            f"Expected information: {expected}\nWhy clarification is required: {why}")




# ---------- File Discovery ----------

def resolve_path(path_str):
    return path_str if os.path.isabs(path_str) else os.path.normpath(os.path.join(ROOT, path_str))


def load_config(path=None):
    if path is None:
        path = CONFIG_PATH
    if not os.path.exists(path):
        die(f"Configuration file not found: {path}")
    try:
        with open(path, "r", encoding="utf-8") as f:
            config = json.load(f)
    except Exception as e:
        die(f"Malformed JSON in {path}: {e}")

    gen = config.get("generation", {})
    if gen.get("create_only_if_missing", True) is not True:
        die("generation.create_only_if_missing must be true.")
    if gen.get("overwrite_existing", False) is not False:
        die("generation.overwrite_existing must be false — existing automation "
            "files are never modified.")
    out_fields = gen.get("output_fields", [])
    if out_fields != APPROVED_FIELDS:
        die(f"generation.output_fields must be exactly {APPROVED_FIELDS}. "
            f"Found: {out_fields}")

    paths = config.get("paths", {})
    config["resolved_paths"] = {
        "issues": resolve_path(paths.get("issues", "jira/issues")),
        "automation": resolve_path(paths.get("automation", "jira/automation")),
        "jira_schema": resolve_path(paths.get("jira_schema", "jira/schema/jira-fields.json")),
    }
    if not os.path.isdir(config["resolved_paths"]["issues"]):
        die(f"issues/ directory does not exist: {config['resolved_paths']['issues']}")
    if not os.path.exists(config["resolved_paths"]["jira_schema"]):
        die(f"Configured schema does not exist: {config['resolved_paths']['jira_schema']}")
    # roles_schema (jira-team.md) is intentionally NOT required: role labels are
    # a fixed vocabulary (QA/IT/IS/FS) resolved only from source columns.
    os.makedirs(config["resolved_paths"]["automation"], exist_ok=True)
    return config


def discover_source_files(config):
    pattern = os.path.join(config["resolved_paths"]["issues"],
                           config.get("files", {}).get("issue_pattern", "issues_*.csv"))
    return sorted(glob.glob(pattern))

def die(msg):
    print(f"ERROR: {msg}")
    sys.exit(1)




# ---------- Schemas (inspected, read-only) ----------

def inspect_schemas(config):
    """Inspect the Jira schema. The six output fields are authoritative —
    the schema never adds columns; it only confirms they exist.
    jira-team.md is deliberately not read: no person-name resolution."""

    try:
        with open(config["resolved_paths"]["jira_schema"], "r", encoding="utf-8") as f:
            raw = json.load(f)
    except Exception as e:
        die(f"Parsing Jira schema JSON: {e}")
    if isinstance(raw, list):
        names = {f.get("name") for f in raw if isinstance(f, dict)}
        missing = [f for f in APPROVED_FIELDS if f not in names]
        if missing:
            die(f"Jira schema is missing approved field(s): {missing}")
    return True


# ---------- CSV Parser ----------

def parse_source_csv(path):
    """Parse a source issues_*.csv into header-keyed row dicts.
    Raises ValueError on structural problems — no guessing."""
    name = os.path.basename(path)
    try:
        with open(path, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            try:
                header = next(reader)
            except StopIteration:
                raise ValueError(f"{name}: source CSV is empty.")
            header = [h.strip() for h in header]
            if "Summary" not in header:
                raise ValueError(f"{name}: missing required column 'Summary'")
            rows = []
            for idx, raw in enumerate(reader, start=2):
                if not any(c.strip() for c in raw):
                    continue
                if len(raw) != len(header):
                    raise ValueError(
                        f"{name}: row {idx} malformed — expected {len(header)} "
                        f"columns, got {len(raw)}")
                rows.append((idx, dict(zip(header, (c.strip() for c in raw)))))
    except OSError as e:
        raise ValueError(f"{name}: cannot read source CSV: {e}")
    if not rows:
        raise ValueError(f"{name}: source CSV contains no data rows.")
    return rows


# ---------- Validator ----------

def validate_row(name, row_num, row, defaults):
    if not row.get("Summary"):
        raise ClarificationError(name, row_num, "Summary", "(empty)", "A task summary",
                                 "Summary is required to create the Jira issue.")
    priority = row.get("Priority", "")
    if not priority:
        raise ClarificationError(name, row_num, "Priority", "(empty)",
                                 f"One of {VALID_PRIORITIES}",
                                 "Priority cannot be determined from the source row.")
    if priority not in VALID_PRIORITIES:
        raise ClarificationError(name, row_num, "Priority", priority,
                                 f"One of {VALID_PRIORITIES}",
                                 "Priority value is not part of this project's scheme.")
    issue_type = row.get("Issue Type", "") or defaults.get("Issue Type", "Task")
    if not issue_type:
        raise ClarificationError(name, row_num, "Issue Type", "(empty)",
                                 "Task / Story / Bug / Epic",
                                 "Issue Type is missing and no default is configured.")
    status = row.get("Status", "") or defaults.get("Status", "To Do")
    if not status:
        raise ClarificationError(name, row_num, "Status", "(empty)", "A Jira status",
                                 "Status cannot be determined from the source row.")
    return issue_type, status


# ---------- Role Label Resolver ----------

def resolve_labels(name, row_num, row):
    """Resolve QA/IT/IS/FS labels from source columns ONLY: `Labels`, then
    `role`. No person-name inference, no jira-team.md, no Primary Owner
    fallback — anything else requires clarification."""
    detected, source = "", ""
    labels_col = row.get("Labels", "")
    if labels_col:
        detected, source = labels_col, "Labels"
    elif row.get("role", ""):
        detected, source = row["role"], "role"

    if not detected:
        raise ClarificationError(
            name, row_num, "Labels / role", "(empty)",
            " / ".join(APPROVED_ROLE_LABELS),
            "Role labels come only from the 'Labels' or 'role' columns; neither "
            "provides a valid label, and person names are never inferred into roles.")

    wanted = [t.strip().upper() for t in detected.replace(";", ",").split(",") if t.strip()]
    bad = [t for t in wanted if t not in APPROVED_ROLE_LABELS]
    if bad:
        raise ClarificationError(
            name, row_num, source, detected, " / ".join(APPROVED_ROLE_LABELS),
            f"Value(s) {bad} do not map unambiguously to QA, IT, IS, or FS.")
    # Canonical order, deduped.
    return [label for label in APPROVED_ROLE_LABELS if label in wanted]


# ---------- Jira Field Mapper ----------

# Section labels recognized inside an explicitly labeled source Description.
# Anything the source does not provide is simply not emitted — never invented.
DESCRIPTION_SECTIONS = [
    ("Problem", ("problem", "issue", "current behavior")),
    ("Expected Behavior", ("expected behavior", "expected")),
    ("Root Cause", ("root cause",)),
    ("Proposed Solution", ("proposed solution", "solution", "fix")),
    ("Affected Files", ("affected files", "affected file paths", "file paths",
                        "files", "affected files/paths")),
    ("Implementation", ("implementation", "implementation steps", "steps")),
    ("Configuration", ("configuration", "config")),
    ("API / Database", ("api", "endpoints", "database", "table", "schema")),
    ("Security Considerations", ("security", "security considerations")),
    ("Edge Cases", ("edge cases",)),
    ("Testing", ("testing", "test", "tests", "testing instructions")),
    ("Acceptance Criteria", ("acceptance criteria",)),
    ("Deployment", ("deployment", "deployment considerations", "rollback")),
]


def _parse_labeled_description(text):
    """Split an explicitly labeled source Description into {section: body}.
    A section header is a line that is exactly a known label (optionally
    ending with ':'). Unlabeled prose is returned under key None."""
    lines = text.splitlines()
    known = {}
    for canonical, aliases in DESCRIPTION_SECTIONS:
        for alias in aliases:
            known[alias] = canonical
    sections, current, prose = {}, None, []
    for line in lines:
        stripped = line.strip().rstrip(":").strip()
        key = stripped.lower()
        if key in known and (line.strip().endswith(":") or len(line.strip().split()) <= 4):
            current = known[key]
            sections.setdefault(current, [])
        elif current is not None:
            sections[current].append(line)
        else:
            prose.append(line)
    return ("\n".join(prose).strip(),
            {k: "\n".join(v).strip() for k, v in sections.items() if "\n".join(v).strip()})


def build_description(row):
    """Preserve the source Description's technical context.

    Legacy source columns that carry technically useful information
    (CR ID, Component Area, Security Sensitive, Architecture Blocker,
    QA Required) are prepended as a context block. Primary Owner is
    deliberately excluded (never used for assignment or role inference).

    If the source Description already carries labeled sections
    (Problem:, Affected Files:, Testing:, ...), they are re-emitted under
    clean canonical headings — content copied exactly, nothing invented."""
    text = (row.get("Description", "") or "").strip()

    context_lines = []
    for col in ("CR ID", "Component Area", "Security Sensitive",
                "Architecture Blocker", "QA Required"):
        value = (row.get(col, "") or "").strip()
        if value:
            context_lines.append(f"{col}: {value}")
    context = "\n\n".join(context_lines)

    if not text:
        return context
    if not context:
        return text

    prose, sections = _parse_labeled_description(text)
    if not sections:
        return context + "\n\n" + text  # context block + verbatim prose
    # Context block first, then the structured sections.
    out = [context]
    if prose:
        out.append(prose)
    emitted = set()
    for canonical, _ in DESCRIPTION_SECTIONS:
        if canonical in sections:
            out.append(canonical)
            out.append(sections[canonical])
            emitted.add(canonical)
    for key, body in sections.items():  # any section not in canonical order
        if key not in emitted:
            out.append(key)
            out.append(body)
    return "\n\n".join(out)


def map_row(row, issue_type, status, labels):
    """Project a source row onto exactly the six approved fields.
    Description keeps the full technical context — never truncated, never
    invented. Primary Owner (if present) is ignored entirely."""
    return {
        "Summary": row.get("Summary", ""),
        "Description": build_description(row),
        "Issue Type": issue_type,
        "Priority": row.get("Priority", ""),
        "Status": status,
        "Labels": ",".join(labels),
    }


# ---------- Safe File Creator ----------

def validate_output(fields, rows, source_name):
    """Last line of defence before anything touches disk: the header must be
    exactly APPROVED_FIELDS and no forbidden/source/custom column may appear.
    Raises ValueError (never a clarification error — this is a bug guard)."""
    if list(fields) != APPROVED_FIELDS:
        raise ValueError(
            f"{source_name}: generated header must be exactly "
            f"{APPROVED_FIELDS}. Got: {list(fields)}")
    leaked = [f for f in fields if f in FORBIDDEN_FIELDS]
    if leaked:
        raise ValueError(
            f"{source_name}: generated CSV contains forbidden column(s): {leaked}. "
            "Only the six standard Jira fields are permitted.")
    for idx, row in enumerate(rows, start=2):
        extra = [k for k in row if k not in APPROVED_FIELDS]
        if extra:
            raise ValueError(
                f"{source_name}: row {idx} contains non-approved key(s): {extra}")
    return True


def write_if_missing(path, rows, fields, source_name="<output>"):
    """Create `path` only if it does not exist, atomic vs. peer processes:
    mode 'x'/O_EXCL fails if another process won the race — an existing file
    is never replaced."""
    validate_output(fields, rows, source_name)
    try:
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o644)
    except FileExistsError:
        return False
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fields, quoting=csv.QUOTE_MINIMAL)
            writer.writeheader()
            writer.writerows(rows)
    except BaseException:
        try:
            os.unlink(path)
        except OSError:
            pass
        raise
    return True


# ---------- Reporter / orchestration ----------

def automation_path(config, source_path):
    return os.path.join(config["resolved_paths"]["automation"],
                        os.path.basename(source_path))


def process_file(config, source_path):
    """Returns (status, detail); status is CREATED / SKIPPED / FAILED."""
    name = os.path.basename(source_path)
    target = automation_path(config, source_path)
    rel_target = os.path.relpath(target, ROOT)

    if os.path.exists(target):
        print(f"✓ {name}")
        print(f"  → {rel_target} already exists")
        print("  → SKIPPED")
        return "SKIPPED", "existing file left untouched"

    print(f"✓ {name}")
    print("  → validating...")
    try:
        rows = parse_source_csv(source_path)
        defaults = config.get("generation", {}).get("defaults", {})
        mapped = []
        for row_num, row in rows:
            issue_type, status = validate_row(name, row_num, row, defaults)
            labels = resolve_labels(name, row_num, row)
            mapped.append(map_row(row, issue_type, status, labels))
        validate_output(APPROVED_FIELDS, mapped, name)
    except (ClarificationError, ValueError) as e:
        print("  → CLARIFICATION REQUIRED — no file created")
        for line in str(e).splitlines():
            print(f"    {line}")
        return "FAILED", str(e)

    print("  → generating...")
    if not write_if_missing(target, mapped, APPROVED_FIELDS, name):
        # Lost a race: a peer already created it. Never replace.
        print(f"  → {rel_target} already exists")
        print("  → SKIPPED")
        return "SKIPPED", "created concurrently"
    print(f"  → CREATED {rel_target}")
    print("  Fields:")
    for field in APPROVED_FIELDS:
        print(f"    {field}")
    print("  Assignee:")
    print("    NOT USED")
    return "CREATED", f"{len(mapped)} row(s)"


def main():
    config = load_config()
    inspect_schemas(config)

    files = discover_source_files(config)
    print("Jira Automation Generator")
    print("──────────────────────────")
    print(f"Discovered source files: {len(files)}")
    print()

    counts = {"CREATED": 0, "SKIPPED": 0, "FAILED": 0}
    for source_path in files:
        status, _ = process_file(config, source_path)
        counts[status] += 1
        print()

    print("Summary")
    print("──────────────────────────")
    print(f"Discovered: {len(files)}")
    print(f"Created:    {counts['CREATED']}")
    print(f"Skipped:    {counts['SKIPPED']}")
    print(f"Failed:     {counts['FAILED']}")
    if counts["FAILED"]:
        print()
        print("Clarification is required for the failed file(s) above before "
              "their automation CSV can be created.")
        sys.exit(1)
    return 0


if __name__ == "__main__":
    sys.exit(main())

