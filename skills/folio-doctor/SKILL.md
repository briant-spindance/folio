---
name: folio-doctor
description: Run Folio health checks and fix issues. Use when a project has structural problems, invalid frontmatter, broken cross-references, or configuration errors in the folio/ directory.
---

# Folio Doctor

Run health checks on a Folio project and fix any issues found.

## When to Use This Skill

Use this skill when:

- Setting up or inheriting a Folio project to validate its structure
- Something seems broken or inconsistent in the `folio/` directory
- After bulk edits to features, issues, or wiki pages
- Before a commit to ensure project integrity
- The user asks to "check", "validate", or "fix" the Folio project

## Running Doctor

Run the health check command:

```bash
folio doctor --json
```

This returns a JSON object:

```json
{
  "passed": 7,
  "warnings": 1,
  "failed": 0,
  "checks": [
    { "level": "pass", "message": "Directory structure is valid" },
    { "level": "warn", "message": "Issue 'orphan': references non-existent feature 'ghost'" }
  ]
}
```

### Severity Levels

| Level  | Meaning | Exit Code |
|--------|---------|-----------|
| `pass` | Check succeeded | 0 |
| `warn` | Non-critical problem (semantic issue) | 0 |
| `fail` | Critical problem (structural/filesystem issue) | 1 |

The command exits with code 1 only when there are `fail`-level checks. Warnings alone do not cause failure.

## The Ten Checks

Doctor runs these checks in order. Each section below explains what is validated and how to fix failures.

### 1. Directory Structure

**Validates:** Five required directories exist and are actual directories (not files).

Required directories:
- `features/`
- `issues/`
- `wiki/`
- `sprints/`
- `project-docs/`

**Fix:** Create any missing directories:

```bash
mkdir -p folio/features folio/issues folio/wiki folio/sprints folio/project-docs
```

### 2. Configuration (`folio.yaml`)

**Validates:** `folio.yaml` exists, is valid YAML, and contains required fields.

**Expected format:**

```yaml
project: my-project
version: "0.1.0"
workflow:
  states: [draft, deferred, ready, in-progress, review, done]
  default: draft
```

**Common warnings and fixes:**

| Warning | Fix |
|---------|-----|
| `project` is empty | Add a `project: <name>` field |
| `workflow.states` is empty | Add states array (see format above) |
| `workflow.default` is empty | Set `default` to one of the states |
| `workflow.default` not in states | Ensure `default` value matches one of the `states` entries |

### 3. Feature Frontmatter

**Validates:** Every subdirectory in `features/` has a `FEATURE.md` with valid YAML frontmatter.

**Valid FEATURE.md frontmatter:**

```yaml
---
title: "My Feature"
status: draft
priority: high
assignees:
  - Alice
  - Bob
points: 5
tags:
  - backend
  - api
---
```

**Valid values:**

| Field | Valid Values |
|-------|-------------|
| `status` | `draft`, `deferred`, `ready`, `in-progress`, `review`, `done` |
| `priority` | `critical`, `high`, `medium`, `low` |

**Common warnings and fixes:**

| Warning | Fix |
|---------|-----|
| `title` is empty | Add a `title` field to the frontmatter |
| Invalid `status` | Change to one of the valid status values |
| Invalid `priority` | Change to one of the valid priority values |
| Missing `FEATURE.md` | Create the file with at minimum `title` and `status` in frontmatter |

### 4. Issue Frontmatter

**Validates:** Every subdirectory in `issues/` has an `ISSUE.md` with valid YAML frontmatter.

**Valid ISSUE.md frontmatter:**

```yaml
---
title: "Login Bug"
status: open
type: bug
priority: high
assignees:
  - Charlie
labels:
  - security
feature: user-auth
---
```

**Valid values:**

| Field | Valid Values |
|-------|-------------|
| `status` | `open`, `in-progress`, `closed` |
| `type` | `bug`, `task`, `improvement`, `chore` |
| `priority` | `critical`, `high`, `medium`, `low` |

**Common warnings and fixes:**

| Warning | Fix |
|---------|-----|
| `title` is empty | Add a `title` field |
| Invalid `status` | Change to `open`, `in-progress`, or `closed` |
| Invalid `type` | Change to `bug`, `task`, `improvement`, or `chore` |
| Invalid `priority` | Change to `critical`, `high`, `medium`, or `low` |

### 5. Wiki Validation

**Validates:** All `.md` files in `wiki/` have valid frontmatter.

**Valid wiki page frontmatter:**

```yaml
---
title: "Architecture Notes"
---
```

**Fix:** Ensure each wiki page has at minimum a `title` field in its frontmatter, or valid (even if empty) YAML frontmatter delimiters (`---`).

### 6. Project Docs Validation

**Validates:** All `.md` files in `project-docs/` have valid frontmatter.

**Valid project doc frontmatter:**

```yaml
---
title: "Project Brief"
order: 0
---
```

**Common warnings and fixes:**

| Warning | Fix |
|---------|-----|
| `title` is empty | Add a `title` field |
| `order` is not an integer | Change to a numeric value (e.g., `order: 3`, not `order: "3"`) |
| Duplicate `order` values | Assign unique `order` values to each doc |

### 7. Team Validation

**Validates:** `team.md` exists and has valid frontmatter with a `members` list.

**Valid team.md format:**

```yaml
---
members:
  - name: Alice Johnson
    role: Engineer
  - name: Bob Smith
    role: Designer
---
```

**Common warnings and fixes:**

| Warning | Fix |
|---------|-----|
| `team.md` is missing | Create `team.md` with a `members` list in frontmatter |
| Member missing `name` | Add a `name` field to each member entry |
| `members` is not a list | Ensure `members` is a YAML list (array), not a map |

### 8. Roadmap Consistency

**Validates:** `roadmap.md` has valid frontmatter and all cards reference existing columns and rows.

**Valid roadmap.md format:**

```yaml
---
title: Roadmap
columns: [now, next, later]
rows:
  - label: Platform
    color: blue
cards:
  - id: card-1
    title: "Build auth"
    column: now
    row: Platform
    feature_slug: auth-feature
---
```

**Common warnings and fixes:**

| Warning | Fix |
|---------|-----|
| Card references non-existent column | Change the card's `column` to one of the defined columns |
| Card references non-existent row | Change the card's `row` to one of the defined rows, or add the row to the `rows` list |

### 9. Duplicate Slugs

**Validates:** No feature slug has the same name as an issue slug.

**Fix:** Rename one of the conflicting directories. For example, if both `features/auth/` and `issues/auth/` exist, rename the issue to `issues/auth-bug/` or similar.

### 10. Referential Integrity

**Validates:** Cross-references between entities point to things that exist.

Checks:
- Every issue with a `feature` field in its frontmatter references an existing feature slug
- Every roadmap card with a `feature_slug` references an existing feature slug

**Common warnings and fixes:**

| Warning | Fix |
|---------|-----|
| Issue references non-existent feature | Update the `feature` field to a valid feature slug, or remove it |
| Roadmap card references non-existent feature | Update the `feature_slug` to a valid feature slug, or remove it |

## Workflow

1. Run `folio doctor --json`
2. Parse the JSON output
3. For each check with `"level": "warn"` or `"level": "fail"`:
   - Identify the check type from the message
   - Apply the appropriate fix from the sections above
   - If a fix requires judgment (e.g., which slug to rename), ask the user
4. Run `folio doctor --json` again to verify all issues are resolved
