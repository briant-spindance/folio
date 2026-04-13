---
title: Issues
description: Track bugs, tasks, improvements, and chores with full lifecycle management.
order: 4
icon: circle-dot
---

# Issues

Issues track bugs, tasks, improvements, and maintenance chores. Each issue has its own directory with an `ISSUE.md` file and optional supporting artifacts.

## Creating an Issue

### From the Web UI

1. Navigate to **Issues** in the sidebar
2. Click **New Issue**
3. Fill in the title, type, priority, and description
4. Optionally link to a parent feature
5. Click **Save**

### From the CLI

```bash
folio issues create "Fix login timeout" --type bug --priority high --feature user-auth
folio issues create "Add export button" --type task --priority medium
folio issues create "Refactor auth module" --type improvement --body "Description here"
```

New issues default to `status: open`. The slug is auto-generated from the title.

## ISSUE.md Schema

Every issue lives in its own directory under `folio/issues/<slug>/`. The `ISSUE.md` file contains YAML frontmatter and a markdown body:

```yaml
---
title: "Login Timeout on Slow Connections"
status: open
type: bug
priority: high
assignees:
  - Charlie
labels:
  - security
  - networking
feature: user-auth
---

## Description

Users on slow connections experience a timeout during login.

## Steps to Reproduce

1. Throttle network to 3G speeds
2. Click "Sign in with Google"
3. Complete the Google OAuth flow
4. Observe timeout error on redirect back

## Expected Behavior

Login completes successfully regardless of connection speed.

## Analysis

The HTTP client timeout is hardcoded to 5 seconds. Should be configurable
or increased to 30 seconds for OAuth flows.
```

### Field Reference

| Field | Required | Type | Valid Values |
|-------|----------|------|-------------|
| `title` | Yes | string | Any text |
| `status` | Yes | string | `open`, `in-progress`, `closed` |
| `type` | No | string | `bug`, `task`, `improvement`, `chore` |
| `priority` | No | string | `critical`, `high`, `medium`, `low` |
| `assignees` | No | list | Team member names |
| `points` | No | integer | Effort estimate |
| `labels` | No | list | Arbitrary labels |
| `feature` | No | string | Slug of a parent feature (must exist) |

## Issue Types

| Type | When to Use |
|------|-------------|
| `bug` | Something is broken or behaving incorrectly |
| `task` | A concrete piece of work to complete |
| `improvement` | An enhancement to existing functionality |
| `chore` | Maintenance work (refactoring, dependency updates, cleanup) |

## Status Lifecycle

```
open -> in-progress -> closed
```

| Status | Meaning |
|--------|---------|
| `open` | Reported but not yet being worked on |
| `in-progress` | Actively being worked on |
| `closed` | Resolved |

## Issue Artifacts

An issue directory can contain supporting files:

```
folio/issues/login-timeout/
├── ISSUE.md              # Issue description
├── screenshot.png        # Error screenshot
├── network-trace.har     # Network capture
└── analysis.md           # Detailed investigation notes
```

## Linking Issues to Features

Issues can be linked to a parent feature using the `feature` field in frontmatter. The value must be the slug (directory name) of an existing feature:

```yaml
---
title: "Fix login timeout"
feature: user-auth
---
```

To find issues for a specific feature:

```bash
folio issues --json list --feature user-auth
```

The `feature` reference is validated by `folio doctor` -- if the referenced feature doesn't exist, it reports a warning.

## CLI Reference

All issue commands support `--json` output. The `--json` flag must be placed **before** the subcommand:

```bash
# Correct
folio issues --json list

# Incorrect -- will not work
folio issues list --json
```

### List Issues

```bash
folio issues --json list
folio issues --json list --status open
folio issues --json list --type bug --priority critical,high
folio issues --json list --feature user-auth
folio issues --json list --assignee "Charlie"
folio issues --json list --labels security,backend
folio issues --json list --sort priority --dir desc
```

| Flag | Type | Description |
|------|------|-------------|
| `--status` | comma-separated | Filter by status |
| `--type` | comma-separated | Filter by type |
| `--priority` | comma-separated | Filter by priority |
| `--assignee` | string | Filter by assignee name |
| `--feature` | string | Filter by linked feature slug |
| `--labels` | comma-separated | Filter by labels |
| `--sort` | string | Sort by: `order`, `title`, `status`, `type`, `priority`, `modified` |
| `--dir` | string | Sort direction: `asc`, `desc` |
| `--limit` | int | Items per page (default: 50) |
| `--page` | int | Page number (default: 1) |

### Get an Issue

```bash
folio issues --json get <slug>
```

### Create an Issue

```bash
folio issues --json create "Title" --type bug --priority high --feature feature-slug
```

| Flag | Type | Description |
|------|------|-------------|
| `--type` | string | `bug`, `task`, `improvement`, `chore` |
| `--priority` | string | `critical`, `high`, `medium`, `low` |
| `--body` | string | Issue description (markdown) |
| `--feature` | string | Linked feature slug |

### Update an Issue

```bash
folio issues --json update <slug> --status closed
folio issues --json update <slug> --priority critical
folio issues --json update <slug> --feature user-auth
folio issues --json update <slug> --labels "security,backend"
```

| Flag | Type | Description |
|------|------|-------------|
| `--title` | string | New title |
| `--status` | string | New status |
| `--type` | string | New type |
| `--priority` | string | New priority |
| `--body` | string | New body (markdown) |
| `--feature` | string | Linked feature slug (empty string to unlink) |
| `--labels` | comma-separated | Set labels (empty string clears) |

### Delete an Issue

```bash
folio issues --json delete <slug>
```

## Workflow

### Reporting a bug

1. Create the issue: `folio issues create "Bug title" --type bug --priority high`
2. Edit `ISSUE.md` to add reproduction steps and analysis
3. Optionally link to a feature: `folio issues update <slug> --feature <feature-slug>`

### Completing an issue

1. Transition to in-progress: `folio issues update <slug> --status in-progress`
2. Do the work
3. Close the issue: `folio issues update <slug> --status closed`
