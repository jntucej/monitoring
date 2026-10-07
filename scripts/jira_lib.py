"""""""""Shared library for Jira automation: config, schemas, CSV parsing, task model.

Single source of truth for jira:validate / jira:build / jira:import.

Deployed shape (full architecture):
  config/
    automation.json      # paths + project (source of truth for where things live)
    jira-schema.json     # Jira schema: required fields, output fields, constraints
    project.json         # project name/key (exportable later)
    roles_schema.csv     # role,jiraName (one row per team member)
  data/
    *.csv                # task input files (any file here is discovered)
  jira/import/
    *.csv                # generated CSVs ready for Jira import
    summary.txt          # per-team + per-person breakdown

Legacy GATE shape is no longer supported.
"""""""""
import os
import glob
import csv
import json
import sys

DEFAULT_CONFIG_PATH = "jira/config/automation.json"

# Source issues_*.csv layout (authored by the team).
SOURCE_COLUMNS = [
    "CR ID", "Summary", "Description", "Priority",
    "Component Area", "Security Sensitive", "Architecture Blocker",
    "QA Required", "Primary Owner",
]

# Values Jira accepts for `priority.name`. P0..P3 are this project's scheme.
VALID_PRIORITIES = ["P0", "P1", "P2", "P3"]

# Source columns that must be literally "Yes" or "No" (mapped to Jira checkboxes).
YES_NO_FIELDS = ["Security Sensitive", "Architecture Blocker", "QA Required"]

# Custom field IDs, resolved from jira/schema/jira-fields.json (authoritative).
CF_CR_ID = "customfield_10107"
CF_COMPONENT = "customfield_10109"
CF_SECURITY = "customfield_10110"
CF_ARCH = "customfield_10111"
CF_QA = "customfield_10112"

# Automation CSV header: the exact shape Jira's CSV importer accepts
# (see the reference jira/automation/issues_1.csv).
AUTOMATION_COLUMNS = [
    "Project key", "Project name", "Project type", "Issue key",
    "Summary", "Description", "Issue Type", "Priority",
    "Component Area", "Security Sensitive", "Architecture Blocker", "QA Required",
    "CR ID", "Assignee", "Assignee ID",
]


def to_automation_row(task, team, project):
    """Project a validated source task into a Jira-importable automation row.

    `team` is the roles map (csv_name -> {name, id, role}); `project` is the
    normalized {key, name, type} dict from load_config().
    """
    owner = task.get("Primary Owner", "")
    member = team.get(owner, {})
    return {
        "Project key": project["key"],
        "Project name": project["name"],
        "Project type": project["type"],
        "Issue key": task.get("CR ID", ""),
        "Summary": task.get("Summary", ""),
        "Description": task.get("Description", ""),
        "Issue Type": "Task",
        "Priority": task.get("Priority", ""),
        "Component Area": task.get("Component Area", ""),
        "Security Sensitive": task.get("Security Sensitive", ""),
        "Architecture Blocker": task.get("Architecture Blocker", ""),
        "QA Required": task.get("QA Required", ""),
        "CR ID": task.get("CR ID", ""),
        "Assignee": member.get("name", owner),
        "Assignee ID": member.get("id", ""),
    }


def die(msg):
    print(f"ERROR: {msg}")
    sys.exit(1)


def load_automation_config(config_path=DEFAULT_CONFIG_PATH):
    """Load raw automation.json (full-shape: paths + project)."""
    root_dir = get_project_root()
    abs_config_path = resolve_path(config_path, root_dir)
    if not os.path.exists(abs_config_path):
        die(f"Configuration file not found:\n{config_path} (resolved: {abs_config_path})")
    try:
        with open(abs_config_path, "r", encoding="utf-8") as f:
            return json.load(f), root_dir
    except Exception as e:
        die(f"Malformed JSON in configuration file {abs_config_path}: {e}")


def get_project_root():
    # Repository root = parent of scripts/ (this script lives in <root>/scripts/)
    return os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))


def resolve_path(path_str, root_dir):
    # Relative paths are resolved against the repo root, never the CWD.
    if os.path.isabs(path_str):
        return path_str
    return os.path.normpath(os.path.join(root_dir, path_str))



def load_config(config_path=DEFAULT_CONFIG_PATH):
    root_dir = get_project_root()
    abs_config_path = resolve_path(config_path, root_dir)

    if not os.path.exists(abs_config_path):
        die(f"Configuration file not found:\n{config_path} (resolved: {abs_config_path})")

    try:
        with open(abs_config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
    except Exception as e:
        die(f"Malformed JSON in configuration file {abs_config_path}: {e}")

    generation = config.get("generation", {})
    if generation.get("overwrite_existing", False) is not False:
        die("automation.overwrite_existing must be false for safety. Found: "
            f"{generation.get('overwrite_existing')}")
    if generation.get("create_only_if_missing", True) is not True:
        die("automation.create_only_if_missing must be true. Found: "
            f"{generation.get('create_only_if_missing')}")

    # Jira's CSV importer requires Project key, Project name and Project type on every row.
    project = config.get("project", {})
    if not project.get("key") or not project.get("name"):
        die("automation.project.key and automation.project.name are required for Jira CSV import.")
    if project.get("type", "software") not in ("software", "business"):
        die(f"automation.project.type must be 'software' or 'business'. Found: {project.get('type')}")
    config["project"] = {"key": project["key"], "name": project["name"], "type": project.get("type", "software")}

    paths = config.get("paths", {})
    resolved_paths = {
        "issues": resolve_path(paths.get("issues") or paths.get("data_dir", "data/jira"), root_dir),
        "automation": resolve_path(paths.get("automation") or paths.get("jira_import_dir", "jira/import"), root_dir),
        "jira_schema": resolve_path(paths.get("jira_schema", "config/jira/jira-schema.json"), root_dir),
        "roles_schema": resolve_path(paths.get("roles_schema", "team/roles_schema.csv"), root_dir),
        "jira_import_dir": resolve_path(paths.get("jira_import_dir", "jira/import"), root_dir),
    }

    for key in ["jira_schema", "roles_schema"]:
        if not os.path.exists(resolved_paths[key]):
            die(f"Configured schema does not exist:\n{resolved_paths[key]}")

    config["resolved_paths"] = resolved_paths
    config["root_dir"] = root_dir
    config["schema"] = load_jira_schema(resolved_paths["jira_schema"])
    config["paths"]["roles_schema"] = resolved_paths["roles_schema"]
    config["paths"]["jira_import_dir"] = resolved_paths["jira_import_dir"]
    return config


def load_jira_schema(jira_schema_path):
    """Load the Jira schema. Accepts either the flat schema object
    ({required_fields, output_fields, field_constraints}) or the raw Jira
    field-definition list from /rest/api/3/field (normalized to the flat shape)."""
    try:
        with open(jira_schema_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except Exception as e:
        die(f"Parsing Jira schema JSON: {e}")

    if isinstance(raw, list):
        # Raw Jira field list: keep only the field names that are actually
        # meaningful to a CSV import. Jira rejects unknown columns, so we do
        # NOT dump the whole /rest/api/3/field catalog.
        return {
            "required_fields": ["CR ID", "Summary", "Primary Owner"],
            "output_fields": AUTOMATION_COLUMNS,
            "field_constraints": {"Issue Type": ["Task", "Story", "Bug", "Epic"]},
            "fields": raw,
        }
    if not isinstance(raw, dict):
        die(f"Jira schema at {jira_schema_path} must be a JSON object or field list.")
    return raw


def load_roles_schema(roles_schema_path):
    """Parse team members from either a CSV (role,jiraName[,accountId]) or the
    markdown table in jira/schema/jira-team.md. Returns {csv_name: {name, id, role}}."""
    team = {}
    try:
        with open(roles_schema_path, "r", encoding="utf-8") as f:
            lines = [l.rstrip("\n") for l in f]

        if roles_schema_path.endswith(".md"):
            # Markdown table: | CSV Name | Jira Display Name | Jira Account ID | Role |
            for line in lines:
                s = line.strip()
                if not s.startswith("|") or "---" in s or "CSV Name" in s:
                    continue
                parts = [p.strip() for p in s.split("|")[1:-1]]
                if len(parts) >= 3:
                    team[parts[0]] = {
                        "name": parts[1],
                        "id": parts[2].replace("`", "").strip(),
                        "role": parts[3] if len(parts) > 3 else "",
                    }
        else:
            # CSV: header row then data rows.
            entries = [l for l in lines if l.strip() and not l.lstrip().startswith("#")]
            if entries:
                header = [h.strip().lower() for h in next(csv.reader([entries[0]]))]
                for row_line in entries[1:]:
                    parts = next(csv.reader([row_line]))
                    parts = [p.strip() for p in parts]
                    if len(parts) < len(header):
                        parts += [""] * (len(header) - len(parts))
                    row = dict(zip(header, parts))
                    csv_name = row.get("role") or row.get("csv name") or ""
                    if not csv_name:
                        continue
                    team[csv_name] = {
                        "name": row.get("jiraname") or row.get("jira name") or row.get("name") or csv_name,
                        "id": row.get("accountid") or row.get("account id") or row.get("jira account id") or "",
                        "role": row.get("role") or "",
                    }
    except Exception as e:
        die(f"Error parsing roles schema: {e}")
    if not team:
        die(f"Could not parse any team members from roles schema at {roles_schema_path}.")
    return team


def discover_issue_files(config):
    issues_dir = config["resolved_paths"]["issues"]
    if not os.path.exists(issues_dir):
        die(f"Configured issues directory does not exist:\n{issues_dir}")
    pattern = os.path.join(issues_dir, config.get("files", {}).get("issue_pattern", "issues_*.csv"))
    return sorted(glob.glob(pattern))



def load_issues_file(issues_file):
    """Parse a source issues_*.csv into task dicts. Returns (tasks, errors).

    errors is non-empty when any row failed validation; callers must not
    generate or import from a file with errors.
    """
    errors = []
    tasks = []
    try:
        with open(issues_file, mode="r", encoding="utf-8") as fin:
            reader = csv.reader(fin)
            try:
                header = next(reader)
            except StopIteration:
                die(f"{os.path.basename(issues_file)}: source CSV is empty.")
            for col in SOURCE_COLUMNS:
                if col not in header:
                    die(f"{os.path.basename(issues_file)}: missing required column '{col}'")
            rows = list(reader)
    except OSError as e:
        die(f"Reading source CSV {issues_file}: {e}")

    if not rows:
        die(f"{os.path.basename(issues_file)}: source CSV contains no data rows.")

    seen_ids = set()
    for idx, row in enumerate(rows, start=2):
        row = [c.strip() for c in row]
        if len(row) < len(SOURCE_COLUMNS):
            errors.append(f"Row {idx}: malformed (expected {len(SOURCE_COLUMNS)} columns, got {len(row)})")
            continue
        task = dict(zip(SOURCE_COLUMNS, row))
        label = f"Row {idx} ({task['CR ID'] or 'no CR ID'})"
        if not task["Summary"]:
            errors.append(f"{label}: Summary is empty")
        if task["Priority"] not in VALID_PRIORITIES:
            errors.append(f"{label}: invalid Priority '{task['Priority']}' (expected one of {VALID_PRIORITIES})")
        for yn in YES_NO_FIELDS:
            if task[yn] not in ("Yes", "No"):
                errors.append(f"{label}: {yn} must be 'Yes' or 'No', got '{task[yn]}'")
        if task["CR ID"]:
            if task["CR ID"] in seen_ids:
                errors.append(f"{label}: duplicate CR ID '{task['CR ID']}' in this file")
            seen_ids.add(task["CR ID"])
        tasks.append(task)
    return tasks, errors


def build_api_payload(task, team, project_key, issue_type="Task"):
    """Build a Jira REST API v3 create-issue payload from a validated source task."""
    owner = team.get(task["Primary Owner"])
    account_id = owner["id"] if owner else ""
    fields = {
        "project": {"key": project_key},
        "issuetype": {"name": issue_type},
        "summary": task["Summary"],
        "description": {
            "type": "doc", "version": 1,
            "content": [{"type": "paragraph",
                         "content": [{"type": "text", "text": task["Description"]}]}],
        },
        "priority": {"name": task["Priority"]},
        CF_COMPONENT: {"value": task["Component Area"]},
        CF_CR_ID: task["CR ID"],
    }
    for cf, col in ((CF_SECURITY, "Security Sensitive"),
                    (CF_ARCH, "Architecture Blocker"),
                    (CF_QA, "QA Required")):
        if task[col] == "Yes":
            fields[cf] = [{"value": "Yes"}]
    if account_id:
        fields["assignee"] = {"id": account_id}
    return {"fields": fields, "_account_id": account_id}

