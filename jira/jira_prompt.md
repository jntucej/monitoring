# Build: Jira Issues → Automation CSV Generator

You are implementing a production-quality local automation system for a Jira project repository.

The system manages the relationship between:

```text
issues/
automation/
schema/
```

The `issues/` directory contains CSV files defining Jira tasks.

For every:

```text
issues/issues_*.csv
```

there should eventually be a corresponding:

```text
automation/issues_*.csv
```

The automation utility must create the corresponding automation file **ONLY when it is missing**.

---

# 1. Core Objective

The system must:

1. Dynamically discover every `issues_*.csv`.
2. Check whether the matching `automation/issues_*.csv` already exists.
3. Skip existing automation files.
4. Generate only missing automation files.
5. Never overwrite, modify, merge, regenerate, rename, or delete an existing automation file.
6. Use only the Jira default fields defined in this specification.
7. Use **Labels** for team/role routing.
8. Do **NOT** use the Jira `Assignee` field.
9. Do **NOT** create or resolve individual Jira users.
10. Do **NOT** introduce additional Jira fields.

---

# 2. Repository Structure

The implementation must support a structure similar to:

```text
jira/

├── issues/
│   ├── issues_1.csv
│   ├── issues_2.csv
│   └── issues_3.csv
│
├── automation/
│   ├── issues_1.csv
│   └── issues_2.csv
│
├── schema/
│   └── jira_fields.json
│
├── config/
│   └── automation.json        # generation.output_fields = six approved fields
│
└── <existing automation source files>
```

Do NOT hard-code specific files such as:

```text
issues_1.csv
issues_2.csv
```

Discover files dynamically using:

```text
issues_*.csv
```

The numeric suffix may grow indefinitely.

Examples:

```text
issues_1.csv
issues_2.csv
issues_10.csv
issues_25.csv
```

All must work.

---

# 3. Jira Fields — STRICT SCOPE

The generated automation CSV must contain **ONLY these Jira default fields**:

```text
Summary
Description
Issue Type
Priority
Status
Labels
```

These are the complete field scope for this automation.

## Do NOT use:

```text
Assignee
Reporter
Component/s
Fix Version/s
Affects Version/s
Due Date
Start Date
Sprint
Parent
Epic Link
Story Points
Environment
CR ID
FIX
Impact
Component Area
Security Sensitive
Architecture Blocker
QA Required
Agent Sessions
Vulnerability
Team
```

Do not add any other field even if it exists in Jira or appears in `schema/jira_fields.json`.

### Critical rule

**Assignee must NOT be used.**

The system must never:

* resolve a Jira user
* map a person to a Jira account
* populate `Assignee`
* require a Jira username
* ask which person should be assigned

Role routing is handled entirely through **Labels**.

---

# 4. Role Labels

Use the following labels for role/team routing:

| Label | Meaning                    |
| ----- | -------------------------- |
| `QA`  | Quality Assurance          |
| `IT`  | Infrastructure + Team Lead |
| `IS`  | Infrastructure + Security  |
| `FS`  | Full Stack                 |

These labels are the only role/team routing mechanism.

Examples:

```text
QA
IT
IS
FS
```

A task may contain one or more of these labels if the source task requires multiple roles.

Example:

```text
Labels
QA
```

or:

```text
Labels
IT,IS
```

or:

```text
Labels
FS
```

Do not replace these labels with individual names.

---

# 5. Jira Schema

The repository contains:

```text
schema/jira_fields.json
```

This is a read-only catalog of available Jira fields (from `/rest/api/3/field`). Inspect it to confirm the six approved fields exist, but it never drives generation.

The generated automation CSV is restricted to:

```text
Summary
Description
Issue Type
Priority
Status
Labels
```

Do not dynamically add arbitrary Jira fields from the schema.

The schema must NOT cause the generator to introduce:

```text
Assignee
Reporter
Sprint
Components
custom fields
```

or any other fields.

The six fields defined in this specification are authoritative for automation CSV generation.

---

# 6. Role Labels — Fixed Vocabulary (no roles schema)

The generator uses ONLY the fixed role-label vocabulary below. There is no `roles_schema.json`, no `jira-team.md`, and no person-name resolution.

```text
QA = Quality Assurance
IT = Infrastructure + Team Lead
IS = Infrastructure + Security
FS = Full Stack
```

Do NOT require or read:

```text
name
jira_name
assignee
Jira account
roles_schema.json
jira-team.md
Primary Owner
```

to generate an automation CSV. Role labels are resolved exclusively from the source CSV columns, in this order:

1. `Labels` column
2. `role` column

If neither provides a valid label, stop and request clarification (see §12, §15, §23). Never infer a role from a person's name or from `Primary Owner`.

---

# 7. Source CSV

Each:

```text
issues/issues_*.csv
```

is a source definition for Jira tasks. The source uses the legacy nine-column schema:

```text
CR ID
Summary
Description
Priority
Component Area
Security Sensitive
Architecture Blocker
QA Required
Primary Owner
```

The source schema and the generated automation schema are intentionally different. The source may also carry a `Labels` or `role` column for explicit role routing.

The generated automation CSV must contain only:

```text
Summary
Description
Issue Type
Priority
Status
Labels
```

The generator should map relevant source information into those six fields.

Do not blindly copy every source column.

## Source-to-output mapping

```text
CR ID                  → Description (context block, when non-empty)
Summary                → Summary
Description            → Description (verbatim / structured)
Priority               → Priority
Component Area         → Description (context block, when non-empty)
Security Sensitive     → Description (context block, when non-empty)
Architecture Blocker   → Description (context block, when non-empty)
QA Required            → Description (context block, when non-empty)
Primary Owner          → DO NOT use for Assignee
                         DO NOT use for role inference
                         DO NOT convert person → role
Labels / role          → Labels (only sources for QA/IT/IS/FS)
```

The context block is prepended to the Description exactly as:

```text
CR ID: CR-01

Component Area: Authentication

Security Sensitive: Yes

Architecture Blocker: Yes

QA Required: Yes

<original Description text>
```

Empty source fields are omitted from the block. No information is invented.

---

# 8. Filename Mapping

The mapping must be exact.

Example:

```text
issues/issues_1.csv
        ↓
automation/issues_1.csv
```

```text
issues/issues_2.csv
        ↓
automation/issues_2.csv
```

```text
issues/issues_17.csv
        ↓
automation/issues_17.csv
```

Do not:

* rename files
* add timestamps
* create duplicate versions
* change the numeric suffix

---

# 9. Existing-File Protection

This is a critical requirement.

Before generating:

```text
automation/issues_N.csv
```

perform an explicit existence check.

If the file exists:

```text
DO NOT:

- overwrite
- append
- regenerate
- modify
- rename
- delete
```

Instead report:

```text
SKIPPED: automation/issues_3.csv already exists
```

Existing automation files are user-controlled artifacts.

Running the generator repeatedly must never modify them.

---

# 10. Core Algorithm

Implement this deterministic process:

```text
START

  ↓

Locate issues/

  ↓

Locate automation/

  ↓

Inspect schema/

  ↓

Discover issues_*.csv

  ↓

For each source CSV:

      ↓

      Determine matching automation filename

      ↓

      Check whether automation/<same filename> exists

      ↓

      ┌─────────────────────────────┐
      │ Does automation file exist? │
      └─────────────────────────────┘

          │
       YES│       NO
          │        │
          ↓        ↓
       SKIP     Validate source
                    ↓
                Generate only:
                    Summary
                    Description
                    Issue Type
                    Priority
                    Status
                    Labels
                    ↓
                Validate role labels
                    ↓
                Safely create file
```

---

# 11. Generation Schema

Every newly generated automation CSV must have exactly these columns:

```csv
Summary,Description,Issue Type,Priority,Status,Labels
```

No `Assignee` column.

No custom Jira fields.

No additional columns.

Example:

```csv
Summary,Description,Issue Type,Priority,Status,Labels
"Implement login validation","Implement and test login validation","Task","High","To Do","FS"
"Verify deployment security","Review infrastructure security configuration","Task","High","To Do","IS"
"Create test suite","Create automated QA tests","Task","Medium","To Do","QA"
"Configure infrastructure","Configure deployment infrastructure","Task","High","To Do","IT"
```

---

# 12. Label Validation

Labels must use only the approved role labels when they represent team/role routing:

```text
QA
IT
IS
FS
```

Labels are resolved from source columns in this priority order:

1. `Labels` column (wins if present and non-empty)
2. `role` column (used only when `Labels` is empty)

There is no third source. Do not fall back to `Primary Owner`, person names, or any roles schema.

Do not transform them into person names:

```text
Akarsh
Ashwitha
Junaid
Dhanavarsha
```

Do not create Jira account assignments.

If a source contains a role value that cannot be safely mapped to:

```text
QA
IT
IS
FS
```

do not guess.

Stop and ask for clarification.

Example:

```text
File: issues_4.csv
Column: role
Value: Backend

The role "Backend" does not map unambiguously
to QA, IT, IS, or FS.

Please specify the intended label.
```

---

# 13. No Assignee Logic

The generator must contain **zero assignment logic**.

Do NOT implement:

```text
role → person
role → Jira account
name → Jira account
assignee → Jira account
```

The automation output must rely on:

```text
Labels
```

for role routing.

For example:

```text
FS
```

means:

```text
Full Stack
```

and:

```text
IS
```

means:

```text
Infrastructure + Security
```

---

# 14. Validation

Before generating a new automation file, validate:

## Files

```text
issues/ exists
automation/ exists
```

If the implementation requires schemas:

```text
schema/ exists
```

Inspect available schema files but do not create unnecessary replacements.

## Source CSV

Validate:

* CSV is readable.
* Header exists.
* Rows are structurally valid.
* Required information can be mapped.
* No malformed records exist.

## Output

Validate that the generated CSV contains exactly:

```text
Summary
Description
Issue Type
Priority
Status
Labels
```

No additional columns are permitted.

---

# 15. Missing Information

Do NOT silently guess important information.

If a missing or ambiguous value affects one of the six output fields, stop and ask for clarification.

Examples:

```text
Issue Type is missing.
```

```text
Priority cannot be determined.
```

```text
Status cannot be determined.
```

```text
Role "Backend" cannot be mapped to QA, IT, IS, or FS.
```

The tool must:

1. Explain what is missing.
2. Identify the affected file.
3. Identify the affected row/field when possible.
4. Ask one precise question.
5. Avoid creating an incorrect automation file.

---

# 16. Do Not Mutate Source Files

Never modify:

```text
issues/*.csv
schema/*.json
```

The generator is read-only against source files.

Only missing files under:

```text
automation/
```

may be created.

---

# 17. Idempotency

The system must be fully idempotent.

### First execution

```text
issues_1.csv → automation/issues_1.csv CREATED

issues_2.csv → automation/issues_2.csv CREATED

issues_3.csv → automation/issues_3.csv CREATED
```

### Second execution

```text
issues_1.csv → SKIPPED

issues_2.csv → SKIPPED

issues_3.csv → SKIPPED
```

Existing files must remain byte-for-byte unchanged where practical.

Do not rewrite them simply because the source or schema has changed.

---

# 18. Logging

Provide clear structured output.

Example:

```text
Jira Automation Generator

──────────────────────────

Discovered source files: 3

✓ issues_1.csv
  → automation/issues_1.csv already exists
  → SKIPPED

✓ issues_2.csv
  → automation/issues_2.csv already exists
  → SKIPPED

✓ issues_3.csv
  → automation/issues_3.csv missing
  → validating...
  → generating...
  → CREATED automation/issues_3.csv

Summary

──────────────────────────

Discovered: 3
Created:    1
Skipped:    2
Failed:     0
```

For newly generated files, report:

```text
Fields:
  Summary
  Description
  Issue Type
  Priority
  Status
  Labels

Assignee:
  NOT USED
```

---

# 19. Architecture

Implementation lives in `scripts/jira_automation.py` with logical separation of responsibilities:

```text
File Discovery
      ↓
CSV Parser
      ↓
Validator
      ↓
Role Label Resolver      (Labels → role only; fixed QA/IT/IS/FS vocabulary)
      ↓
Jira Field Mapper        (six-field projection + Description context builder)
      ↓
Automation Generator
      ↓
Safe File Creator        (O_EXCL; never replaces an existing file)
      ↓
Reporter
```

Each component has a clear responsibility. Reuse existing repository code where appropriate. No unnecessary frameworks or dependencies (Python stdlib only).

Configuration is externalized in `jira/config/automation.json`:

```json
{
  "generation": {
    "create_only_if_missing": true,
    "output_fields": ["Summary", "Description", "Issue Type", "Priority", "Status", "Labels"],
    "defaults": { "Issue Type": "Task", "Status": "To Do" },
    "label_sources": ["Labels", "role"]
  }
}
```

Execution:

```text
npm run jira:automation          # python3 scripts/jira_automation.py
npm run jira:automation:test     # python3 scripts/test_jira_automation_spec.py
```

---

# 20. Safe File Creation

Use an atomic/safe creation strategy where practical.

The critical invariant is:

```text
Never replace an existing automation file.
```

If two processes attempt to create the same missing file simultaneously, the implementation should ensure that an existing file is never replaced.

---

# 21. Current Status & Future Compatibility

## Current status (implemented and verified)

* `scripts/jira_automation.py` — six-field generator, idempotent, `O_EXCL` safe create.
* `scripts/test_jira_automation_spec.py` — 12 scenario tests, all passing (`npm run jira:automation:test`).
* Existing legacy `automation/issues_*.csv` files are never touched (byte-identical across runs).
* Role labels: fixed `QA`/`IT`/`IS`/`FS` vocabulary, resolved only from `Labels` then `role`.
* Description preserves the legacy source context block + original prose / structured sections.

## Layered architecture (target operating model)

```text
CSV Generator (this repo)     = data preparation only
        │  six-field CSV, Labels for routing, no people
        ▼
Jira CSV Import               = issues created
        │
        ▼
Jira                          = workflow + assignment + notifications
        │  - Jira Automation: assign by Labels (FS→FS owner, QA→QA owner, …)
        │  - status transitions, comments, email/Slack/Teams alerts
        ▼
GitHub                        = development activity
        │  - GitHub for Jira app: commits, branches, PRs, deployments
        │    link via issue key in branch/commit/PR (e.g. KEY-123 fix: …)
        ▼
Jira Automation (webhook)     = commit notification automation
           - Incoming Webhook trigger ← GitHub Pushes event
           - comment on linked issue, notify, optional status transition
```

**Separation of concerns:** the CSV generator never assigns people; Jira Automation assigns based on `Labels`; GitHub records development activity; webhook automation connects commit events to Jira notifications.

## Future scope (do NOT implement now)

The architecture may later support:

```text
Jira API
    ↓
Automatic issue creation
    ↓
Label-based routing
    ↓
Jira issue IDs
    ↓
Status synchronization
Jira ↔ GitHub integration (GitHub for Jira app)
Commit notification automation (Incoming Webhook ← GitHub Pushes)
```

Do NOT implement these features now unless they already exist.

Current scope is strictly:

```text
issues/*.csv
      ↓
detect missing automation CSV
      ↓
generate missing automation CSV
```

---

# 22. Before Coding

First inspect the repository.

Determine:

1. Existing directory structure.
2. Existing automation scripts (`scripts/jira_automation.py`, tests).
3. Existing `schema/jira_fields.json`.
4. Existing `issues_*.csv` files.
5. Existing `automation/issues_*.csv` files.
6. Existing `config/automation.json` (output_fields, defaults, label_sources).
7. Existing package/dependency configuration.
8. Existing coding conventions.
9. Existing test framework (plain asserts; no external framework).

Do NOT immediately create a new architecture.

Reuse existing implementation where appropriate.

---

# 23. User Clarification Protocol

If uncertainty materially affects the generated CSV:

STOP.

Do not guess.

Ask:

```text
File:
Row:
Field:
Detected value:
Expected information:
Why clarification is required:
```

Example:

```text
File: issues_4.csv
Row: 7
Field: role
Detected value: Backend
Expected information: QA / IT / IS / FS

Why clarification is required:
"Backend" does not map unambiguously to one of
the approved role labels.

Which label should be used?
```

---

# 24. Testing Requirements

Create tests for at least:

## Test 1 — Missing automation file

```text
issues/issues_3.csv exists
automation/issues_3.csv does not exist
```

Expected:

```text
automation/issues_3.csv created
```

Verify output columns are exactly:

```text
Summary
Description
Issue Type
Priority
Status
Labels
```

Verify:

```text
Assignee
```

does NOT exist.

---

## Test 2 — Existing automation file

```text
issues/issues_3.csv exists
automation/issues_3.csv exists
```

Expected:

```text
file unchanged
```

---

## Test 3 — Multiple issue files

Input:

```text
issues_1.csv
issues_2.csv
issues_3.csv
issues_10.csv
issues_25.csv
```

Expected:

All files are discovered correctly.

---

## Test 4 — Invalid source CSV

Expected:

```text
clear validation error
no automation file created
```

---

## Test 5 — Invalid role label

Example:

```text
role = Backend
```

Expected:

```text
clarification required
no incorrect automation file created
```

---

## Test 6 — Valid role labels

Test:

```text
QA
IT
IS
FS
```

Expected:

All are accepted.

---

## Test 7 — Assignee protection

Input/source may contain person information.

Expected:

```text
No Assignee field generated.
No Jira user resolution performed.
No individual Jira account assigned.
```

---

## Test 8 — Repeated execution

Run the generator twice.

Expected:

First run:

```text
CREATED
```

Second run:

```text
SKIPPED
```

The existing automation file must remain unchanged.

---

## Test 9 — Label source priority

Input source has both `Labels` and `role` columns.

Expected:

```text
Labels column wins when non-empty
role column used only when Labels is empty
```

---

## Test 10 — No person-name inference

Source contains `Primary Owner` (e.g. `Akarsh`) with empty `Labels`/`role`.

Expected:

```text
CLARIFICATION REQUIRED
no automation file created
person name never resolved to a role
```

A person name in the `role` column (e.g. `Ashwitha`) must also trigger clarification, never map to `FS` via any team roster.

---

## Test 11 — Structured Description

Source Description contains labeled sections (`Problem`, `Affected Files`, `Testing`, …) and file paths.

Expected:

```text
sections preserved under canonical headings
file paths preserved exactly
plain-prose descriptions preserved verbatim (after context block)
```

---

## Test 12 — Legacy nine-column source

Source uses the legacy schema (`CR ID … Primary Owner`) plus an explicit `role` column.

Expected:

```text
output header = Summary,Description,Issue Type,Priority,Status,Labels
CR ID / Component Area / Security Sensitive / Architecture Blocker / QA Required
    preserved inside Description context block
Primary Owner ignored (not in any output cell)
second run: SKIPPED, file byte-identical
```

---

# 25. Important Constraints

## DO NOT

* overwrite existing automation CSVs
* regenerate existing automation CSVs
* modify existing automation CSVs
* use `Assignee`
* resolve individual Jira users
* hard-code team members
* create person-to-role mappings
* create person-to-Jira-account mappings
* silently guess roles
* silently guess Jira fields
* modify source CSVs
* modify schema JSON files
* add custom Jira fields
* add unrelated default Jira fields
* create duplicate automation files
* introduce unnecessary dependencies
* hide validation errors
* silently ignore malformed data

## DO

* inspect the existing repository
* discover `issues_*.csv` dynamically
* use only the six approved Jira fields
* use Labels for role routing
* validate source data
* validate role labels
* create only missing automation files
* preserve existing automation files
* make the process deterministic
* make the process idempotent
* provide useful logs
* write tests
* ask for clarification when required

---

# 26. Final Output Schema

Every newly generated automation CSV must have exactly:

```text
Summary
Description
Issue Type
Priority
Status
Labels
```

Nothing else.

Especially:

```text
NO Assignee
NO Jira username
NO individual team member
NO custom Jira fields
```

Role routing must be represented using:

```text
QA
IT
IS
FS
```

---

# 27. Deliverables

Implement the complete feature in the existing repository.

After implementation, report:

```text
1. Files created
2. Files modified
3. Dependencies added
4. Generator execution command
5. Example execution
6. Test results (all 12 scenarios)
7. Output CSV schema
8. Role-label behavior
9. Description/context preservation behavior
10. Idempotency verification (legacy file hash unchanged)
11. Any assumptions
12. Any remaining clarification required
```

Do not claim successful implementation unless the code and tests actually work.

---

# 28. Execution Order

Follow this exact order:

```text
1. Inspect repository
2. Inspect existing implementation (scripts/jira_automation.py, tests)
3. Inspect schema/jira_fields.json
4. Inspect config/automation.json
5. Inspect issues_*.csv
6. Inspect existing automation/*.csv
7. Determine reusable components
8. Implement the smallest required changes
9. Implement six-field output only
10. Remove/avoid Assignee logic
11. Implement QA/IT/IS/FS label routing (Labels → role, no person inference)
12. Implement safe file creation
13. Add tests
14. Run tests
15. Verify idempotency
16. Report results
```

# Description Generation — Critical Requirement

The `Description` field is the primary technical implementation context for the Jira issue.

It must NOT be reduced to a short sentence or simple summary.

When generating the Jira automation CSV, the `Description` must contain the complete useful technical context provided in the source issue.

## Information that should be preserved

If the source issue provides any of the following information, include it in the generated `Description`:

* Problem / issue being reported
* Current behavior
* Expected behavior
* Root cause, if known
* Proposed solution
* Recommended implementation approach
* Step-by-step instructions
* Affected file paths
* Relevant directories
* Relevant source files
* Relevant functions/classes/modules
* Configuration locations
* API/endpoints involved
* Database/table/schema information
* Code locations
* Dependencies between components
* Security considerations
* Edge cases
* Validation requirements
* Testing instructions
* Acceptance criteria
* Deployment considerations
* Rollback considerations
* Any other technical context explicitly provided in the source issue

Do not remove useful implementation information simply because it makes the Description longer.

---

## Example

If the source issue contains information such as:

```text
Problem:
The WebAuthn scanner currently accepts a student credential.

Expected:
Only an authorized operator should be able to authenticate.

Solution:
Validate the credential against the operator authentication flow
before allowing the scanner operation.

Affected files:
apps/gate-monitor/app/api/auth/route.ts
apps/gate-monitor/components/WebAuthnScanner.tsx

Implementation:
1. Verify the credential.
2. Resolve the authenticated user.
3. Confirm the user has operator privileges.
4. Reject student credentials.
5. Log the rejected authentication attempt.

Testing:
Test with an authorized operator credential and a student credential.
```

The generated Jira `Description` should preserve that information in a clean structured form. The generator prepends the non-empty legacy context fields first, then the structured sections:

```text
CR ID: CR-01

Component Area: Authentication

Security Sensitive: Yes

Architecture Blocker: Yes

QA Required: Yes

Problem

The WebAuthn scanner currently accepts a student credential.

Expected Behavior

Only an authorized operator should be able to authenticate
and use the scanner.

Proposed Solution

Validate the WebAuthn credential against the operator
authentication flow before allowing the scanner operation.

Affected Files

- apps/gate-monitor/app/api/auth/route.ts
- apps/gate-monitor/components/WebAuthnScanner.tsx

Implementation

1. Verify the WebAuthn credential.
2. Resolve the authenticated user.
3. Confirm that the authenticated user has operator privileges.
4. Reject student credentials.
5. Log rejected authentication attempts.

Testing

- Test with an authorized operator credential.
- Test with a student credential.
- Confirm that the operator is accepted.
- Confirm that the student credential is rejected.
- Confirm that the rejection is logged.
```

If the source Description is plain prose (no labeled sections), it is preserved verbatim after the context block. The generator organizes information for readability but **must not invent technical details that were not provided**. Empty context fields are omitted.

---

# Description vs Summary

Use the fields differently.

### Summary

A concise description of **what the task is**.

Example:

```text
Prevent student credentials from authenticating as operators
```

### Description

The complete technical context required to **understand and implement the task**.

It should explain:

```text
What is wrong
↓
What should happen
↓
How it should be fixed
↓
Where to make the changes
↓
How to validate the fix
```

Do not duplicate the Summary unnecessarily.

---

# File Paths Are Important

If I provide a file path, preserve it exactly.

For example:

```text
apps/gate-monitor/app/api/auth/route.ts
```

must not become:

```text
auth route
```

Likewise, preserve:

* filenames
* directory paths
* function names
* class names
* API routes
* database names
* configuration names

when they are explicitly provided.

---

# Solution Instructions Must Be Preserved

If I provide instructions such as:

```text
Change X in file A.
Then update Y in file B.
Finally test Z.
```

the generated Description must preserve those instructions.

Do not reduce them to:

```text
Fix the authentication issue.
```

That would lose important implementation context.

---

# Do Not Invent Solutions

The generator may organize and format the information, but it must not invent:

* file paths
* functions
* APIs
* architecture
* implementation details
* root causes
* testing procedures
* technical assumptions

If the source says:

```text
Need to determine the correct file first.
```

do not invent a file path.

If important information is missing and generation cannot safely produce the issue, request clarification.

---

# Preserve Technical Context

The generated Jira issue should be usable by another developer without requiring them to return to the original source CSV just to understand the implementation.

The goal is:

```text
Source issue
     ↓
Structured Jira Description
     ↓
Developer can understand:
     ↓
Problem
Expected behavior
Solution
Files
Implementation
Testing
```

The Description should therefore prioritize **technical completeness and implementation usefulness**, while remaining organized and readable.


**Start by inspecting the repository and existing files. Do not modify anything until the existing implementation and schemas have been understood.**
