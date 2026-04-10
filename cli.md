# Forge — CLI Reference

## Overview

The Forge CLI is a subcommand-based command-line interface for managing a Forge project structure. It is designed to be **agent-first** — optimized for use by AI coding agents — while remaining ergonomic for human users working in the terminal.

The CLI operates directly on the filesystem. All commands read and write files under the `forge/` directory in the current project. There is no background process or database.

### Design Principles

- **Predictable output.** Human-readable output by default, structured JSON with `--json` for machine consumption.
- **Explicit over implicit.** Commands state exactly what they will do. No hidden side effects.
- **Non-interactive by default.** All commands can be run without prompts by providing required arguments as flags. Interactive prompts are used only when arguments are missing and the session is a TTY.
- **Filesystem is the source of truth.** The CLI is a convenience layer over markdown files with YAML frontmatter. Any change made by the CLI can be verified by inspecting the file directly.

### Global Flags

These flags are available on all commands:

| Flag             | Short | Type   | Default | Description                                    |
|------------------|-------|--------|---------|------------------------------------------------|
| `--dir`          | `-d`  | string | `.`     | Path to the project root (parent of `forge/`). |
| `--json`         |       | bool   | false   | Output results as JSON instead of human-readable text. |
| `--quiet`        | `-q`  | bool   | false   | Suppress non-essential output.                 |
| `--help`         | `-h`  | bool   |         | Show help for the command.                     |
| `--version`      | `-v`  | bool   |         | Show the Forge version.                        |

### Exit Codes

| Code | Meaning                              |
|------|--------------------------------------|
| 0    | Success                              |
| 1    | General error (invalid input, etc.)  |
| 2    | File or entity not found             |
| 3    | Validation error (invalid YAML, missing required fields, etc.) |
| 4    | Conflict (e.g., entity already exists) |

---

## `forge init`

Scaffold a new `forge/` directory in the current project.

### Synopsis

```
forge init [--template <source>] [--force]
```

### Description

Creates the `forge/` directory structure with default configuration, project docs templates, and example content. If `forge/` already exists, the command exits with an error unless `--force` is specified.

### Flags

| Flag            | Type   | Default    | Description                                                    |
|-----------------|--------|------------|----------------------------------------------------------------|
| `--template`    | string | (built-in) | Template source: a git repo URL or local filesystem path.      |
| `--force`       | bool   | false      | Overwrite existing `forge/` directory. Prompts for confirmation in TTY mode. |

### Examples

```bash
# Initialize with the built-in default template
forge init

# Initialize from a team template repo
forge init --template https://github.com/acme/forge-template

# Initialize from a local template directory
forge init --template /path/to/template

# Re-initialize, overwriting existing content
forge init --force
```

### Output

```
Initialized forge/ directory at /Users/dev/my-project/forge
Created forge.yaml
Created project-docs/project-brief.md
Created project-docs/roadmap.md
Created features/backlog.md
Created reviews/architecture/REVIEW.md
```

### JSON Output (`--json`)

```json
{
  "path": "/Users/dev/my-project/forge",
  "template": "built-in",
  "files_created": [
    "forge.yaml",
    "project-docs/project-brief.md",
    "project-docs/roadmap.md",
    "features/backlog.md",
    "reviews/architecture/REVIEW.md"
  ]
}
```

---

## `forge feature`

Manage features under `forge/features/`.

### `forge feature create`

Create a new feature.

#### Synopsis

```
forge feature create <name> [--status <state>] [--assignee <name>] [--points <n>] [--body <markdown>] [--body-file <path>] [--add-to-backlog] [--sprint <slug>]
```

#### Description

Creates a new directory under `forge/features/` with a `FEATURE.md` file. The directory name is derived from `<name>` by converting it to a lowercase slug (spaces to hyphens, special characters stripped).

#### Arguments

| Argument | Required | Description                              |
|----------|----------|------------------------------------------|
| `name`   | Yes      | Human-readable feature name.             |

#### Flags

| Flag               | Type    | Default  | Description                                          |
|--------------------|---------|----------|------------------------------------------------------|
| `--status`         | string  | `draft`  | Initial workflow state.                               |
| `--assignee`       | string  |          | Assign to a team member.                              |
| `--points`         | int     |          | Story points or effort estimate.                      |
| `--body`           | string  |          | Markdown body content (inline).                       |
| `--body-file`      | string  |          | Path to a file containing the markdown body.          |
| `--add-to-backlog` | bool    | false    | Append this feature to the end of `backlog.md`.       |
| `--sprint`         | string  |          | Add this feature to a sprint by slug.                 |

If neither `--body` nor `--body-file` is provided, the `FEATURE.md` body is populated from the project's feature template (if configured) or left with a minimal placeholder.

#### Examples

```bash
# Create a feature with defaults
forge feature create "User Authentication"

# Create with metadata and body
forge feature create "OAuth Integration" \
  --status ready \
  --assignee "Alice" \
  --points 5 \
  --body "## Summary\nIntegrate OAuth 2.0 for third-party login." \
  --add-to-backlog

# Create with body from a file
forge feature create "Payment Processing" --body-file /tmp/payment-spec.md
```

#### Output

```
Created feature: OAuth Integration
  Path: forge/features/oauth-integration/FEATURE.md
  Status: ready
  Assignee: Alice
  Points: 5
  Added to backlog at position #7
```

#### JSON Output (`--json`)

```json
{
  "name": "OAuth Integration",
  "slug": "oauth-integration",
  "path": "forge/features/oauth-integration/FEATURE.md",
  "status": "ready",
  "assignee": "Alice",
  "points": 5,
  "backlog_position": 7
}
```

---

### `forge feature list`

List all features.

#### Synopsis

```
forge feature list [--status <state>] [--assignee <name>] [--sprint <slug>] [--sort <field>]
```

#### Flags

| Flag         | Type   | Default  | Description                                           |
|--------------|--------|----------|-------------------------------------------------------|
| `--status`   | string |          | Filter by workflow state. Can be specified multiple times. |
| `--assignee` | string |          | Filter by assignee.                                    |
| `--sprint`   | string |          | Filter by sprint slug. Use `none` for unassigned features. |
| `--sort`     | string | `name`   | Sort field: `name`, `status`, `priority`, `modified`.  |

#### Examples

```bash
# List all features
forge feature list

# List features in progress
forge feature list --status in-progress

# List features assigned to Alice, sorted by priority
forge feature list --assignee Alice --sort priority
```

#### Output

```
NAME                    STATUS        ASSIGNEE    POINTS  PRIORITY
User Authentication     in-progress   Alice       8       #1
OAuth Integration       ready         Alice       5       #2
Payment Processing      draft         —           —       #3
Email Notifications     draft         Bob         3       —
```

#### JSON Output (`--json`)

```json
[
  {
    "name": "User Authentication",
    "slug": "user-authentication",
    "status": "in-progress",
    "assignee": "Alice",
    "points": 8,
    "backlog_position": 1
  },
  {
    "name": "OAuth Integration",
    "slug": "oauth-integration",
    "status": "ready",
    "assignee": "Alice",
    "points": 5,
    "backlog_position": 2
  }
]
```

---

### `forge feature view`

View a feature's details.

#### Synopsis

```
forge feature view <slug>
```

#### Arguments

| Argument | Required | Description                |
|----------|----------|----------------------------|
| `slug`   | Yes      | Feature directory name.    |

#### Examples

```bash
forge feature view oauth-integration
```

#### Output

```
OAuth Integration
═════════════════

Status:    ready
Assignee:  Alice
Points:    5
Priority:  #2
Sprint:    Sprint 3
Path:      forge/features/oauth-integration/FEATURE.md

──────────────────────────────────────────

## Summary

Integrate OAuth 2.0 for third-party login support.

## Acceptance Criteria

- Users can log in via Google and GitHub
- Existing accounts can link OAuth providers
- Session management works identically to password auth

──────────────────────────────────────────

Artifacts:
  wireframe.png (24 KB)
  api-spec.yaml (3.2 KB)
```

#### JSON Output (`--json`)

```json
{
  "name": "OAuth Integration",
  "slug": "oauth-integration",
  "status": "ready",
  "assignee": "Alice",
  "points": 5,
  "backlog_position": 2,
  "sprint": "sprint-3",
  "path": "forge/features/oauth-integration/FEATURE.md",
  "body": "## Summary\n\nIntegrate OAuth 2.0 for third-party login support.\n\n## Acceptance Criteria\n\n- Users can log in via Google and GitHub\n- Existing accounts can link OAuth providers\n- Session management works identically to password auth",
  "artifacts": [
    {"name": "wireframe.png", "size": 24576},
    {"name": "api-spec.yaml", "size": 3277}
  ]
}
```

---

### `forge feature edit`

Edit a feature's metadata or content.

#### Synopsis

```
forge feature edit <slug> [--name <name>] [--status <state>] [--assignee <name>] [--points <n>] [--body <markdown>] [--body-file <path>]
```

#### Description

Updates the specified fields in the feature's `FEATURE.md` frontmatter and/or body. Only the provided flags are updated; all other fields are preserved. If no flags are provided and the session is a TTY, opens the file in `$EDITOR`.

#### Arguments

| Argument | Required | Description                |
|----------|----------|----------------------------|
| `slug`   | Yes      | Feature directory name.    |

#### Flags

| Flag          | Type   | Description                                          |
|---------------|--------|------------------------------------------------------|
| `--name`      | string | Update the feature name in frontmatter.              |
| `--status`    | string | Update the workflow state.                           |
| `--assignee`  | string | Update the assignee. Use `""` to clear.              |
| `--points`    | int    | Update the story points.                             |
| `--body`      | string | Replace the markdown body (inline).                  |
| `--body-file` | string | Replace the markdown body from a file.               |

#### Examples

```bash
# Update status and assignee
forge feature edit oauth-integration --status in-progress --assignee Bob

# Open in $EDITOR (TTY only)
forge feature edit oauth-integration

# Clear the assignee
forge feature edit oauth-integration --assignee ""
```

#### Output

```
Updated feature: OAuth Integration
  Status: ready → in-progress
  Assignee: Alice → Bob
```

---

### `forge feature delete`

Delete a feature.

#### Synopsis

```
forge feature delete <slug> [--force]
```

#### Description

Removes the feature directory and all its contents. Also removes the feature from `backlog.md` if it is listed there. Prompts for confirmation in TTY mode unless `--force` is specified.

#### Arguments

| Argument | Required | Description                |
|----------|----------|----------------------------|
| `slug`   | Yes      | Feature directory name.    |

#### Flags

| Flag      | Type | Default | Description                                     |
|-----------|------|---------|-------------------------------------------------|
| `--force` | bool | false   | Skip confirmation prompt.                        |

#### Examples

```bash
# Delete with confirmation prompt
forge feature delete oauth-integration

# Delete without confirmation
forge feature delete oauth-integration --force
```

#### Output

```
Deleted feature: OAuth Integration
  Removed: forge/features/oauth-integration/
  Removed from backlog (was #2)
```

---

### `forge feature status`

Transition a feature to a new workflow state.

#### Synopsis

```
forge feature status <slug> <state>
```

#### Description

A shorthand for updating just the workflow status. Validates that the target state is a valid workflow state defined in `forge.yaml`.

#### Arguments

| Argument | Required | Description                       |
|----------|----------|-----------------------------------|
| `slug`   | Yes      | Feature directory name.           |
| `state`  | Yes      | Target workflow state.            |

#### Examples

```bash
forge feature status oauth-integration in-progress
```

#### Output

```
OAuth Integration: ready → in-progress
```

---

### `forge feature assign`

Assign a feature to a team member.

#### Synopsis

```
forge feature assign <slug> <assignee>
```

#### Description

A shorthand for updating just the assignee field. Use an empty string to unassign.

#### Arguments

| Argument   | Required | Description                     |
|------------|----------|---------------------------------|
| `slug`     | Yes      | Feature directory name.         |
| `assignee` | Yes      | Team member name. Use `""` to clear. |

#### Examples

```bash
forge feature assign oauth-integration Bob

# Unassign
forge feature assign oauth-integration ""
```

#### Output

```
OAuth Integration: assigned to Bob
```

---

## `forge backlog`

Manage the feature backlog (`forge/features/backlog.md`).

### `forge backlog list`

Display the prioritized backlog.

#### Synopsis

```
forge backlog list
```

#### Examples

```bash
forge backlog list
```

#### Output

```
PRIORITY  NAME                    STATUS        ASSIGNEE    POINTS
#1        User Authentication     in-progress   Alice       8
#2        OAuth Integration       in-progress   Bob         5
#3        Payment Processing      draft         —           —
#4        Email Notifications     ready         Bob         3
#5        Dashboard Analytics     draft         —           —
```

#### JSON Output (`--json`)

```json
[
  {
    "position": 1,
    "slug": "user-authentication",
    "name": "User Authentication",
    "status": "in-progress",
    "assignee": "Alice",
    "points": 8
  },
  {
    "position": 2,
    "slug": "oauth-integration",
    "name": "OAuth Integration",
    "status": "in-progress",
    "assignee": "Bob",
    "points": 5
  }
]
```

---

### `forge backlog add`

Add a feature to the backlog.

#### Synopsis

```
forge backlog add <slug> [--position <n>]
```

#### Arguments

| Argument | Required | Description                |
|----------|----------|----------------------------|
| `slug`   | Yes      | Feature directory name.    |

#### Flags

| Flag         | Type | Default         | Description                                  |
|--------------|------|-----------------|----------------------------------------------|
| `--position` | int  | (end of list)   | Insert at a specific position. Existing items shift down. |

#### Examples

```bash
# Add to the end of the backlog
forge backlog add dashboard-analytics

# Add at position 2
forge backlog add dashboard-analytics --position 2
```

#### Output

```
Added to backlog: Dashboard Analytics at position #2
```

---

### `forge backlog remove`

Remove a feature from the backlog without deleting the feature.

#### Synopsis

```
forge backlog remove <slug>
```

#### Arguments

| Argument | Required | Description                |
|----------|----------|----------------------------|
| `slug`   | Yes      | Feature directory name.    |

#### Examples

```bash
forge backlog remove dashboard-analytics
```

#### Output

```
Removed from backlog: Dashboard Analytics (was #2)
```

---

### `forge backlog reorder`

Move a feature to a new position in the backlog.

#### Synopsis

```
forge backlog reorder <slug> --position <n>
```

#### Arguments

| Argument | Required | Description                |
|----------|----------|----------------------------|
| `slug`   | Yes      | Feature directory name.    |

#### Flags

| Flag         | Type | Required | Description                      |
|--------------|------|----------|----------------------------------|
| `--position` | int  | Yes      | New position in the backlog.     |

#### Examples

```bash
# Move a feature to the top of the backlog
forge backlog reorder oauth-integration --position 1
```

#### Output

```
Reordered backlog: OAuth Integration moved from #3 to #1
```

---

### `forge backlog promote`

Move a feature up one position in the backlog.

#### Synopsis

```
forge backlog promote <slug>
```

#### Examples

```bash
forge backlog promote oauth-integration
```

#### Output

```
Promoted: OAuth Integration #3 → #2
```

---

### `forge backlog demote`

Move a feature down one position in the backlog.

#### Synopsis

```
forge backlog demote <slug>
```

#### Examples

```bash
forge backlog demote oauth-integration
```

#### Output

```
Demoted: OAuth Integration #2 → #3
```

---

## `forge sprint`

Manage sprints under `forge/sprints/`.

### `forge sprint create`

Create a new sprint.

#### Synopsis

```
forge sprint create <name> --start <date> --end <date> [--goal <text>] [--capacity <n>]
```

#### Description

Creates a new directory under `forge/sprints/` with a `SPRINT.md` file. The directory name is derived from `<name>` by converting it to a lowercase slug. The sprint is created with status "planning".

#### Arguments

| Argument | Required | Description                    |
|----------|----------|--------------------------------|
| `name`   | Yes      | Sprint name (e.g., "Sprint 3").|

#### Flags

| Flag         | Type   | Required | Default | Description                                    |
|--------------|--------|----------|---------|------------------------------------------------|
| `--start`    | date   | Yes      |         | Sprint start date (YYYY-MM-DD).                |
| `--end`      | date   | Yes      |         | Sprint end date (YYYY-MM-DD). Must be after start. |
| `--goal`     | string | No       |         | Sprint goal statement.                          |
| `--capacity` | int    | No       |         | Total available story points.                   |

#### Examples

```bash
# Create a sprint
forge sprint create "Sprint 3" --start 2026-04-14 --end 2026-04-25

# Create with goal and capacity
forge sprint create "Sprint 3" \
  --start 2026-04-14 \
  --end 2026-04-25 \
  --goal "Ship OAuth integration and resolve critical upload bugs" \
  --capacity 40
```

#### Output

```
Created sprint: Sprint 3
  Path: forge/sprints/sprint-3/SPRINT.md
  Status: planning
  Dates: 2026-04-14 — 2026-04-25 (11 days)
  Goal: Ship OAuth integration and resolve critical upload bugs
  Capacity: 40 points
```

#### JSON Output (`--json`)

```json
{
  "name": "Sprint 3",
  "slug": "sprint-3",
  "path": "forge/sprints/sprint-3/SPRINT.md",
  "status": "planning",
  "start_date": "2026-04-14",
  "end_date": "2026-04-25",
  "goal": "Ship OAuth integration and resolve critical upload bugs",
  "capacity": 40,
  "features": [],
  "issues": []
}
```

---

### `forge sprint list`

List all sprints.

#### Synopsis

```
forge sprint list [--status <state>] [--sort <field>]
```

#### Flags

| Flag       | Type   | Default       | Description                                          |
|------------|--------|---------------|------------------------------------------------------|
| `--status` | string |               | Filter by status: `planning`, `active`, `completed`. |
| `--sort`   | string | `start_date`  | Sort field: `name`, `start_date`, `status`.          |

#### Examples

```bash
# List all sprints
forge sprint list

# List only active sprints
forge sprint list --status active
```

#### Output

```
NAME        STATUS      DATES                      GOAL                                PROGRESS
Sprint 1    completed   2026-03-17 — 2026-03-28    Core authentication flows           35/40 pts
Sprint 2    completed   2026-03-31 — 2026-04-11    Issue triage and backlog grooming    28/30 pts
Sprint 3    active      2026-04-14 — 2026-04-25    Ship OAuth and fix upload bugs      21/40 pts
Sprint 4    planning    2026-04-28 — 2026-05-09    —                                   0/— pts
```

#### JSON Output (`--json`)

```json
[
  {
    "name": "Sprint 3",
    "slug": "sprint-3",
    "status": "active",
    "start_date": "2026-04-14",
    "end_date": "2026-04-25",
    "goal": "Ship OAuth and fix upload bugs",
    "capacity": 40,
    "points_completed": 21,
    "feature_count": 3,
    "issue_count": 2
  }
]
```

---

### `forge sprint view`

View sprint details and assigned work items.

#### Synopsis

```
forge sprint view <slug>
```

#### Arguments

| Argument | Required | Description              |
|----------|----------|--------------------------|
| `slug`   | Yes      | Sprint directory name.   |

#### Examples

```bash
forge sprint view sprint-3
```

#### Output

```
Sprint 3
════════

Status:    active
Dates:     2026-04-14 — 2026-04-25 (4 days remaining)
Goal:      Ship OAuth integration and resolve critical upload bugs
Capacity:  40 points
Progress:  21 / 40 points (52%)
Path:      forge/sprints/sprint-3/SPRINT.md

──────────────────────────────────────────

Features:
  NAME                    STATUS        ASSIGNEE    POINTS
  OAuth Integration       in-progress   Bob         5
  Payment Processing      ready         —           8
  User Authentication     review        Alice       8

Issues:
  NAME                                  STATUS    ASSIGNEE    LABELS
  Missing Validation on File Upload     open      Alice       bug,security
  Login Timeout on Slow Connections     open      —           bug,networking
```

#### JSON Output (`--json`)

```json
{
  "name": "Sprint 3",
  "slug": "sprint-3",
  "status": "active",
  "start_date": "2026-04-14",
  "end_date": "2026-04-25",
  "days_remaining": 4,
  "goal": "Ship OAuth integration and resolve critical upload bugs",
  "capacity": 40,
  "points_completed": 21,
  "points_committed": 21,
  "features": [
    {
      "slug": "oauth-integration",
      "name": "OAuth Integration",
      "status": "in-progress",
      "assignee": "Bob",
      "points": 5
    },
    {
      "slug": "payment-processing",
      "name": "Payment Processing",
      "status": "ready",
      "assignee": null,
      "points": 8
    },
    {
      "slug": "user-authentication",
      "name": "User Authentication",
      "status": "review",
      "assignee": "Alice",
      "points": 8
    }
  ],
  "issues": [
    {
      "slug": "missing-validation-on-file-upload",
      "name": "Missing Validation on File Upload",
      "status": "open",
      "assignee": "Alice",
      "labels": ["bug", "security"]
    },
    {
      "slug": "login-timeout-on-slow-connections",
      "name": "Login Timeout on Slow Connections",
      "status": "open",
      "assignee": null,
      "labels": ["bug", "networking"]
    }
  ]
}
```

---

### `forge sprint edit`

Edit a sprint's metadata.

#### Synopsis

```
forge sprint edit <slug> [--name <name>] [--start <date>] [--end <date>] [--goal <text>] [--capacity <n>]
```

#### Description

Updates the specified fields in the sprint's `SPRINT.md` frontmatter. Only the provided flags are updated; all other fields are preserved. Does not modify the features/issues lists (use `forge sprint add` / `forge sprint remove` for that).

#### Arguments

| Argument | Required | Description              |
|----------|----------|--------------------------|
| `slug`   | Yes      | Sprint directory name.   |

#### Flags

| Flag         | Type   | Description                                     |
|--------------|--------|-------------------------------------------------|
| `--name`     | string | Update the sprint name.                         |
| `--start`    | date   | Update the start date (YYYY-MM-DD).             |
| `--end`      | date   | Update the end date (YYYY-MM-DD).               |
| `--goal`     | string | Update the sprint goal. Use `""` to clear.      |
| `--capacity` | int    | Update the capacity.                            |

#### Examples

```bash
# Extend a sprint by 2 days
forge sprint edit sprint-3 --end 2026-04-27

# Update the goal
forge sprint edit sprint-3 --goal "Ship OAuth and stabilize uploads"
```

#### Output

```
Updated sprint: Sprint 3
  End Date: 2026-04-25 → 2026-04-27
```

---

### `forge sprint delete`

Delete a sprint.

#### Synopsis

```
forge sprint delete <slug> [--force]
```

#### Description

Removes the sprint directory. Does **not** delete any features or issues assigned to the sprint — they remain in their respective directories. Prompts for confirmation in TTY mode unless `--force` is specified.

#### Arguments

| Argument | Required | Description              |
|----------|----------|--------------------------|
| `slug`   | Yes      | Sprint directory name.   |

#### Flags

| Flag      | Type | Default | Description                      |
|-----------|------|---------|----------------------------------|
| `--force` | bool | false   | Skip confirmation prompt.         |

#### Examples

```bash
forge sprint delete sprint-1 --force
```

#### Output

```
Deleted sprint: Sprint 1
  Removed: forge/sprints/sprint-1/
  Note: 3 features and 1 issue were assigned to this sprint (not deleted)
```

---

### `forge sprint add`

Add a feature or issue to a sprint.

#### Synopsis

```
forge sprint add <sprint-slug> <entity-slug> [--type <feature|issue>]
```

#### Description

Adds a feature or issue to the sprint's `SPRINT.md` frontmatter (features or issues list). If `--type` is not specified, Forge auto-detects by checking if the slug exists under `forge/features/` or `forge/issues/`. If it exists in both (unlikely but possible), `--type` is required.

#### Arguments

| Argument       | Required | Description                           |
|----------------|----------|---------------------------------------|
| `sprint-slug`  | Yes      | Sprint directory name.                |
| `entity-slug`  | Yes      | Feature or issue directory name.      |

#### Flags

| Flag     | Type   | Default      | Description                                        |
|----------|--------|--------------|----------------------------------------------------|
| `--type` | string | (auto-detect)| Entity type: `feature` or `issue`.                 |

#### Examples

```bash
# Add a feature (auto-detected)
forge sprint add sprint-3 oauth-integration

# Add an issue explicitly
forge sprint add sprint-3 login-timeout-on-slow-connections --type issue
```

#### Output

```
Added to Sprint 3: OAuth Integration (feature)
  Committed points: 26 / 40
```

---

### `forge sprint remove`

Remove a feature or issue from a sprint.

#### Synopsis

```
forge sprint remove <sprint-slug> <entity-slug> [--type <feature|issue>]
```

#### Description

Removes a feature or issue from the sprint's `SPRINT.md` frontmatter. Does not delete the feature or issue itself.

#### Arguments

| Argument       | Required | Description                           |
|----------------|----------|---------------------------------------|
| `sprint-slug`  | Yes      | Sprint directory name.                |
| `entity-slug`  | Yes      | Feature or issue directory name.      |

#### Flags

| Flag     | Type   | Default      | Description                                        |
|----------|--------|--------------|----------------------------------------------------|
| `--type` | string | (auto-detect)| Entity type: `feature` or `issue`.                 |

#### Examples

```bash
forge sprint remove sprint-3 payment-processing
```

#### Output

```
Removed from Sprint 3: Payment Processing (feature)
  Committed points: 18 / 40
```

---

### `forge sprint start`

Set a sprint's status to "active".

#### Synopsis

```
forge sprint start <slug>
```

#### Description

Transitions the sprint from "planning" to "active". If another sprint is already active, prints a warning and exits with an error unless the user confirms (in TTY mode) or `--force` is used.

#### Arguments

| Argument | Required | Description              |
|----------|----------|--------------------------|
| `slug`   | Yes      | Sprint directory name.   |

#### Examples

```bash
forge sprint start sprint-3
```

#### Output

```
Started sprint: Sprint 3
  Status: planning → active
  Dates: 2026-04-14 — 2026-04-25
  Items: 3 features, 2 issues (21 points committed)
```

If another sprint is active:

```
Error: Sprint 2 is currently active. Complete it first or use --force.
```

---

### `forge sprint complete`

Set a sprint's status to "completed".

#### Synopsis

```
forge sprint complete <slug>
```

#### Description

Transitions the sprint from "active" to "completed". If the sprint contains items not in the "done" state, prints a summary and prompts for confirmation in TTY mode.

#### Arguments

| Argument | Required | Description              |
|----------|----------|--------------------------|
| `slug`   | Yes      | Sprint directory name.   |

#### Examples

```bash
forge sprint complete sprint-3
```

#### Output

```
Completed sprint: Sprint 3
  Status: active → completed
  Results: 21 / 40 points completed
  Note: 2 items not in "done" state (remaining in sprint)
```

---

### `forge sprint board`

Display a text-based kanban board for a sprint.

#### Synopsis

```
forge sprint board <slug>
```

#### Description

Renders a compact kanban board in the terminal, showing sprint items grouped by workflow state. Designed for quick status checks without opening the web UI.

#### Arguments

| Argument | Required | Description              |
|----------|----------|--------------------------|
| `slug`   | Yes      | Sprint directory name.   |

#### Examples

```bash
forge sprint board sprint-3
```

#### Output

```
Sprint 3 — Ship OAuth and fix upload bugs
2026-04-14 — 2026-04-25 (4 days remaining) | 21/40 pts

DRAFT          READY               IN PROGRESS         REVIEW              DONE
─────          ─────               ───────────         ──────              ────
               Payment Processing  OAuth Integration   User Authentication
               (—, 8pts)           (Bob, 5pts)         (Alice, 8pts)

               [issue] Login       [issue] Missing
               Timeout             Validation
               (—)                 (Alice)
```

#### JSON Output (`--json`)

Returns the same data as `forge sprint view --json`, with items grouped by status:

```json
{
  "name": "Sprint 3",
  "slug": "sprint-3",
  "columns": {
    "draft": [],
    "ready": [
      {"type": "feature", "slug": "payment-processing", "name": "Payment Processing", "points": 8}
    ],
    "in-progress": [
      {"type": "feature", "slug": "oauth-integration", "name": "OAuth Integration", "assignee": "Bob", "points": 5},
      {"type": "issue", "slug": "login-timeout-on-slow-connections", "name": "Login Timeout on Slow Connections"}
    ],
    "review": [
      {"type": "feature", "slug": "user-authentication", "name": "User Authentication", "assignee": "Alice", "points": 8}
    ],
    "done": []
  }
}
```

---

## `forge issue`

Manage issues under `forge/issues/`.

### `forge issue create`

Create a new issue.

#### Synopsis

```
forge issue create <name> [--status <state>] [--assignee <name>] [--labels <labels>] [--feature <slug>] [--sprint <slug>] [--body <markdown>] [--body-file <path>]
```

#### Arguments

| Argument | Required | Description                 |
|----------|----------|-----------------------------|
| `name`   | Yes      | Human-readable issue name.  |

#### Flags

| Flag         | Type   | Default | Description                                          |
|--------------|--------|---------|------------------------------------------------------|
| `--status`   | string | `open`  | Initial status.                                       |
| `--assignee` | string |         | Assign to a team member.                              |
| `--labels`   | string |         | Comma-separated labels (e.g., `"bug,critical"`).     |
| `--feature`  | string |         | Link to a feature by slug.                            |
| `--sprint`   | string |         | Add this issue to a sprint by slug.                   |
| `--body`     | string |         | Markdown body content (inline).                       |
| `--body-file`| string |         | Path to a file containing the markdown body.          |

#### Examples

```bash
# Create a simple issue
forge issue create "Login timeout on slow connections"

# Create with full metadata
forge issue create "Missing validation on file upload" \
  --status open \
  --assignee Alice \
  --labels "bug,security" \
  --feature user-authentication \
  --body "## Description\nFile upload endpoint accepts files without size or type validation."
```

#### Output

```
Created issue: Missing Validation on File Upload
  Path: forge/issues/missing-validation-on-file-upload/ISSUE.md
  Status: open
  Assignee: Alice
  Labels: bug, security
  Linked Feature: User Authentication
```

#### JSON Output (`--json`)

```json
{
  "name": "Missing Validation on File Upload",
  "slug": "missing-validation-on-file-upload",
  "path": "forge/issues/missing-validation-on-file-upload/ISSUE.md",
  "status": "open",
  "assignee": "Alice",
  "labels": ["bug", "security"],
  "linked_feature": "user-authentication"
}
```

---

### `forge issue list`

List all issues.

#### Synopsis

```
forge issue list [--status <state>] [--assignee <name>] [--label <label>] [--feature <slug>] [--sprint <slug>] [--sort <field>]
```

#### Flags

| Flag         | Type   | Default | Description                                            |
|--------------|--------|---------|--------------------------------------------------------|
| `--status`   | string |         | Filter by status. Can be specified multiple times.      |
| `--assignee` | string |         | Filter by assignee.                                     |
| `--label`    | string |         | Filter by label. Can be specified multiple times.       |
| `--feature`  | string |         | Filter by linked feature slug.                          |
| `--sprint`   | string |         | Filter by sprint slug. Use `none` for unassigned issues.|
| `--sort`     | string | `name`  | Sort field: `name`, `status`, `modified`.               |

#### Examples

```bash
# List all issues
forge issue list

# List open bugs
forge issue list --status open --label bug

# List issues for a specific feature
forge issue list --feature user-authentication
```

#### Output

```
NAME                                    STATUS    ASSIGNEE    LABELS          FEATURE
Login Timeout on Slow Connections       open      —           bug,networking  User Authentication
Missing Validation on File Upload       open      Alice       bug,security    User Authentication
Broken CSS on Settings Page             closed    Bob         ui              —
```

---

### `forge issue view`

View an issue's details.

#### Synopsis

```
forge issue view <slug>
```

#### Arguments

| Argument | Required | Description             |
|----------|----------|-------------------------|
| `slug`   | Yes      | Issue directory name.   |

#### Output

```
Missing Validation on File Upload
══════════════════════════════════

Status:          open
Assignee:        Alice
Labels:          bug, security
Linked Feature:  User Authentication
Sprint:          Sprint 3
Path:            forge/issues/missing-validation-on-file-upload/ISSUE.md

──────────────────────────────────────────

## Description

File upload endpoint accepts files without size or type validation.

## Steps to Reproduce

1. Navigate to the upload page
2. Select a 2GB file
3. Upload succeeds without any error

## Expected Behavior

Uploads should be limited to 50MB and restricted to allowed file types.
```

---

### `forge issue edit`

Edit an issue's metadata or content.

#### Synopsis

```
forge issue edit <slug> [--name <name>] [--status <state>] [--assignee <name>] [--labels <labels>] [--feature <slug>] [--body <markdown>] [--body-file <path>]
```

#### Description

Updates the specified fields in the issue's `ISSUE.md` frontmatter and/or body. Only the provided flags are updated; all other fields are preserved. If no flags are provided and the session is a TTY, opens the file in `$EDITOR`.

#### Arguments

| Argument | Required | Description             |
|----------|----------|-------------------------|
| `slug`   | Yes      | Issue directory name.   |

#### Flags

| Flag          | Type   | Description                                            |
|---------------|--------|--------------------------------------------------------|
| `--name`      | string | Update the issue name in frontmatter.                  |
| `--status`    | string | Update the status.                                     |
| `--assignee`  | string | Update the assignee. Use `""` to clear.                |
| `--labels`    | string | Replace all labels (comma-separated). Use `""` to clear. |
| `--feature`   | string | Update the linked feature. Use `""` to unlink.         |
| `--body`      | string | Replace the markdown body (inline).                    |
| `--body-file` | string | Replace the markdown body from a file.                 |

#### Examples

```bash
# Close an issue
forge issue edit missing-validation-on-file-upload --status closed

# Update labels
forge issue edit missing-validation-on-file-upload --labels "bug,security,critical"
```

#### Output

```
Updated issue: Missing Validation on File Upload
  Status: open → closed
```

---

### `forge issue delete`

Delete an issue.

#### Synopsis

```
forge issue delete <slug> [--force]
```

#### Description

Removes the issue directory and all its contents. Prompts for confirmation in TTY mode unless `--force` is specified.

#### Arguments

| Argument | Required | Description             |
|----------|----------|-------------------------|
| `slug`   | Yes      | Issue directory name.   |

#### Flags

| Flag      | Type | Default | Description                      |
|-----------|------|---------|----------------------------------|
| `--force` | bool | false   | Skip confirmation prompt.         |

#### Examples

```bash
forge issue delete broken-css-on-settings-page --force
```

#### Output

```
Deleted issue: Broken CSS on Settings Page
  Removed: forge/issues/broken-css-on-settings-page/
```

---

## `forge docs`

Manage project documents under `forge/project-docs/`.

### `forge docs create`

Create a new project document.

#### Synopsis

```
forge docs create <name> [--body <markdown>] [--body-file <path>]
```

#### Arguments

| Argument | Required | Description                         |
|----------|----------|-------------------------------------|
| `name`   | Yes      | Document name (used to generate filename). |

#### Flags

| Flag          | Type   | Description                                          |
|---------------|--------|------------------------------------------------------|
| `--body`      | string | Markdown content (inline).                           |
| `--body-file` | string | Path to a file containing the markdown content.      |

If neither `--body` nor `--body-file` is provided and the session is a TTY, opens `$EDITOR` with an empty file.

#### Examples

```bash
# Create a document with inline content
forge docs create "API Guidelines" --body "## REST Conventions\n\nAll endpoints follow REST naming conventions."

# Create from a file
forge docs create "Architecture Overview" --body-file /tmp/architecture.md
```

#### Output

```
Created document: API Guidelines
  Path: forge/project-docs/api-guidelines.md
```

---

### `forge docs list`

List all project documents.

#### Synopsis

```
forge docs list [--sort <field>]
```

#### Flags

| Flag     | Type   | Default | Description                           |
|----------|--------|---------|---------------------------------------|
| `--sort` | string | `name`  | Sort field: `name`, `modified`.       |

#### Examples

```bash
forge docs list
```

#### Output

```
NAME                  LAST MODIFIED
API Guidelines        2025-01-15 14:32
Architecture Overview 2025-01-14 09:15
Design Docs           2025-01-10 11:00
Personas              2025-01-08 16:45
Project Brief         2025-01-05 10:30
Roadmap               2025-01-12 13:20
```

---

### `forge docs view`

View a project document.

#### Synopsis

```
forge docs view <slug>
```

#### Arguments

| Argument | Required | Description                         |
|----------|----------|-------------------------------------|
| `slug`   | Yes      | Document filename without extension. |

#### Examples

```bash
forge docs view api-guidelines
```

#### Output

```
API Guidelines
══════════════

Path: forge/project-docs/api-guidelines.md

──────────────────────────────────────────

## REST Conventions

All endpoints follow REST naming conventions.

## Authentication

All requests must include a Bearer token in the Authorization header.
```

---

### `forge docs edit`

Edit a project document.

#### Synopsis

```
forge docs edit <slug> [--body <markdown>] [--body-file <path>]
```

#### Description

Replaces the document content. If no flags are provided and the session is a TTY, opens the file in `$EDITOR`.

#### Arguments

| Argument | Required | Description                         |
|----------|----------|-------------------------------------|
| `slug`   | Yes      | Document filename without extension. |

#### Flags

| Flag          | Type   | Description                                     |
|---------------|--------|-------------------------------------------------|
| `--body`      | string | New markdown content (inline).                  |
| `--body-file` | string | Path to a file containing the new content.      |

#### Examples

```bash
forge docs edit api-guidelines --body-file /tmp/updated-api-guidelines.md
```

#### Output

```
Updated document: API Guidelines
  Path: forge/project-docs/api-guidelines.md
```

---

### `forge docs delete`

Delete a project document.

#### Synopsis

```
forge docs delete <slug> [--force]
```

#### Arguments

| Argument | Required | Description                         |
|----------|----------|-------------------------------------|
| `slug`   | Yes      | Document filename without extension. |

#### Flags

| Flag      | Type | Default | Description                      |
|-----------|------|---------|----------------------------------|
| `--force` | bool | false   | Skip confirmation prompt.         |

#### Examples

```bash
forge docs delete api-guidelines --force
```

#### Output

```
Deleted document: API Guidelines
  Removed: forge/project-docs/api-guidelines.md
```

---

## `forge review`

Browse review guidance under `forge/reviews/`.

### `forge review list`

List available review types.

#### Synopsis

```
forge review list
```

#### Examples

```bash
forge review list
```

#### Output

```
REVIEW TYPE     DESCRIPTION
Architecture    Architectural review checklist and guidance
Design          Design review process and standards
Security        Security review checklist
Usability       Usability review guidelines
```

#### JSON Output (`--json`)

```json
[
  {
    "type": "architecture",
    "path": "forge/reviews/architecture/REVIEW.md",
    "description": "Architectural review checklist and guidance"
  },
  {
    "type": "design",
    "path": "forge/reviews/design/REVIEW.md",
    "description": "Design review process and standards"
  }
]
```

---

### `forge review view`

View a review's guidance document.

#### Synopsis

```
forge review view <type>
```

#### Arguments

| Argument | Required | Description                        |
|----------|----------|------------------------------------|
| `type`   | Yes      | Review type (directory name).      |

#### Examples

```bash
forge review view security
```

#### Output

```
Security Review
═══════════════

Path: forge/reviews/security/REVIEW.md

──────────────────────────────────────────

## Purpose

Ensure the application meets security standards before release.

## Checklist

- [ ] Authentication flows reviewed
- [ ] Authorization checks on all endpoints
- [ ] Input validation on all user-facing inputs
- [ ] SQL injection protections verified
- [ ] CSRF protections in place
- [ ] Secrets management reviewed
- [ ] Dependency vulnerability scan completed
```

---

## `forge doctor`

Run health checks on the `forge/` directory.

### Synopsis

```
forge doctor [--check <name>]
```

### Description

Validates the integrity and completeness of the `forge/` directory structure. Runs all built-in health checks by default, or a specific check if `--check` is provided.

### Flags

| Flag      | Type   | Default | Description                                    |
|-----------|--------|---------|------------------------------------------------|
| `--check` | string |         | Run a specific check by name. Can be specified multiple times. |

### Health Checks

| Check Name               | Description                                                          |
|--------------------------|----------------------------------------------------------------------|
| `directory-structure`    | `forge/` directory exists with expected subdirectories.              |
| `config`                 | `forge.yaml` exists and is valid YAML.                                |
| `project-docs`           | Core project documents are present (e.g., `project-brief.md`).      |
| `feature-integrity`     | All feature directories contain a `FEATURE.md` with valid frontmatter. |
| `issue-integrity`       | All issue directories contain an `ISSUE.md` with valid frontmatter.  |
| `backlog-consistency`   | `backlog.md` references only existing features, no duplicates.       |
| `sprint-integrity`     | All sprint directories contain a `SPRINT.md` with valid frontmatter.  |
| `sprint-consistency`   | Sprints reference only existing features/issues, dates are valid, at most one sprint is active. |
| `workflow-states`       | Feature statuses match the states defined in `forge.yaml`.           |

### Examples

```bash
# Run all health checks
forge doctor

# Run a specific check
forge doctor --check backlog-consistency
```

### Output

```
Forge Health Check
══════════════════

✓ directory-structure    forge/ directory structure is valid
✓ config                 forge.yaml is valid
⚠ project-docs           Missing recommended document: personas.md
✓ feature-integrity      All 5 features have valid FEATURE.md files
✓ issue-integrity        All 3 issues have valid ISSUE.md files
✗ backlog-consistency    backlog.md references non-existent feature: "removed-feature"
✓ sprint-integrity       All 4 sprints have valid SPRINT.md files
✓ sprint-consistency     Sprint references and dates are valid
✓ workflow-states        All feature statuses match configured workflow

Results: 6 passed, 1 warning, 1 failed
```

### JSON Output (`--json`)

```json
{
  "checks": [
    {
      "name": "directory-structure",
      "status": "pass",
      "message": "forge/ directory structure is valid"
    },
    {
      "name": "config",
      "status": "pass",
      "message": "forge.yaml is valid"
    },
    {
      "name": "project-docs",
      "status": "warn",
      "message": "Missing recommended document: personas.md"
    },
    {
      "name": "backlog-consistency",
      "status": "fail",
      "message": "backlog.md references non-existent feature: \"removed-feature\""
    },
    {
      "name": "sprint-integrity",
      "status": "pass",
      "message": "All 4 sprints have valid SPRINT.md files"
    },
    {
      "name": "sprint-consistency",
      "status": "pass",
      "message": "Sprint references and dates are valid"
    }
  ],
  "summary": {
    "passed": 6,
    "warnings": 1,
    "failed": 1
  }
}
```

### Exit Codes

- `0` — All checks passed (warnings are acceptable).
- `1` — One or more checks failed.

---

## `forge status`

Display a quick project summary.

### Synopsis

```
forge status
```

### Description

Prints a high-level overview of the project's current state in a single command. Designed for AI agents and humans who want a fast snapshot without running multiple commands.

### Examples

```bash
forge status
```

### Output

```
Forge Project: My App
Branch: feature/oauth (dirty)

Features:  12 total (2 draft, 3 ready, 4 in-progress, 1 review, 2 done)
Issues:    7 total (5 open, 2 closed)
Sprints:   4 total (2 completed, 1 active, 1 planning)

Active Sprint: Sprint 3 (2026-04-14 — 2026-04-25, 4 days remaining)
  Progress: 21 / 40 points (52%)
  Items: 3 features, 2 issues

Backlog: 8 features prioritized
Health: Last run 2h ago — 5 passed, 1 warning, 1 failed
```

If no VCS is detected, the "Branch" line is omitted. If no sprint is active, the "Active Sprint" block reads "No active sprint."

### JSON Output (`--json`)

```json
{
  "project_name": "My App",
  "vcs": {
    "branch": "feature/oauth",
    "dirty": true
  },
  "features": {
    "total": 12,
    "by_status": {
      "draft": 2,
      "ready": 3,
      "in-progress": 4,
      "review": 1,
      "done": 2
    }
  },
  "issues": {
    "total": 7,
    "by_status": {
      "open": 5,
      "closed": 2
    }
  },
  "sprints": {
    "total": 4,
    "by_status": {
      "completed": 2,
      "active": 1,
      "planning": 1
    }
  },
  "active_sprint": {
    "name": "Sprint 3",
    "slug": "sprint-3",
    "end_date": "2026-04-25",
    "days_remaining": 4,
    "points_completed": 21,
    "capacity": 40,
    "feature_count": 3,
    "issue_count": 2
  },
  "backlog_count": 8
}
```

---

## `forge config`

View and modify project configuration (`forge/forge.yaml`).

### `forge config view`

Display the current configuration.

#### Synopsis

```
forge config view [--key <key>]
```

#### Description

Prints the full `forge.yaml` configuration, or a specific key's value if `--key` is provided. Keys use dot notation for nested values (e.g., `workflow.states`).

#### Flags

| Flag    | Type   | Default | Description                                       |
|---------|--------|---------|---------------------------------------------------|
| `--key` | string |         | Show only the value for a specific configuration key. |

#### Examples

```bash
# View full configuration
forge config view

# View a specific key
forge config view --key workflow.states
```

#### Output (full)

```
Forge Configuration
═══════════════════

Path: forge/forge.yaml

workflow:
  states:
    - draft
    - ready
    - in-progress
    - review
    - done

template:
  source: built-in

reviews:
  types:
    - architecture
    - design
    - security
    - usability
```

#### Output (specific key)

```
workflow.states: draft, ready, in-progress, review, done
```

#### JSON Output (`--json`)

```json
{
  "workflow": {
    "states": ["draft", "ready", "in-progress", "review", "done"]
  },
  "template": {
    "source": "built-in"
  },
  "reviews": {
    "types": ["architecture", "design", "security", "usability"]
  }
}
```

---

### `forge config set`

Set a configuration value.

#### Synopsis

```
forge config set <key> <value>
```

#### Description

Updates a value in `forge.yaml`. Keys use dot notation for nested values. For list values, provide a comma-separated string. Validates the configuration after writing and rolls back on error.

#### Arguments

| Argument | Required | Description                                        |
|----------|----------|----------------------------------------------------|
| `key`    | Yes      | Configuration key in dot notation.                  |
| `value`  | Yes      | New value. Use comma-separated for lists.           |

#### Examples

```bash
# Update workflow states
forge config set workflow.states "draft,ready,in-progress,review,qa,done"

# Update template source
forge config set template.source "https://github.com/acme/forge-template"
```

#### Output

```
Updated forge.yaml:
  workflow.states: draft, ready, in-progress, review, done → draft, ready, in-progress, review, qa, done
```

#### Validation

If the new value is invalid (e.g., removing a workflow state currently in use by features), the command prints a warning:

```
Warning: 2 features currently use status "review" which is being removed.
  - oauth-integration (review)
  - user-authentication (review)
Use --force to apply anyway.
```

---

## `forge search`

Search across all project content.

### Synopsis

```
forge search <query> [--type <entity-type>] [--limit <n>]
```

### Description

Performs a full-text search across all project docs, features, issues, sprints, and reviews. Searches both frontmatter metadata and markdown body content. Returns matching entities with context snippets showing where the match occurred.

### Arguments

| Argument | Required | Description           |
|----------|----------|-----------------------|
| `query`  | Yes      | Search term or phrase.|

### Flags

| Flag      | Type   | Default | Description                                                 |
|-----------|--------|---------|-------------------------------------------------------------|
| `--type`  | string |         | Restrict to entity type: `feature`, `issue`, `doc`, `sprint`, `review`. Can be specified multiple times. |
| `--limit` | int    | 20      | Maximum number of results.                                  |

### Examples

```bash
# Search everywhere
forge search "OAuth"

# Search only features and issues
forge search "authentication" --type feature --type issue

# Limit results
forge search "validation" --limit 5
```

### Output

```
Search results for "OAuth" (4 matches)

[feature] OAuth Integration (forge/features/oauth-integration/FEATURE.md)
  Status: in-progress | Assignee: Bob
  ...Integrate OAuth 2.0 for third-party login support...

[feature] User Authentication (forge/features/user-authentication/FEATURE.md)
  Status: review | Assignee: Alice
  ...consider OAuth as an alternative to password-based auth...

[doc] Technical Docs (forge/project-docs/technical-docs.md)
  ...OAuth 2.0 flow diagram and token refresh strategy...

[issue] Missing Validation on File Upload (forge/issues/missing-validation-on-file-upload/ISSUE.md)
  Status: open | Assignee: Alice
  ...OAuth tokens should also be validated on upload endpoints...
```

### JSON Output (`--json`)

```json
{
  "query": "OAuth",
  "total": 4,
  "results": [
    {
      "type": "feature",
      "name": "OAuth Integration",
      "slug": "oauth-integration",
      "path": "forge/features/oauth-integration/FEATURE.md",
      "status": "in-progress",
      "assignee": "Bob",
      "snippet": "Integrate OAuth 2.0 for third-party login support",
      "line": 5
    },
    {
      "type": "feature",
      "name": "User Authentication",
      "slug": "user-authentication",
      "path": "forge/features/user-authentication/FEATURE.md",
      "status": "review",
      "assignee": "Alice",
      "snippet": "consider OAuth as an alternative to password-based auth",
      "line": 23
    },
    {
      "type": "doc",
      "name": "Technical Docs",
      "slug": "technical-docs",
      "path": "forge/project-docs/technical-docs.md",
      "snippet": "OAuth 2.0 flow diagram and token refresh strategy",
      "line": 47
    },
    {
      "type": "issue",
      "name": "Missing Validation on File Upload",
      "slug": "missing-validation-on-file-upload",
      "path": "forge/issues/missing-validation-on-file-upload/ISSUE.md",
      "status": "open",
      "assignee": "Alice",
      "snippet": "OAuth tokens should also be validated on upload endpoints",
      "line": 12
    }
  ]
}
```

---

## `forge serve`

Start the web UI server.

### Synopsis

```
forge serve [--port <n>] [--host <addr>] [--open]
```

### Description

Starts a local HTTP server that serves the Forge web UI. The UI is embedded in the binary and requires no additional dependencies. The server reads and writes files under `forge/` in the project directory.

### Flags

| Flag     | Type   | Default     | Description                                         |
|----------|--------|-------------|-----------------------------------------------------|
| `--port` | int    | `4040`      | Port to listen on.                                   |
| `--host` | string | `127.0.0.1` | Host address to bind to.                             |
| `--open` | bool   | false       | Open the UI in the default browser after starting.   |

### Examples

```bash
# Start with defaults
forge serve

# Start on a custom port and open the browser
forge serve --port 8080 --open

# Bind to all interfaces (for network access)
forge serve --host 0.0.0.0 --port 4040
```

### Output

```
Forge server running at http://127.0.0.1:4040
Press Ctrl+C to stop
```

---

## Output Formats

### Human-Readable (Default)

The default output is designed for terminal readability:

- **Tables** use aligned columns with headers.
- **Detail views** use box-drawing characters for visual separation.
- **Status indicators** use `✓`, `⚠`, and `✗` symbols.
- **Emphasis** uses ANSI colors when the output is a TTY (suppressed when piped).

### JSON (`--json`)

When `--json` is specified:

- All output is valid JSON written to stdout.
- Errors are also JSON: `{"error": "message", "code": 2}`.
- No ANSI escape codes or decorative characters.
- Lists are JSON arrays. Single entities are JSON objects.
- Dates are ISO 8601 format.
- This is the recommended format for AI agent consumption.

### Quiet Mode (`--quiet`)

When `--quiet` is specified:

- Suppresses informational output (e.g., "Created feature...").
- Errors are still printed to stderr.
- Exit codes still indicate success or failure.
- Useful in scripts where only the exit code matters.
