---
name: folio-issues
description: Track and manage issues in a Folio project. Use when creating bugs, tasks, improvements, or chores, and when linking issues to features.
---

# Folio Issues

Track and manage issues in a Folio project — bugs, tasks, improvements, and chores.

## When to Use This Skill

Use this skill when:

- Reporting a bug or creating a task
- Updating issue status, priority, or assignments
- Linking an issue to a parent feature
- Listing or filtering issues
- Closing resolved issues

## CLI Reference

All issue commands support JSON output. The `--json` flag is a persistent flag on the parent command and must be placed **before** the subcommand:

```bash
# Correct
folio issues --json list
folio issues --json get my-issue

# Incorrect — will not work
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

**Filter flags:**

| Flag | Type | Description |
|------|------|-------------|
| `--status` | comma-separated | Filter by status: `open`, `in-progress`, `closed` |
| `--type` | comma-separated | Filter by type: `bug`, `task`, `improvement`, `chore` |
| `--priority` | comma-separated | Filter by priority: `critical`, `high`, `medium`, `low` |
| `--assignee` | string | Filter by assignee name |
| `--feature` | string | Filter by linked feature slug |
| `--labels` | comma-separated | Filter by labels |
| `--sort` | string | Sort field: `order`, `title`, `status`, `type`, `priority`, `modified` |
| `--dir` | string | Sort direction: `asc`, `desc` |
| `--limit` | int | Items per page (default: 50) |
| `--page` | int | Page number (default: 1) |

**JSON response:**

```json
{
  "issues": [
    {
      "slug": "login-timeout",
      "title": "Login Timeout on Slow Connections",
      "status": "open",
      "type": "bug",
      "priority": "critical",
      "assignees": ["Charlie"],
      "points": null,
      "sprint": null,
      "feature": "user-auth",
      "labels": ["security"],
      "created": "2025-02-01T00:00:00Z",
      "modified": "2025-02-10T00:00:00Z",
      "body": "Issue description...",
      "order": 0
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50,
  "total_pages": 1
}
```

### Get an Issue

```bash
folio issues --json get <slug>
```

Returns a single issue object.

### Create an Issue

```bash
folio issues --json create "Fix login timeout" --type bug --priority high --feature user-auth
folio issues --json create "Add export button" --type task --priority medium
folio issues --json create "Refactor auth module" --type improvement --body "Description here"
```

| Flag | Type | Description |
|------|------|-------------|
| `--type` | string | `bug`, `task`, `improvement`, `chore` |
| `--priority` | string | `critical`, `high`, `medium`, `low` |
| `--body` | string | Issue description (markdown) |
| `--feature` | string | Linked feature slug |

New issues default to `status: open`. The slug is auto-generated from the title.

This creates `folio/issues/<slug>/ISSUE.md`.

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

At least one flag is required.

### Delete an Issue

```bash
folio issues --json delete <slug>
```

## ISSUE.md Schema

Every issue lives in its own directory under `folio/issues/<slug>/`. The directory contains an `ISSUE.md` file with YAML frontmatter:

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

Users on slow connections experience a timeout during login. The OAuth callback
takes longer than the 5-second timeout configured in the HTTP client.

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

### Valid Field Values

| Field | Required | Valid Values |
|-------|----------|-------------|
| `title` | Yes | Any string |
| `status` | Yes | `open`, `in-progress`, `closed` |
| `type` | No | `bug`, `task`, `improvement`, `chore` |
| `priority` | No | `critical`, `high`, `medium`, `low` |
| `assignees` | No | List of team member names |
| `points` | No | Integer |
| `labels` | No | List of strings |
| `feature` | No | Slug of a parent feature (must exist in `features/`) |

### Issue Types

| Type | When to Use |
|------|-------------|
| `bug` | Something is broken or behaving incorrectly |
| `task` | A concrete piece of work to complete |
| `improvement` | An enhancement to existing functionality |
| `chore` | Maintenance work (refactoring, dependency updates, cleanup) |

### Issue Status Lifecycle

```
open → in-progress → closed
```

- **open** — Issue is reported but not yet being worked on
- **in-progress** — Actively being worked on
- **closed** — Issue is resolved

When an issue is assigned to a sprint, it can also use the feature workflow states (`draft`, `ready`, `in-progress`, `review`, `done`) on the sprint board.

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

Issues can be linked to a parent feature using the `feature` field in frontmatter. The value must be the slug (directory name) of an existing feature.

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

The `feature` reference is validated by `folio doctor` — if the referenced feature doesn't exist, it will report a warning.

## Workflow

### Reporting a bug

1. Create the issue: `folio issues --json create "Bug title" --type bug --priority high`
2. Edit the `ISSUE.md` to add reproduction steps and analysis
3. Optionally link to a feature: `folio issues --json update <slug> --feature <feature-slug>`

### Completing an issue

1. Transition to in-progress: `folio issues --json update <slug> --status in-progress`
2. Do the work
3. Close the issue: `folio issues --json update <slug> --status closed`
