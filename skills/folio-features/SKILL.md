---
name: folio-features
description: Manage Folio features through their lifecycle. Use when creating, updating, planning, or transitioning features in a Folio project.
---

# Folio Features

Manage the feature lifecycle in a Folio project — from creation through planning to completion.

## When to Use This Skill

Use this skill when:

- Creating a new feature for the project
- Writing or updating a feature spec (FEATURE.md) or implementation plan (PLAN.md)
- Transitioning a feature through workflow states
- Listing, filtering, or reviewing existing features
- Managing feature artifacts (supporting files)

## CLI Reference

All feature commands support JSON output. The `--json` flag is a persistent flag on the parent command and must be placed **before** the subcommand:

```bash
# Correct
folio features --json list
folio features --json get my-feature

# Incorrect — will not work
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

**Filter flags:**

| Flag | Type | Description |
|------|------|-------------|
| `--status` | comma-separated | Filter by status |
| `--priority` | comma-separated | Filter by priority |
| `--assignee` | string | Filter by assignee name |
| `--tags` | comma-separated | Filter by tags |
| `--sort` | string | Sort field: `order`, `title`, `status`, `priority`, `modified` |
| `--dir` | string | Sort direction: `asc`, `desc` |
| `--limit` | int | Items per page (default: 50) |
| `--page` | int | Page number (default: 1) |

**JSON response:**

```json
{
  "features": [
    {
      "slug": "auth",
      "title": "Authentication",
      "status": "in-progress",
      "priority": "high",
      "assignees": ["Alice"],
      "points": 5,
      "sprint": null,
      "tags": ["security"],
      "created": "2025-01-01T00:00:00Z",
      "modified": "2025-01-10T00:00:00Z",
      "roadmap_card": null,
      "body": "Feature description...",
      "order": 0
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50,
  "total_pages": 1
}
```

### Get a Feature

```bash
folio features --json get <slug>
```

Returns a single feature object (same shape as the array element above).

### Create a Feature

```bash
folio features --json create "My Feature Title" --priority high --body "Description here"
```

| Flag | Type | Description |
|------|------|-------------|
| `--priority` | string | `critical`, `high`, `medium`, `low` |
| `--body` | string | Feature description (markdown) |

New features default to `status: draft`. The slug is auto-generated from the title (e.g., "My Feature Title" becomes `my-feature-title`).

This creates `folio/features/<slug>/FEATURE.md`.

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

At least one flag is required.

### Delete a Feature

```bash
folio features --json delete <slug>
```

## FEATURE.md Schema

Every feature lives in its own directory under `folio/features/<slug>/`. The directory contains a `FEATURE.md` file with YAML frontmatter:

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

### Valid Field Values

| Field | Required | Valid Values |
|-------|----------|-------------|
| `title` | Yes | Any string |
| `status` | Yes | `draft`, `deferred`, `ready`, `in-progress`, `review`, `done` |
| `priority` | No | `critical`, `high`, `medium`, `low` |
| `assignees` | No | List of team member names (should match names in `team.md`) |
| `points` | No | Integer (story points / effort estimate) |
| `tags` | No | List of strings |

### Feature Status Lifecycle

```
draft → ready → in-progress → review → done
         ↑                                |
         └── deferred (parked features) ──┘
```

- **draft** — Feature is being defined, not ready for work
- **deferred** — Feature is parked for later consideration
- **ready** — Feature is fully specified and ready to be picked up
- **in-progress** — Actively being worked on
- **review** — Implementation complete, under review
- **done** — Feature is complete and merged

## PLAN.md

A feature directory can optionally contain a `PLAN.md` that describes how to implement the feature. This is separate from `FEATURE.md` (which describes *what* to build).

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

- `cmd/server/main.go` — Register new routes
- `internal/auth/oauth.go` — New file for OAuth logic
- `internal/middleware/auth.go` — Token validation middleware

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

A feature directory can contain any number of supporting files (artifacts) alongside `FEATURE.md` and `PLAN.md`:

```
folio/features/oauth-integration/
├── FEATURE.md          # Feature spec
├── PLAN.md             # Implementation plan
├── wireframe.png       # UI mockup
├── api-sketch.json     # API design notes
└── research.md         # Background research
```

Artifacts provide additional context for the feature. They can be any file type.

## Workflow

### Creating a new feature

1. Use `folio features --json create "Title" --priority <level>` to create the feature
2. Edit the generated `FEATURE.md` to flesh out the spec (requirements, acceptance criteria)
3. Optionally create a `PLAN.md` with implementation details
4. When the spec is complete, transition to `ready`: `folio features --json update <slug> --status ready`

### Working on a feature

1. Transition to `in-progress`: `folio features --json update <slug> --status in-progress`
2. Do the work as described in the plan
3. When done, transition to `review`: `folio features --json update <slug> --status review`
4. After review, transition to `done`: `folio features --json update <slug> --status done`
