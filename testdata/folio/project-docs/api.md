---
title: REST API Specification
order: 1
---

# Folio — REST API Specification

## Overview

The Folio API is an HTTP JSON API served by the Go backend (`folio serve`). It provides the data layer between the React SPA frontend and the filesystem-based project structure. All endpoints read from and write to the `folio/` directory — the filesystem is the source of truth.

The API is consumed exclusively by the embedded web UI. It is not intended as a public API, but follows RESTful conventions to keep the interface predictable.

### Base URL

All API endpoints are prefixed with `/api`. Static SPA assets are served from the root (`/`), and any non-API path falls back to `index.html` for client-side routing.

### Content Type

- **Request bodies:** `application/json` unless otherwise noted.
- **Responses:** `application/json` for all API endpoints.

### Authentication

None. The server binds to `127.0.0.1` by default and is intended for local use. Authentication may be added in a future phase for cloud deployment.

---

## Conventions

### Response Envelope

Successful responses return the resource directly (object or array) with a `2xx` status code. There is no wrapping envelope for success responses.

### Error Format

All errors return a consistent JSON structure:

```json
{
  "error": {
    "code": "not_found",
    "message": "Feature 'nonexistent-feature' not found."
  }
}
```

#### Error Codes

| HTTP Status | Code               | Description                                          |
|-------------|--------------------|------------------------------------------------------|
| `400`       | `bad_request`      | Malformed request body or invalid parameters.        |
| `404`       | `not_found`        | Requested resource does not exist.                   |
| `409`       | `conflict`         | Resource already exists or state conflict (e.g., starting a sprint when one is active). |
| `422`       | `validation_error` | Request is well-formed but fails validation (e.g., missing required field, invalid workflow state). |
| `500`       | `internal_error`   | Unexpected server error.                             |

### Optimistic Concurrency

Responses for individual resources include a `Last-Modified` header with the filesystem modification timestamp. Write operations (`PUT`, `PATCH`, `DELETE`) accept an optional `If-Unmodified-Since` header. If the file has been modified since the provided timestamp (e.g., by a concurrent CLI operation or another UI session), the server returns `409 Conflict` with a descriptive error message.

This prevents silent data loss from concurrent edits without requiring file locking.

### Query Parameters

- **Filtering:** Query parameters filter list responses (e.g., `?status=in-progress&assignee=Alice`). Multiple values for the same filter use comma separation (e.g., `?status=draft,ready`).
- **Sorting:** `?sort=<field>` with optional `-` prefix for descending (e.g., `?sort=-modified`). Default sort varies per endpoint.
- **Limiting:** `?limit=<n>` to cap the number of results. No pagination in Phase 1 (project sizes are expected to be manageable).

### Slug Convention

Resources are identified by their filesystem directory name (slug). Slugs are lowercase, hyphenated strings derived from the entity name (e.g., "OAuth Integration" → `oauth-integration`).

---

## Endpoints

### Features

#### `GET /api/features`

List all features.

**Query Parameters:**

| Parameter  | Type   | Description                                                    |
|------------|--------|----------------------------------------------------------------|
| `status`   | string | Filter by workflow state(s). Comma-separated for multiple.     |
| `assignee` | string | Filter by assignee name.                                       |
| `sprint`   | string | Filter by sprint slug. Use `none` for features not in any sprint. |
| `sort`     | string | Sort field: `name`, `status`, `priority`, `modified` (default: `name`). |

**Response:** `200 OK`

```json
[
  {
    "name": "User Authentication",
    "slug": "user-authentication",
    "status": "in-progress",
    "assignee": "Alice",
    "points": 8,
    "backlog_position": 1,
    "sprint": "sprint-3",
    "last_modified": "2026-04-09T10:15:00Z"
  }
]
```

---

#### `GET /api/features/:slug`

Get a single feature.

**Response:** `200 OK`

```json
{
  "name": "OAuth Integration",
  "slug": "oauth-integration",
  "status": "ready",
  "assignee": "Alice",
  "points": 5,
  "backlog_position": 2,
  "sprint": "sprint-3",
  "path": "folio/features/oauth-integration/FEATURE.md",
  "body": "## Summary\nIntegrate OAuth 2.0 for third-party login...",
  "artifacts": [
    { "name": "wireframe.png", "size": 245760 }
  ],
  "created": "2026-04-01T09:00:00Z",
  "last_modified": "2026-04-09T10:15:00Z"
}
```

**Errors:** `404` if feature does not exist.

---

#### `POST /api/features`

Create a new feature.

**Request Body:**

```json
{
  "name": "Payment Processing",
  "status": "draft",
  "assignee": "Bob",
  "points": 8,
  "body": "## Summary\nPayment processing feature...",
  "add_to_backlog": true,
  "sprint": "sprint-3"
}
```

| Field            | Type    | Required | Default   | Description                                       |
|------------------|---------|----------|-----------|---------------------------------------------------|
| `name`           | string  | Yes      |           | Feature name. Auto-generates slug from this.      |
| `status`         | string  | No       | `draft`   | Initial workflow state.                           |
| `assignee`       | string  | No       |           | Team member name.                                 |
| `points`         | integer | No       |           | Story points.                                     |
| `body`           | string  | No       | (template)| Markdown body content.                            |
| `add_to_backlog` | boolean | No       | `false`   | Append to end of `backlog.md`.                    |
| `sprint`         | string  | No       |           | Add to a sprint by slug (writes to SPRINT.md).    |

**Response:** `201 Created` — Returns the created feature (same shape as GET).

**Errors:** `409` if slug already exists. `422` if status is not a valid workflow state.

---

#### `PUT /api/features/:slug`

Update a feature.

**Request Body:** Partial update — only include fields to change.

```json
{
  "status": "in-progress",
  "assignee": "Bob",
  "points": 5,
  "body": "Updated body content..."
}
```

| Field      | Type    | Description                                       |
|------------|---------|---------------------------------------------------|
| `name`     | string  | Update the feature name in frontmatter.           |
| `status`   | string  | Update the workflow state.                        |
| `assignee` | string  | Update the assignee. Use `null` to clear.         |
| `points`   | integer | Update story points. Use `null` to clear.         |
| `body`     | string  | Replace the markdown body.                        |

**Response:** `200 OK` — Returns the updated feature.

**Errors:** `404` if feature does not exist. `422` if status is not a valid workflow state.

---

#### `DELETE /api/features/:slug`

Delete a feature and its directory.

**Response:** `200 OK`

```json
{
  "slug": "oauth-integration",
  "deleted": true
}
```

Also removes the feature from `backlog.md` and from any sprint's `features` list.

**Errors:** `404` if feature does not exist.

---

#### `POST /api/features/:slug/artifacts`

Upload a supporting artifact to the feature directory.

**Request:** `multipart/form-data` with a `file` field.

**Response:** `201 Created`

```json
{
  "name": "wireframe.png",
  "size": 245760,
  "path": "folio/features/oauth-integration/wireframe.png"
}
```

---

### Backlog

#### `GET /api/backlog`

Get the ordered backlog.

**Response:** `200 OK`

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
    "status": "ready",
    "assignee": "Alice",
    "points": 5
  }
]
```

---

#### `PUT /api/backlog`

Reorder the backlog. Accepts the full ordered list of slugs. This replaces the contents of `backlog.md`.

**Request Body:**

```json
{
  "order": [
    "oauth-integration",
    "user-authentication",
    "payment-processing"
  ]
}
```

**Response:** `200 OK` — Returns the updated backlog (same shape as GET).

**Errors:** `422` if any slug references a non-existent feature.

---

#### `POST /api/backlog/:slug`

Add a feature to the backlog.

**Query Parameters:**

| Parameter  | Type    | Description                                           |
|------------|---------|-------------------------------------------------------|
| `position` | integer | Insert at this position (1-indexed). Default: end.    |

**Response:** `200 OK` — Returns the updated backlog.

**Errors:** `404` if feature does not exist. `409` if feature is already in the backlog.

---

#### `DELETE /api/backlog/:slug`

Remove a feature from the backlog (does not delete the feature itself).

**Response:** `200 OK` — Returns the updated backlog.

**Errors:** `404` if feature is not in the backlog.

---

### Issues

#### `GET /api/issues`

List all issues.

**Query Parameters:**

| Parameter  | Type   | Description                                                    |
|------------|--------|----------------------------------------------------------------|
| `status`   | string | Filter by status(es). Comma-separated for multiple.            |
| `assignee` | string | Filter by assignee name.                                       |
| `label`    | string | Filter by label. Comma-separated for multiple (AND logic).     |
| `feature`  | string | Filter by linked feature slug.                                 |
| `sprint`   | string | Filter by sprint slug. Use `none` for issues not in any sprint.|
| `sort`     | string | Sort field: `name`, `status`, `modified` (default: `name`).   |

**Response:** `200 OK`

```json
[
  {
    "name": "Login Timeout on Slow Connections",
    "slug": "login-timeout-on-slow-connections",
    "status": "open",
    "assignee": "Alice",
    "labels": ["bug", "security"],
    "linked_feature": "user-authentication",
    "sprint": "sprint-3",
    "last_modified": "2026-04-09T11:00:00Z"
  }
]
```

---

#### `GET /api/issues/:slug`

Get a single issue.

**Response:** `200 OK`

```json
{
  "name": "Login Timeout on Slow Connections",
  "slug": "login-timeout-on-slow-connections",
  "status": "open",
  "assignee": "Alice",
  "labels": ["bug", "security"],
  "linked_feature": "user-authentication",
  "sprint": "sprint-3",
  "path": "folio/issues/login-timeout-on-slow-connections/ISSUE.md",
  "body": "## Description\nUsers on slow connections experience login timeouts...",
  "artifacts": [],
  "created": "2026-04-05T14:00:00Z",
  "last_modified": "2026-04-09T11:00:00Z"
}
```

**Errors:** `404` if issue does not exist.

---

#### `POST /api/issues`

Create a new issue.

**Request Body:**

```json
{
  "name": "Missing Validation on File Upload",
  "status": "open",
  "assignee": "Alice",
  "labels": ["bug", "security"],
  "feature": "user-authentication",
  "sprint": "sprint-3",
  "body": "## Description\nFile upload endpoint accepts files without validation..."
}
```

| Field     | Type     | Required | Default | Description                                       |
|-----------|----------|----------|---------|---------------------------------------------------|
| `name`    | string   | Yes      |         | Issue name. Auto-generates slug.                  |
| `status`  | string   | No       | `open`  | Initial status.                                   |
| `assignee`| string   | No       |         | Team member name.                                 |
| `labels`  | string[] | No       | `[]`    | Categorization labels.                            |
| `feature` | string   | No       |         | Linked feature slug.                              |
| `sprint`  | string   | No       |         | Add to a sprint by slug (writes to SPRINT.md).    |
| `body`    | string   | No       |         | Markdown body content.                            |

**Response:** `201 Created` — Returns the created issue.

**Errors:** `409` if slug already exists. `422` if linked feature does not exist.

---

#### `PUT /api/issues/:slug`

Update an issue. Partial update — only include fields to change.

**Request Body:**

```json
{
  "status": "closed",
  "labels": ["bug", "security", "critical"]
}
```

| Field     | Type     | Description                                          |
|-----------|----------|------------------------------------------------------|
| `name`    | string   | Update the issue name.                               |
| `status`  | string   | Update the status.                                   |
| `assignee`| string   | Update the assignee. Use `null` to clear.            |
| `labels`  | string[] | Replace all labels. Use `[]` to clear.               |
| `feature` | string   | Update linked feature slug. Use `null` to unlink.    |
| `body`    | string   | Replace the markdown body.                           |

**Response:** `200 OK` — Returns the updated issue.

**Errors:** `404` if issue does not exist.

---

#### `DELETE /api/issues/:slug`

Delete an issue and its directory.

**Response:** `200 OK`

```json
{
  "slug": "login-timeout-on-slow-connections",
  "deleted": true
}
```

Also removes the issue from any sprint's `issues` list.

**Errors:** `404` if issue does not exist.

---

#### `POST /api/issues/:slug/artifacts`

Upload a supporting artifact. Same behavior as feature artifact upload.

---

### Sprints

#### `GET /api/sprints`

List all sprints.

**Query Parameters:**

| Parameter | Type   | Description                                                     |
|-----------|--------|-----------------------------------------------------------------|
| `status`  | string | Filter by status: `planning`, `active`, `completed`.            |
| `sort`    | string | Sort field: `name`, `start_date`, `status` (default: `-start_date`). |

**Response:** `200 OK`

```json
[
  {
    "name": "Sprint 3",
    "slug": "sprint-3",
    "status": "active",
    "start_date": "2026-04-07",
    "end_date": "2026-04-18",
    "days_remaining": 8,
    "goal": "Complete OAuth and fix critical bugs",
    "capacity": 40,
    "points_committed": 34,
    "points_completed": 21,
    "feature_count": 3,
    "issue_count": 2
  }
]
```

---

#### `GET /api/sprints/:slug`

Get a single sprint with expanded feature and issue details.

**Response:** `200 OK`

```json
{
  "name": "Sprint 3",
  "slug": "sprint-3",
  "status": "active",
  "start_date": "2026-04-07",
  "end_date": "2026-04-18",
  "days_remaining": 8,
  "goal": "Complete OAuth and fix critical bugs",
  "capacity": 40,
  "points_committed": 34,
  "points_completed": 21,
  "path": "folio/sprints/sprint-3/SPRINT.md",
  "body": "## Sprint Notes\n...",
  "features": [
    {
      "slug": "oauth-integration",
      "name": "OAuth Integration",
      "status": "in-progress",
      "assignee": "Bob",
      "points": 5
    }
  ],
  "issues": [
    {
      "slug": "login-timeout-on-slow-connections",
      "name": "Login Timeout on Slow Connections",
      "status": "open",
      "assignee": "Alice",
      "labels": ["bug"]
    }
  ]
}
```

**Errors:** `404` if sprint does not exist.

---

#### `GET /api/sprints/:slug/board`

Get the sprint board view — items organized by workflow state columns.

**Response:** `200 OK`

```json
{
  "name": "Sprint 3",
  "slug": "sprint-3",
  "columns": {
    "draft": [],
    "ready": [
      {
        "type": "feature",
        "slug": "payment-processing",
        "name": "Payment Processing",
        "assignee": null,
        "points": 8
      }
    ],
    "in-progress": [
      {
        "type": "feature",
        "slug": "oauth-integration",
        "name": "OAuth Integration",
        "assignee": "Bob",
        "points": 5
      },
      {
        "type": "issue",
        "slug": "login-timeout-on-slow-connections",
        "name": "Login Timeout",
        "assignee": "Alice",
        "labels": ["bug"]
      }
    ],
    "review": [],
    "done": [
      {
        "type": "feature",
        "slug": "user-authentication",
        "name": "User Authentication",
        "assignee": "Alice",
        "points": 8
      }
    ]
  }
}
```

Column keys are the workflow states from `folio.yaml`, in configured order.

---

#### `POST /api/sprints`

Create a new sprint.

**Request Body:**

```json
{
  "name": "Sprint 4",
  "start_date": "2026-04-21",
  "end_date": "2026-05-02",
  "goal": "Launch beta",
  "capacity": 45
}
```

| Field        | Type    | Required | Default    | Description                     |
|--------------|---------|----------|------------|---------------------------------|
| `name`       | string  | Yes      |            | Sprint name.                    |
| `start_date` | string  | Yes      |            | Start date (YYYY-MM-DD).        |
| `end_date`   | string  | Yes      |            | End date (YYYY-MM-DD).          |
| `goal`       | string  | No       |            | Sprint goal.                    |
| `capacity`   | integer | No       |            | Team capacity in points.        |

Status is always `planning` on creation.

**Response:** `201 Created` — Returns the created sprint.

**Errors:** `409` if slug already exists. `422` if end date is before start date.

---

#### `PUT /api/sprints/:slug`

Update sprint metadata. Partial update.

**Request Body:**

```json
{
  "goal": "Updated sprint goal",
  "capacity": 50
}
```

| Field        | Type    | Description                                 |
|--------------|---------|---------------------------------------------|
| `name`       | string  | Update the sprint name.                     |
| `start_date` | string  | Update start date.                          |
| `end_date`   | string  | Update end date.                            |
| `goal`       | string  | Update the sprint goal.                     |
| `capacity`   | integer | Update capacity.                            |
| `body`       | string  | Update the markdown body (notes/retro).     |

Status is not editable via PUT — use the lifecycle endpoints below.

**Response:** `200 OK` — Returns the updated sprint.

**Errors:** `404` if sprint does not exist. `422` if dates are invalid.

---

#### `DELETE /api/sprints/:slug`

Delete a sprint directory. Does not delete features or issues — they remain in their respective directories.

**Response:** `200 OK`

```json
{
  "slug": "sprint-3",
  "deleted": true,
  "orphaned_features": ["oauth-integration"],
  "orphaned_issues": ["login-timeout-on-slow-connections"]
}
```

**Errors:** `404` if sprint does not exist.

---

#### `POST /api/sprints/:slug/add`

Add a feature or issue to the sprint.

**Request Body:**

```json
{
  "slug": "oauth-integration",
  "type": "feature"
}
```

| Field  | Type   | Required | Description                                         |
|--------|--------|----------|-----------------------------------------------------|
| `slug` | string | Yes      | Feature or issue slug.                              |
| `type` | string | No       | `feature` or `issue`. Auto-detected if omitted.     |

Writes the slug to the sprint's `SPRINT.md` frontmatter (`features` or `issues` array).

**Response:** `200 OK` — Returns the updated sprint.

**Errors:** `404` if sprint or entity does not exist. `409` if entity is already in this sprint.

---

#### `POST /api/sprints/:slug/remove`

Remove a feature or issue from the sprint.

**Request Body:**

```json
{
  "slug": "oauth-integration",
  "type": "feature"
}
```

**Response:** `200 OK` — Returns the updated sprint.

**Errors:** `404` if sprint or entity is not in the sprint.

---

#### `POST /api/sprints/:slug/start`

Transition the sprint from `planning` to `active`.

**Response:** `200 OK` — Returns the updated sprint.

**Errors:** `409` if another sprint is already active. `422` if sprint is not in `planning` status.

---

#### `POST /api/sprints/:slug/complete`

Transition the sprint from `active` to `completed`.

**Response:** `200 OK` — Returns the updated sprint with final results.

**Errors:** `422` if sprint is not in `active` status.

---

### Wiki

Wiki pages support optional YAML frontmatter for `title` and `aliases` fields. If a page has no frontmatter, it is treated as a plain markdown file and its title is derived from the filename slug. The body may contain `[[wikilinks]]` that reference other wiki pages by slug or alias.

#### `GET /api/wiki`

List all wiki pages.

**Query Parameters:**

| Parameter | Type   | Description                                            |
|-----------|--------|--------------------------------------------------------|
| `sort`    | string | Sort field: `title`, `modified` (default: `title`).   |

**Response:** `200 OK`

```json
[
  {
    "title": "Project Brief",
    "slug": "project-brief",
    "path": "folio/wiki/project-brief.md",
    "aliases": [],
    "last_modified": "2026-04-01T09:00:00Z"
  },
  {
    "title": "OAuth Integration Notes",
    "slug": "oauth-notes",
    "path": "folio/wiki/oauth-notes.md",
    "aliases": ["oauth"],
    "last_modified": "2026-04-05T14:00:00Z"
  }
]
```

The `title` field is the frontmatter `title` if present, otherwise derived from the filename by converting slugs to title case (e.g., `project-brief.md` → "Project Brief").

---

#### `GET /api/wiki/:slug`

Get a single wiki page. The `:slug` parameter can match either a page's filename slug or any of its aliases.

**Response:** `200 OK`

```json
{
  "title": "OAuth Integration Notes",
  "slug": "oauth-notes",
  "path": "folio/wiki/oauth-notes.md",
  "aliases": ["oauth"],
  "body": "## Overview\n\nOAuth integration details...\n\nSee [[technical-docs]] for implementation.",
  "outgoing_links": [
    { "slug": "technical-docs", "title": "Technical Docs", "exists": true }
  ],
  "backlinks": [
    { "slug": "project-brief", "title": "Project Brief" },
    { "slug": "roadmap", "title": "Roadmap" }
  ],
  "last_modified": "2026-04-05T14:00:00Z"
}
```

The `outgoing_links` array lists all `[[wikilinks]]` found in the page body, with each entry indicating whether the target page exists. The `backlinks` array lists all wiki pages that contain a `[[wikilink]]` pointing to this page (by slug or alias).

**Errors:** `404` if page does not exist (no page matches the slug or alias).

---

#### `POST /api/wiki`

Create a new wiki page.

**Request Body:**

```json
{
  "slug": "api-guidelines",
  "title": "API Guidelines",
  "aliases": ["api-guide"],
  "body": "## REST Conventions\n\nAll endpoints follow REST naming conventions.\n\nSee [[technical-docs]] for details."
}
```

| Field     | Type     | Required | Description                                          |
|-----------|----------|----------|------------------------------------------------------|
| `slug`    | string   | Yes      | Filename slug (without `.md` extension).             |
| `title`   | string   | No       | Display title. If omitted, derived from slug.        |
| `aliases` | string[] | No       | Alternate slugs for wikilink resolution.             |
| `body`    | string   | No       | Markdown body content (may include `[[wikilinks]]`). |

If `title` or `aliases` are provided, they are written as YAML frontmatter. If neither is provided, the file is created as plain markdown (no frontmatter), preserving backward compatibility.

**Response:** `201 Created` — Returns the created page (same shape as GET).

**Errors:** `409` if a page with the same slug or alias already exists.

---

#### `PUT /api/wiki/:slug`

Update a wiki page's content and/or metadata. Partial update — only include fields to change.

**Request Body:**

```json
{
  "title": "Updated Title",
  "aliases": ["api-guide", "rest-guide"],
  "body": "Updated page content with [[wikilinks]]..."
}
```

| Field     | Type     | Description                                          |
|-----------|----------|------------------------------------------------------|
| `title`   | string   | Update the display title. Use `null` to revert to slug-derived title. |
| `aliases` | string[] | Replace all aliases. Use `[]` to clear.              |
| `body`    | string   | Replace the markdown body.                           |

**Response:** `200 OK` — Returns the updated page.

**Errors:** `404` if page does not exist. `409` if a new alias conflicts with an existing page slug or alias.

---

#### `DELETE /api/wiki/:slug`

Delete a wiki page.

**Response:** `200 OK`

```json
{
  "slug": "api-guidelines",
  "deleted": true,
  "broken_links": [
    { "slug": "technical-docs", "title": "Technical Docs" }
  ]
}
```

The `broken_links` array lists pages that contained `[[wikilinks]]` pointing to the deleted page. These links will now render as broken/stub links. The linking pages are **not** modified — the broken links serve as a prompt to update or create a replacement page.

**Errors:** `404` if page does not exist.

---

#### `GET /api/wiki/:slug/backlinks`

Get all pages that link to a specific wiki page.

**Response:** `200 OK`

```json
[
  {
    "slug": "project-brief",
    "title": "Project Brief",
    "path": "folio/wiki/project-brief.md",
    "last_modified": "2026-04-01T09:00:00Z"
  },
  {
    "slug": "roadmap",
    "title": "Roadmap",
    "path": "folio/wiki/roadmap.md",
    "last_modified": "2026-04-03T11:00:00Z"
  }
]
```

The `:slug` parameter can match a page's filename slug or any of its aliases.

**Errors:** `404` if the target page does not exist.

---

### Reviews

#### `GET /api/reviews`

List all review types.

**Response:** `200 OK`

```json
[
  {
    "type": "architecture",
    "path": "folio/reviews/architecture/REVIEW.md",
    "description": "Architectural review checklist and guidance"
  },
  {
    "type": "security",
    "path": "folio/reviews/security/REVIEW.md",
    "description": "Security review checklist"
  }
]
```

The `description` field is extracted from the first line or paragraph of the `REVIEW.md` body.

---

#### `GET /api/reviews/:type`

Get a review's guidance document.

**Response:** `200 OK`

```json
{
  "type": "security",
  "path": "folio/reviews/security/REVIEW.md",
  "body": "## Purpose\n\nEnsure the application meets security standards...\n\n## Checklist\n- [ ] Authentication flows reviewed\n..."
}
```

**Errors:** `404` if review type does not exist.

---

#### `POST /api/reviews`

Create a new review type.

**Request Body:**

```json
{
  "type": "performance",
  "body": "## Purpose\n\nEnsure acceptable performance under load.\n\n## Checklist\n- [ ] Load testing completed"
}
```

| Field  | Type   | Required | Description                                   |
|--------|--------|----------|-----------------------------------------------|
| `type` | string | Yes      | Review type name (used as directory slug).    |
| `body` | string | No       | Markdown body. Defaults to minimal template.  |

**Response:** `201 Created` — Returns the created review.

**Errors:** `409` if review type already exists.

---

#### `PUT /api/reviews/:type`

Update a review's guidance document.

**Request Body:**

```json
{
  "body": "Updated review content..."
}
```

**Response:** `200 OK` — Returns the updated review.

**Errors:** `404` if review type does not exist.

---

#### `DELETE /api/reviews/:type`

Delete a review type and its directory.

**Response:** `200 OK`

```json
{
  "type": "performance",
  "deleted": true
}
```

**Errors:** `404` if review type does not exist.

---

### Team

#### `GET /api/team`

List all team members.

**Response:** `200 OK`

```json
[
  {
    "name": "Alice Johnson",
    "role": "engineer",
    "github": "alicej",
    "assignments": {
      "features": 2,
      "issues": 1
    }
  },
  {
    "name": "Bob Smith",
    "role": "designer",
    "github": "bobs",
    "assignments": {
      "features": 1,
      "issues": 0
    }
  }
]
```

The `assignments` field is computed by scanning feature and issue frontmatter for matching assignee values.

If `team.md` does not exist, returns an empty array.

---

#### `POST /api/team`

Add a team member.

**Request Body:**

```json
{
  "name": "Eve Martinez",
  "role": "engineer",
  "github": "evem"
}
```

| Field    | Type   | Required | Description                              |
|----------|--------|----------|------------------------------------------|
| `name`   | string | Yes      | Display name. Must be unique.            |
| `role`   | string | No       | Team role.                               |
| `github` | string | No       | GitHub username.                         |

If `team.md` does not exist, creates it.

**Response:** `201 Created` — Returns the created member (same shape as list item).

**Errors:** `409` if a member with the same name already exists.

---

#### `PUT /api/team/:name`

Update a team member's role or GitHub handle.

**Request Body:**

```json
{
  "role": "senior engineer",
  "github": "evem"
}
```

| Field    | Type   | Description                                       |
|----------|--------|---------------------------------------------------|
| `role`   | string | Update role.                                      |
| `github` | string | Update GitHub handle.                             |

Name is not updatable via PUT (it is the assignment key). To change a name, remove and re-add.

**Response:** `200 OK` — Returns the updated member.

**Errors:** `404` if member does not exist.

---

#### `DELETE /api/team/:name`

Remove a team member.

**Response:** `200 OK`

```json
{
  "name": "Eve Martinez",
  "removed": true,
  "affected_assignments": {
    "features": ["oauth-integration"],
    "issues": []
  }
}
```

The response includes any features or issues still assigned to this member. Their assignments are **not** automatically cleared — the team should reassign manually.

**Errors:** `404` if member does not exist.

---

### Health (Doctor)

#### `POST /api/doctor`

Run health checks and cache the results.

**Request Body (optional):**

```json
{
  "checks": ["backlog-consistency", "team-consistency"]
}
```

If `checks` is omitted or empty, all checks are run. Results are written to `folio/.doctor-cache.json`.

**Response:** `200 OK`

```json
{
  "timestamp": "2026-04-10T14:32:00Z",
  "checks": [
    {
      "name": "directory-structure",
      "status": "pass",
      "message": "folio/ directory structure is valid"
    },
    {
      "name": "config",
      "status": "pass",
      "message": "folio.yaml is valid"
    },
    {
      "name": "wiki",
      "status": "warn",
      "message": "Missing recommended wiki page: personas.md"
    },
    {
      "name": "backlog-consistency",
      "status": "fail",
      "message": "backlog.md references non-existent feature: \"removed-feature\""
    }
  ],
  "summary": {
    "passed": 7,
    "warnings": 2,
    "failed": 1
  }
}
```

---

#### `GET /api/doctor`

Get cached health check results from the last run.

**Response:** `200 OK` — Same shape as POST response, read from `folio/.doctor-cache.json`.

**Response (no cached results):** `200 OK`

```json
{
  "timestamp": null,
  "checks": [],
  "summary": {
    "passed": 0,
    "warnings": 0,
    "failed": 0
  }
}
```

---

### Status

#### `GET /api/status`

Get a project summary. This is the data source for the dashboard.

**Response:** `200 OK`

```json
{
  "project_name": "My Project",
  "features": {
    "total": 5,
    "by_status": {
      "draft": 2,
      "ready": 1,
      "in-progress": 1,
      "review": 0,
      "done": 1
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
      "planning": 1,
      "active": 1,
      "completed": 2
    }
  },
  "active_sprint": {
    "name": "Sprint 3",
    "slug": "sprint-3",
    "end_date": "2026-04-18",
    "days_remaining": 8,
    "points_completed": 21,
    "points_committed": 34,
    "capacity": 40,
    "feature_count": 3,
    "issue_count": 2
  },
  "backlog_count": 3,
  "wiki_count": 6
}
```

`active_sprint` is `null` if no sprint is currently active.

---

### VCS

#### `GET /api/vcs/status`

Get version control status. Returns `null` if no VCS is detected.

**Response:** `200 OK`

```json
{
  "branch": "feature/oauth",
  "dirty": true,
  "last_commit": {
    "hash": "abc1234",
    "message": "Fix upload validation",
    "author": "Alice",
    "timestamp": "2026-04-10T12:30:00Z"
  }
}
```

**Response (no VCS detected):** `200 OK`

```json
null
```

The backend caches VCS status with a short TTL (e.g., 5 seconds) to avoid repeated filesystem or subprocess calls.

---

### Configuration

#### `GET /api/config`

Get the project configuration.

**Response:** `200 OK`

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
  },
  "raw": "workflow:\n  states:\n    - draft\n    - ready\n..."
}
```

The `raw` field contains the unprocessed `folio.yaml` content for the raw editor tab.

---

#### `PUT /api/config`

Update the project configuration.

**Request Body:**

```json
{
  "workflow": {
    "states": ["draft", "ready", "in-progress", "review", "done", "deployed"]
  }
}
```

Or update via raw YAML:

```json
{
  "raw": "workflow:\n  states:\n    - draft\n    - ready\n..."
}
```

If `raw` is provided, it takes precedence over structured fields.

**Response:** `200 OK` — Returns the updated configuration.

**Errors:** `422` if YAML is invalid or if removing a workflow state currently in use by features (returns a warning list).

---

### Search

#### `GET /api/search`

Full-text search across all project content.

**Query Parameters:**

| Parameter | Type   | Required | Description                                               |
|-----------|--------|----------|-----------------------------------------------------------|
| `q`       | string | Yes      | Search query.                                              |
| `type`    | string | No       | Filter by type: `feature`, `issue`, `wiki`, `sprint`, `review`. Comma-separated. |
| `limit`   | integer| No       | Max results (default: 20).                                 |

**Response:** `200 OK`

```json
{
  "query": "authentication",
  "total": 3,
  "results": [
    {
      "type": "feature",
      "name": "User Authentication",
      "slug": "user-authentication",
      "path": "folio/features/user-authentication/FEATURE.md",
      "status": "in-progress",
      "assignee": "Alice",
      "snippet": "...implement **authentication** using OAuth 2.0...",
      "line": 12
    },
    {
      "type": "issue",
      "name": "Login Timeout on Slow Connections",
      "slug": "login-timeout-on-slow-connections",
      "path": "folio/issues/login-timeout-on-slow-connections/ISSUE.md",
      "snippet": "...users experience **authentication** timeouts...",
      "line": 5
    }
  ]
}
```

Search performs substring matching across filenames, frontmatter values, and markdown body content. Matching terms in the `snippet` are wrapped in `**bold**` markers.

---

### Chat

#### `POST /api/chat`

Send a chat message and receive a streaming LLM response.

**Request Body:**

```json
{
  "messages": [
    { "role": "user", "content": "What features are currently in progress?" }
  ],
  "model": "anthropic/claude-sonnet-4-20250514"
}
```

| Field      | Type     | Required | Description                                      |
|------------|----------|----------|--------------------------------------------------|
| `messages` | object[] | Yes      | Conversation history (role + content pairs).     |
| `model`    | string   | No       | LLM model identifier. Uses default if omitted.  |

**Response:** `200 OK` with `Content-Type: text/event-stream`

The response is a Server-Sent Events (SSE) stream compatible with the Vercel AI SDK's `useChat` hook. The Go backend:

1. Assembles a system prompt with project context (entity names, statuses, metadata — not full document bodies).
2. If the user's message references a specific entity, reads the relevant file(s) and injects content into the context.
3. Forwards the request to the configured LLM provider's HTTP API.
4. Streams the response back as SSE events.

**Errors (non-streaming):**

| Status | Code              | Description                                           |
|--------|-------------------|-------------------------------------------------------|
| `400`  | `bad_request`     | Missing or invalid messages array.                    |
| `401`  | `auth_failed`     | Invalid API key for the configured provider.          |
| `503`  | `provider_error`  | LLM provider is unreachable or rate-limiting.         |

If no API keys are configured, this endpoint returns `404`.

#### `GET /api/chat/config`

Get chat availability and configuration.

**Response:** `200 OK`

```json
{
  "available": true,
  "models": [
    { "id": "anthropic/claude-sonnet-4-20250514", "provider": "anthropic", "name": "Claude Sonnet" },
    { "id": "openai/gpt-4o", "provider": "openai", "name": "GPT-4o" }
  ],
  "default_model": "anthropic/claude-sonnet-4-20250514"
}
```

If no API keys are configured:

```json
{
  "available": false,
  "models": [],
  "default_model": null
}
```

The frontend uses this endpoint on load to determine whether to show the chat toggle.
