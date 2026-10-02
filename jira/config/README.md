# Jira Automation Configuration & Documentation

This document describes the production-quality configuration system for Jira automation workflows.

## Directory Structure

```text
jira/
├── config/
│   └── automation.json      # Automation behavior & paths configuration
├── schema/
│   ├── jira-fields.json     # Authoritative Jira field definitions & custom field mappings
│   └── jira-team.md         # Authoritative team roles, display names & Jira Account IDs
├── issues/
│   └── issues_*.csv         # Input issue CSV files
└── automation/
    └── issues_*.csv         # Generated output CSV files ready for Jira import
```

---

## Configuration File (`jira/config/automation.json`)

The configuration file controls **automation behavior and settings only**. It does NOT duplicate Jira field definitions, roles, or team member identities.

### Settings Reference

| Setting | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `paths.issues` | string | `./jira/issues` | Directory where raw issue input CSVs are located. |
| `paths.automation` | string | `./jira/automation` | Directory where generated automation CSVs are saved. |
| `paths.jira_schema` | string | `./jira/schema/jira-fields.json` | Path to Jira field schema definitions. |
| `paths.roles_schema` | string | `./jira/schema/jira-team.md` | Path to team roles and Jira Account ID mappings. |
| `files.issue_pattern` | string | `issues_*.csv` | Glob pattern for discovering input issue CSV files. |
| `project.key` | string | — | Jira project key written to every row as `Project key` (required by the CSV importer). |
| `project.name` | string | — | Jira project name written to every row as `Project name` (required by the CSV importer). |
| `project.type` | string | `software` | Project type written as `Project type`; must be `software` or `business`. |
| `generation.create_only_if_missing` | boolean | `true` | When `true`, automation files are generated only if they do not already exist. |
| `generation.overwrite_existing` | boolean | `false` | When `false`, **strictly prevents overwriting** existing automation files. Must remain `false`. |
| `validation.strict` | boolean | `true` | When `true`, enables strict schema and header validation. |

---

## Separation of Concerns

1. **Automation Behavior** (`jira/config/automation.json`)
   - Controls directories, file patterns, generation flags (`overwrite_existing: false`), and strict mode.
2. **Jira Fields** (`jira/schema/jira-fields.json`)
   - Controls standard and custom field IDs, names, and types (e.g. `customfield_10110` for Security Sensitive).
3. **Team Roles & Identities** (`jira/schema/jira-team.md`)
   - Controls mapping between short CSV names (e.g., `Akarsh`), Jira Display Names, Jira Account IDs, and roles.
4. **Input Issues** (`jira/issues/issues_*.csv`)
   - Raw issue data authored by the team.
5. **Output Automation** (`jira/automation/issues_*.csv`)
   - Generated CSVs mapping input rows to exact Jira import format.

---

## When to Edit Which File

- **Want to change directories or file name patterns?** Edit `jira/config/automation.json`.
- **Want to change Jira custom field IDs or mappings?** Edit `jira/schema/jira-fields.json`.
- **Want to change the target Jira project (key / name / type)?** Edit `project` in `jira/config/automation.json` (`type` must be `software` or `business`).
- **Want to add or update team members or Jira Account IDs?** Edit `jira/schema/jira-team.md`.
- **Want to add new issues to process?** Add or edit CSV files in `jira/issues/`.
