---
title: Features
description: Create and manage feature specs with plans, artifacts, and lifecycle tracking.
order: 3
icon: puzzle
---

# Features

Features are the core work artifact in Folio. Each feature has a specification (`FEATURE.md`), an optional implementation plan (`PLAN.md`), and can include any number of supporting artifacts.

## Creating a Feature

### From the Web UI

1. Navigate to **Features** in the sidebar
2. Click **New Feature**
3. Fill in the title, priority, and description
4. Click **Save**

### From the CLI

```bash
folio features create "OAuth Integration" --priority high --body "Implement OAuth 2.0 with Google and GitHub."
```

The slug is auto-generated from the title (e.g., `oauth-integration`). The feature is created at `folio/features/oauth-integration/FEATURE.md`.

## FEATURE.md Schema

Every feature lives in its own directory under `folio/features/<slug>/`. The `FEATURE.md` file contains YAML frontmatter and a markdown body:

```yaml
---
title: "OAuth Integration"
status: draft
priority: high
assignees:
  - Alice Johnson
  - Bob Smith
points: 5
tags:
  - backend
  - security
---

## Summary

Implement OAuth 2.0 integration with Google and GitHub providers.

## Requirements

- Support Google OAuth
- Support GitHub OAuth
- Store tokens securely
- Handle token refresh
```

### Field Reference

| Field | Required | Type | Valid Values |
|-------|----------|------|-------------|
| `title` | Yes | string | Any text |
| `status` | Yes | string | `draft`, `deferred`, `ready`, `in-progress`, `review`, `done` |
| `priority` | No | string | `critical`, `high`, `medium`, `low` |
| `assignees` | No | list | Team member names (should match `team.md`) |
| `points` | No | integer | Story points / effort estimate |
| `sprint` | No | string | Sprint identifier |
| `tags` | No | list | Arbitrary labels for categorization |

## Status Lifecycle

Features move through a defined set of workflow states:

```
draft -> ready -> in-progress -> review -> done
         ^                                  |
         '-- deferred (parked features) ----'
```

| Status | Meaning |
|--------|---------|
| `draft` | Being defined, not ready for work |
| `deferred` | Parked for later consideration |
| `ready` | Fully specified, ready to be picked up |
| `in-progress` | Actively being worked on |
| `review` | Implementation complete, under review |
| `done` | Complete and merged |

The available states and default status are configured in `folio.yaml`. See [Configuration](/help/configuration).

### Transitioning Status

**Web UI:** Open the feature, click **Edit**, and change the status field.

**CLI:**

```bash
folio features update oauth-integration --status in-progress
```

## PLAN.md

A feature directory can optionally contain a `PLAN.md` that describes **how** to implement the feature (separate from `FEATURE.md` which describes **what** to build):

```markdown
# Implementation Plan: OAuth Integration

## Approach

Use the `golang.org/x/oauth2` package for the OAuth flow.

## Steps

1. Add OAuth configuration to environment variables
2. Create OAuth handler endpoints (`/auth/google`, `/auth/github`)
3. Implement token storage in the session
4. Add middleware to validate tokens on protected routes
5. Handle token refresh flow

## Files to Change

- `cmd/server/main.go` -- Register new routes
- `internal/auth/oauth.go` -- New file for OAuth logic
- `internal/middleware/auth.go` -- Token validation middleware

## Testing

- Unit tests for token validation
- Integration tests for the full OAuth flow
- Manual testing with test OAuth apps
```

A good PLAN.md includes:

- The high-level approach or architecture decision
- Ordered implementation steps
- Files that will be created or modified
- Testing strategy

## Feature Artifacts

A feature directory can contain any number of supporting files alongside `FEATURE.md` and `PLAN.md`:

```
folio/features/oauth-integration/
├── FEATURE.md          # Feature spec
├── PLAN.md             # Implementation plan
├── wireframe.png       # UI mockup
├── api-sketch.json     # API design notes
└── research.md         # Background research
```

Artifacts provide additional context for the feature. They can be any file type -- diagrams, mockups, JSON fixtures, or supplementary documentation. Artifacts are viewable in the web UI.

## CLI Reference

All feature commands support `--json` output. The `--json` flag must be placed **before** the subcommand:

```bash
# Correct
folio features --json list

# Incorrect -- will not work
folio features list --json
```

### List Features

```bash
folio features --json list
folio features --json list --status in-progress,review
folio features --json list --priority high,critical
folio features --json list --assignee "Alice"
folio features --json list --tags backend,api
folio features --json list --sort priority --dir desc
```

| Flag | Type | Description |
|------|------|-------------|
| `--status` | comma-separated | Filter by status |
| `--priority` | comma-separated | Filter by priority |
| `--assignee` | string | Filter by assignee name |
| `--tags` | comma-separated | Filter by tags |
| `--sort` | string | Sort by: `order`, `title`, `status`, `priority`, `modified` |
| `--dir` | string | Sort direction: `asc`, `desc` |
| `--limit` | int | Items per page (default: 50) |
| `--page` | int | Page number (default: 1) |

### Get a Feature

```bash
folio features --json get <slug>
```

### Create a Feature

```bash
folio features --json create "Title" --priority high --body "Description"
```

| Flag | Type | Description |
|------|------|-------------|
| `--priority` | string | `critical`, `high`, `medium`, `low` |
| `--body` | string | Feature description (markdown) |

### Update a Feature

```bash
folio features --json update <slug> --status in-progress
folio features --json update <slug> --title "New Title" --priority critical
folio features --json update <slug> --tags "backend,api"
folio features --json update <slug> --body "Updated description"
```

| Flag | Type | Description |
|------|------|-------------|
| `--title` | string | New title |
| `--status` | string | New status |
| `--priority` | string | New priority |
| `--body` | string | New body (markdown) |
| `--tags` | comma-separated | Set tags (empty string clears) |

### Delete a Feature

```bash
folio features --json delete <slug>
```

## Workflow

### Creating a new feature

1. Create the feature: `folio features create "Title" --priority high`
2. Edit `FEATURE.md` to flesh out requirements and acceptance criteria
3. Optionally create `PLAN.md` with implementation details
4. Transition to `ready` when the spec is complete

### Working on a feature

1. Transition to `in-progress`
2. Implement according to the plan
3. Transition to `review` when implementation is complete
4. After review, transition to `done`
