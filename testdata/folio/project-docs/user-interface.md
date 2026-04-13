---
title: Web User Interface Specification
order: 2
---

# Folio — Web User Interface Specification

## Overview

Forge's web UI is a single-page application embedded in the Go binary and served locally via `folio serve`. It provides the entire team — product owners, designers, engineers — with a visual interface for managing the project wiki, features, issues, and reviews.

The UI reads and writes the same filesystem structure as the CLI. There is no database; the filesystem under `folio/` is the source of truth.

### Design Goals

- **Accessible to non-technical team members.** Product owners and designers should be able to manage features, write wiki pages, and review backlogs without touching the terminal.
- **Real-time filesystem reflection.** Changes made via the CLI or direct file edits should be reflected in the UI on next navigation or refresh. The UI does not cache aggressively.
- **Markdown-native.** All content is authored and stored as markdown. The UI provides rich editing and rendering, but never abstracts away the underlying format.
- **Framework-agnostic implementation.** This spec describes screens, components, and behaviors without prescribing a frontend framework. The implementation may use React, Svelte, or another SPA framework.

---

## Global Layout

The application uses a **sidebar + content area** layout.

### Sidebar

The sidebar is persistent across all views and provides top-level navigation:

| Nav Item        | Route            | Description                          |
|-----------------|------------------|--------------------------------------|
| Dashboard       | `/`              | Project overview and health summary  |
| Wiki            | `/wiki`          | Project knowledge base (wikilinked)  |
| Features        | `/features`      | Feature management and backlog       |
| Sprints         | `/sprints`       | Sprint planning and board views      |
| Issues          | `/issues`        | Issue tracking                       |
| Reviews         | `/reviews`       | Review guidance and health checks    |
| Team            | `/team`          | Team members and roles               |
| Configuration   | `/config`        | Project settings (`folio.yaml`)      |

The sidebar displays the project name (derived from `folio.yaml` or the parent directory name) at the top.

Below the project name, the sidebar shows a **VCS status indicator** (see [Version Control Status](#version-control-status) below).

The sidebar is collapsible on smaller viewports to maximize content area.

### Header

Each content area view includes a header with:

- **Breadcrumbs** — Show the navigation path (e.g., `Features > feature-alpha > Edit`).
- **Primary action button** — Context-sensitive (e.g., "New Feature" on the features list, "Edit" on a feature detail view).

### Responsive Behavior

The UI should be functional on tablet-sized viewports and above. Mobile optimization is not a Phase 1 requirement, but the layout should not break on smaller screens. The sidebar collapses to a hamburger menu below a configurable breakpoint.

---

## Version Control Status

The UI displays version control information in the sidebar, directly below the project name. This feature is **modular** — the VCS provider is abstracted behind an interface so alternative providers can be added in the future — but the default (and only Phase 1) implementation is **git**.

### Sidebar VCS Indicator

A compact display showing:

| Element           | Description                                                        |
|-------------------|--------------------------------------------------------------------|
| Branch icon       | A branch/fork icon indicating VCS is active.                       |
| Current branch    | The active branch name (e.g., `main`, `feature/oauth`).           |
| Dirty indicator   | A small dot or badge when there are uncommitted changes in the working tree. |

- If no VCS is detected (e.g., the project is not a git repo), the indicator is hidden entirely. No error is shown — Folio is VCS-agnostic by principle, and VCS display is informational only.
- The branch name truncates with an ellipsis if it exceeds the sidebar width. The full name is shown in a tooltip on hover.
- Clicking the VCS indicator does nothing in Phase 1 — it is display-only. Future phases may open a VCS detail panel.

### Dashboard VCS Section

The Dashboard includes a VCS card (shown only when a VCS provider is detected):

| Element            | Description                                                       |
|--------------------|-------------------------------------------------------------------|
| Current branch     | Full branch name.                                                 |
| Working tree status| Clean / N uncommitted changes.                                    |
| Last commit        | Short hash, message, author, and relative timestamp (e.g., "2 hours ago"). |

This card is informational. Folio does not perform any VCS operations (no commits, no pushes, no pulls). It reads VCS state to provide situational awareness.

### Architecture Note

The VCS integration is implemented behind a `VCSProvider` interface on the backend:

```
VCSProvider {
    Detect(projectPath) -> bool
    CurrentBranch() -> string
    IsDirty() -> bool
    LastCommit() -> { hash, message, author, timestamp }
}
```

The Go backend checks for a VCS provider on startup (or on each request, with short-lived caching). The git implementation shells out to `git` commands or reads `.git/` directly. The frontend receives VCS state as part of a `/api/vcs/status` endpoint and renders it — it has no knowledge of which VCS provider is in use.

If no provider is detected, the endpoint returns `null` and the UI hides all VCS elements.

---

## Dashboard

**Route:** `/`

The dashboard is the landing page after launching `folio serve`. It provides a high-level snapshot of the project's current state.

### Sections

#### Project Summary

- Project name and a one-line description (from `folio.yaml` or `project-brief.md` if present).
- Count of wiki pages, features, and issues.

#### Backlog Snapshot

- The top 5 features from `features/backlog.md`, displayed as a numbered list.
- Each item shows: feature name, current status (as a badge), and assignee (if set).
- Link to the full backlog view.

#### Feature Status Distribution

- A visual summary (bar chart or grouped badges) showing how many features are in each workflow state (e.g., 3 draft, 2 ready, 1 in-progress, 1 review, 4 done).
- Clicking a status group navigates to the features list filtered by that status.

#### Recent Issues

- The 5 most recently modified issues, showing: issue name, status, and labels.
- Link to the full issues list.

#### Active Sprint

Shown only when a sprint with status "active" exists. If no sprint is active, this section displays a prompt: "No active sprint. Start planning one?" with a link to `/sprints`.

When an active sprint exists, the card shows:

| Element           | Description                                                          |
|-------------------|----------------------------------------------------------------------|
| Sprint name       | Linked to the sprint board view.                                     |
| Date range        | Start and end dates, with "N days remaining" or "Ended N days ago".  |
| Goal              | The sprint goal text.                                                |
| Progress bar      | Points completed vs. total committed points (e.g., "21 / 40 pts").  |
| Status breakdown  | Mini-badges showing count of items per workflow state.               |

Clicking anywhere on the card navigates to the sprint board view (`/sprints/:slug`).

#### Folio Health

- A summary of the last `folio doctor` run (or a prompt to run it if never executed).
- Displays pass/warn/fail counts.
- Link to the full health check view under Reviews.

---

## Wiki

**Route:** `/wiki`

### List View (`/wiki`)

Displays all markdown files in `folio/wiki/` as a flat list.

| Column       | Description                                      |
|--------------|--------------------------------------------------|
| Page         | Page title (from frontmatter `title` field, or filename rendered as title case) |
| Aliases      | Alternate slugs (from frontmatter), or "—" if none |
| Last Modified| Filesystem modification timestamp                |

- Sorted alphabetically by title by default, with an option to sort by last modified.
- **Primary action:** "New Page" button opens the create flow.
- Clicking a page title navigates to the detail view.

### Detail View (`/wiki/:slug`)

Renders the wiki page markdown with full formatting (headings, lists, tables, code blocks, links).

#### Wikilink Rendering

`[[wikilinks]]` in the page body are rendered as clickable internal links:

- **Existing pages:** Styled as standard internal links. Clicking navigates to `/wiki/:target-slug`. The link text is either the custom display text (for `[[slug|display text]]`) or the target page's title (for `[[slug]]`).
- **Non-existing pages:** Styled distinctly (red text, dashed underline) to indicate the target page does not exist yet. Clicking navigates to `/wiki/new?slug=<target-slug>&title=<Target Title>`, pre-filling the create form with the slug and a title derived from the slug.

#### Backlinks Section

Below the rendered page content, a **"Linked from"** section displays all wiki pages that contain a `[[wikilink]]` pointing to the current page (by slug or alias):

- Each backlink is shown as the linking page's title, rendered as a link to that page's detail view.
- If no pages link to the current page, this section is hidden.

#### Page Metadata

If the page has frontmatter metadata, display it as subtle metadata below the page title:

- **Aliases:** Shown as small tag-style badges (e.g., "Also known as: `oauth`, `oauth-notes`").

#### Header Actions

- "Edit" — Opens the editor view.
- "Delete" — Opens a confirmation dialog. If other pages link to this page, the dialog warns: "N pages link to this page. Deleting it will create broken links." On confirm, deletes the file from `wiki/`.

### Create / Edit View (`/wiki/:slug/edit` or `/wiki/new`)

A split-pane editor with metadata fields above:

#### Metadata Fields

| Field        | Type       | Required | Description                                |
|--------------|------------|----------|--------------------------------------------|
| Slug         | Text input | Yes      | Slug-format filename (auto-generated from title, editable). Only shown on create. |
| Title        | Text input | No       | Display title. If left blank, the slug-derived title is used. |
| Aliases      | Tag input  | No       | Alternate slugs for wikilink resolution. Comma-separated or tag-style input. |

#### Content Editor

- **Left pane:** Raw markdown editor with syntax highlighting, line numbers, and basic keyboard shortcuts (bold, italic, headings, lists).
- **Right pane:** Live-rendered markdown preview, updating on each keystroke (debounced). `[[wikilinks]]` in the preview are rendered with their target page's title and styled as internal links (or as broken links if the target doesn't exist).

#### Auto-Stub Pre-fill

When navigating to `/wiki/new?slug=<slug>&title=<title>` (e.g., from clicking a broken wikilink), the create form pre-fills the slug and title fields with the provided query parameters.

#### Save Behavior

- **Save** writes the file to `folio/wiki/{slug}.md`. If `title` or `aliases` are provided, they are serialized as YAML frontmatter prepended to the markdown body. If neither is set, the file is written as plain markdown.
- **Cancel** discards changes and returns to the list or detail view.
- On create, if a file with the same slug already exists, or if any alias conflicts with an existing page slug or alias, display an inline error and prevent save.

---

## Features

### List View (`/features`)

**Route:** `/features`

Displays all features found under `folio/features/` (each subdirectory containing a `FEATURE.md`).

| Column       | Description                                                |
|--------------|------------------------------------------------------------|
| Name         | Feature directory name, rendered as a human-readable title |
| Status       | Current workflow state, displayed as a colored badge       |
| Assignee     | Assigned team member (from frontmatter), or "Unassigned"   |
| Points       | Story points or effort estimate (from frontmatter)         |
| Priority     | Backlog position from `features/backlog.md` (e.g., #1, #2) or "Unprioritized" |

#### Filtering and Sorting

- **Filter by status:** Dropdown or toggle buttons for each workflow state. Multiple statuses can be selected simultaneously.
- **Filter by assignee:** Dropdown listing all known assignees.
- **Sort by:** Name (alpha), status (workflow order), priority (backlog position), or last modified.
- Active filters are displayed as removable chips above the table.

#### Actions

- **Primary action:** "New Feature" button opens the create flow.
- **Bulk actions:** Checkbox selection on rows enables bulk status transitions (e.g., move selected to "ready").

### Detail View (`/features/:slug`)

**Route:** `/features/:slug`

Displays the full content of a feature's `FEATURE.md`, rendered as markdown, alongside a metadata sidebar.

#### Content Area

- Rendered markdown body of `FEATURE.md` (everything below the frontmatter).
- Full formatting support: headings, lists, tables, code blocks, images, links.

#### Metadata Sidebar

Displays frontmatter fields in a structured panel:

| Field        | Display                    | Editable Inline |
|--------------|----------------------------|-----------------|
| Status       | Colored badge + dropdown   | Yes             |
| Assignee     | Text or avatar             | Yes             |
| Points       | Numeric display            | Yes             |
| Sprint       | Sprint name (linked to board view), or "None" | No (managed via sprint planning view) |
| Priority     | Backlog position           | No (managed via backlog view) |
| Created      | Timestamp                  | No              |
| Last Modified| Timestamp                  | No              |

- Inline-editable fields save immediately on change (optimistic update with error toast on failure).
- Status changes respect the configured workflow order. The dropdown only shows valid transitions (e.g., from "draft" the options are "ready", not "done").

#### Header Actions

- **Edit** — Opens the full editor for the feature body and metadata.
- **Delete** — Confirmation dialog. On confirm, removes the feature directory and updates `backlog.md` to remove the entry.

#### Supporting Artifacts

Below the main content, list any additional files in the feature directory (wireframes, specs, images, etc.):

| Column       | Description                                   |
|--------------|-----------------------------------------------|
| Filename     | Name of the file                              |
| Type         | File extension / MIME type icon               |
| Size         | File size                                     |

- Image files display as thumbnails.
- Clicking a file opens it in a new tab or downloads it.
- **Upload** button allows adding new artifacts to the feature directory.

### Create / Edit View (`/features/new` or `/features/:slug/edit`)

#### Metadata Fields

| Field        | Type           | Required | Description                              |
|--------------|----------------|----------|------------------------------------------|
| Name         | Text input     | Yes      | Feature name. Auto-generates directory slug. Only shown on create. |
| Status       | Dropdown       | Yes      | Workflow state. Defaults to "draft" on create. |
| Assignee     | Text input     | No       | Team member name or identifier.          |
| Points       | Numeric input  | No       | Story points or effort estimate.         |

#### Content Editor

Same split-pane markdown editor as Wiki pages (raw editor + live preview).

The editor pre-populates with a feature template if one is defined in the project's template source or `folio.yaml`.

#### Save Behavior

- On create: creates `folio/features/{slug}/FEATURE.md` with the metadata as YAML frontmatter and the content as the markdown body.
- On edit: updates the existing `FEATURE.md`, preserving any frontmatter fields not exposed in the form.
- After creating a new feature, prompt the user: "Add to backlog?" If yes, append the feature to the end of `features/backlog.md`.

### Backlog View (`/features/backlog`)

**Route:** `/features/backlog`

A dedicated view for managing feature priority order. This view reads and writes `features/backlog.md`.

#### Display

An ordered list of features, rendered as draggable cards:

| Element      | Description                                      |
|--------------|--------------------------------------------------|
| Position     | Numeric rank (#1, #2, #3, ...)                   |
| Feature Name | Linked to the feature detail view                |
| Status       | Colored badge                                    |
| Assignee     | Name or "Unassigned"                             |
| Points       | Effort estimate                                  |

#### Interactions

- **Drag and drop** — Reorder features by dragging cards to a new position. Changes persist to `backlog.md` on drop.
- **Promote / Demote buttons** — Arrow buttons on each card to move it up or down one position. Useful for keyboard and accessibility.
- **Remove from backlog** — Remove a feature from the prioritized list without deleting the feature itself.
- **Add to backlog** — A dropdown or search input to add an existing (unprioritized) feature to the backlog at a specific position.

#### Unprioritized Features

Below the backlog list, show a section of features that exist in `folio/features/` but are not listed in `backlog.md`. Each has an "Add to backlog" action.

---

## Issues

### List View (`/issues`)

**Route:** `/issues`

Displays all issues found under `folio/issues/` (each subdirectory containing an `ISSUE.md`).

| Column         | Description                                              |
|----------------|----------------------------------------------------------|
| Name           | Issue directory name, rendered as a human-readable title |
| Status         | Current status as a badge                                |
| Assignee       | Assigned team member, or "Unassigned"                    |
| Labels         | Comma-separated label badges                             |
| Linked Feature | Associated feature name (linked), or "—"                 |
| Last Modified  | Filesystem modification timestamp                        |

#### Filtering and Sorting

- **Filter by status:** Dropdown or toggle buttons.
- **Filter by label:** Multi-select dropdown listing all known labels.
- **Filter by assignee:** Dropdown.
- **Filter by linked feature:** Dropdown listing all features.
- **Sort by:** Name, status, last modified.

#### Actions

- **Primary action:** "New Issue" button opens the create flow.

### Detail View (`/issues/:slug`)

**Route:** `/issues/:slug`

Same layout pattern as features: rendered markdown body + metadata sidebar.

#### Metadata Sidebar

| Field          | Display                    | Editable Inline |
|----------------|----------------------------|-----------------|
| Status         | Badge + dropdown           | Yes             |
| Assignee       | Text                       | Yes             |
| Labels         | Editable tag list          | Yes             |
| Linked Feature | Dropdown of features       | Yes             |
| Sprint         | Sprint name (linked), or "None" | No (managed via sprint planning view) |
| Created        | Timestamp                  | No              |
| Last Modified  | Timestamp                  | No              |

#### Header Actions

- **Edit** — Opens the full editor.
- **Delete** — Confirmation dialog. On confirm, removes the issue directory.

#### Supporting Artifacts

Same pattern as features — list additional files, support upload.

### Create / Edit View (`/issues/new` or `/issues/:slug/edit`)

#### Metadata Fields

| Field          | Type             | Required | Description                             |
|----------------|------------------|----------|-----------------------------------------|
| Name           | Text input       | Yes      | Issue name. Auto-generates directory slug. Only on create. |
| Status         | Dropdown         | Yes      | Defaults to "open" on create.           |
| Assignee       | Text input       | No       | Team member name or identifier.         |
| Labels         | Tag input        | No       | Comma-separated or tag-style input.     |
| Linked Feature | Dropdown         | No       | Select from existing features.          |

#### Content Editor

Split-pane markdown editor. Pre-populates with an issue template if defined.

#### Save Behavior

- On create: creates `folio/issues/{slug}/ISSUE.md` with YAML frontmatter and markdown body.
- On edit: updates the existing `ISSUE.md`.

---

## Sprints

Sprints are time-boxed iterations that group features and issues into a focused delivery cycle. Each sprint is stored as a directory under `folio/sprints/` containing a `SPRINT.md` file with YAML frontmatter for metadata and a markdown body listing assigned work items.

### Filesystem Structure

```
folio/sprints/
├── sprint-1/
│   └── SPRINT.md
├── sprint-2/
│   └── SPRINT.md
└── sprint-3/
    └── SPRINT.md
```

### SPRINT.md Format

```yaml
---
name: Sprint 3
status: active        # planning | active | completed
start_date: 2026-04-14
end_date: 2026-04-25
goal: "Ship OAuth integration and resolve critical upload bugs"
capacity: 40          # total available story points
features:
  - oauth-integration
  - payment-processing
issues:
  - missing-validation-on-file-upload
  - login-timeout-on-slow-connections
---

## Sprint Notes

Optional markdown body for retrospective notes, observations, or context.
```

### List View (`/sprints`)

**Route:** `/sprints`

Displays all sprints, grouped by status.

#### Active Sprint (top section)

If a sprint has status "active", it is displayed prominently at the top as a large card with:

| Element         | Description                                                        |
|-----------------|--------------------------------------------------------------------|
| Sprint name     | Linked to the board view.                                          |
| Date range      | Start and end dates with days remaining.                           |
| Goal            | Sprint goal text.                                                  |
| Progress bar    | Points completed vs. capacity (e.g., "21 / 40 pts").              |
| "View Board"    | Button linking to `/sprints/:slug`.                                |

Only one sprint may be active at a time. The UI enforces this when starting a sprint.

#### Planning / Completed Sprints

Below the active sprint (or in its place if none is active), show a table of all other sprints:

| Column       | Description                                              |
|--------------|----------------------------------------------------------|
| Name         | Sprint name, linked to the board or detail view          |
| Status       | Planning / Completed, displayed as a badge               |
| Dates        | Start — End date range                                   |
| Goal         | Truncated goal text                                      |
| Progress     | Points completed / capacity (e.g., "35 / 40")           |

- Sorted by start date descending (most recent first).
- Completed sprints can be collapsed/expanded to reduce clutter.

#### Actions

- **Primary action:** "New Sprint" button opens the create flow.

### Board View (`/sprints/:slug`)

**Route:** `/sprints/:slug`

A **kanban-style board** showing all features and issues assigned to the sprint, organized by workflow state.

#### Sprint Header

A banner at the top of the board displaying:

| Element            | Description                                                      |
|--------------------|------------------------------------------------------------------|
| Sprint name        | Editable inline (click to rename).                               |
| Status badge       | Planning / Active / Completed.                                   |
| Date range         | Start — End, with "N days remaining" when active.                |
| Goal               | Sprint goal, displayed below the name.                           |
| Progress bar       | Points completed vs. capacity, with numeric label.               |
| Actions            | "Start Sprint", "Complete Sprint", "Edit", "Plan" buttons (context-sensitive based on status). |

- **"Start Sprint"** — Visible when status is "planning". Sets status to "active". If another sprint is already active, display a confirmation: "Sprint N is currently active. Complete it first, or start this sprint anyway?" Starting a new sprint does not automatically complete the previous one.
- **"Complete Sprint"** — Visible when status is "active". Sets status to "completed". Prompts: "N items are not in 'done' state. Complete the sprint anyway?" Incomplete items remain assigned to the sprint (they are not automatically moved).
- **"Plan"** — Opens the sprint planning view.
- **"Edit"** — Opens the sprint edit form.

#### Board Columns

One column per workflow state, in configured order (e.g., Draft | Ready | In Progress | Review | Done):

| Element         | Description                                                      |
|-----------------|------------------------------------------------------------------|
| Column header   | Workflow state name + count of items in that column.             |
| Cards           | One card per feature or issue in that state.                     |

#### Cards

Each card displays:

| Element         | Description                                                      |
|-----------------|------------------------------------------------------------------|
| Entity type     | A small icon or label distinguishing features from issues.       |
| Name            | Feature or issue name, linked to the entity detail view.         |
| Assignee        | Avatar or name, or "Unassigned".                                 |
| Points          | Story points (features only). Issues display "—".                |
| Labels          | Label badges (issues only).                                      |

#### Card Interactions

- **Drag and drop** — Drag a card between columns to update its workflow status. The status change is written to the entity's frontmatter (`FEATURE.md` or `ISSUE.md`) on drop.
- **Click** — Navigate to the entity detail view.
- **Quick assign** — Right-click or hover menu to reassign without leaving the board.

#### Empty Columns

Columns with no items show a subtle dashed border and a "No items" placeholder. They remain visible to allow drag-and-drop targets.

### Planning View (`/sprints/:slug/plan`)

**Route:** `//sprints/:slug/plan`

A dedicated view for composing the sprint's content. Uses a **two-panel layout**:

#### Left Panel — Available Work

Shows features and issues that are **not** assigned to any sprint, pulled from the backlog and issue list:

- **Tabs:** "Features" and "Issues" to switch between entity types.
- **Features tab:** Shows features from the backlog (in priority order) that are not assigned to any sprint. Columns: Name, Status, Points, Priority.
- **Issues tab:** Shows unassigned issues. Columns: Name, Status, Labels.
- **Search/filter** — A text search and status filter to narrow the available items.

#### Right Panel — Sprint Contents

Shows features and issues currently assigned to this sprint:

- Grouped by type (Features, then Issues).
- Each item shows: Name, Status, Points (features), Labels (issues).
- **Remove** button (✕) on each item to unassign it from the sprint.

#### Interactions

- **Drag and drop** — Drag items from the left panel to the right panel to assign them to the sprint (and vice versa to unassign).
- **Add button** — Each item in the left panel has an "Add" button (→) as an alternative to drag-and-drop.
- **Running totals** — The right panel header shows: "N features, N issues — N / {capacity} points committed". If committed points exceed capacity, the total is displayed in a warning color.

#### Save Behavior

Changes are saved to the sprint's `SPRINT.md` frontmatter (features and issues lists) on each add/remove action. No explicit "Save" button is needed.

### Create / Edit View (`/sprints/new` or `/sprints/:slug/edit`)

#### Metadata Fields

| Field        | Type           | Required | Description                                       |
|--------------|----------------|----------|---------------------------------------------------|
| Name         | Text input     | Yes      | Sprint name (e.g., "Sprint 3"). Auto-generates directory slug. Only on create. |
| Start Date   | Date picker    | Yes      | Sprint start date.                                 |
| End Date     | Date picker    | Yes      | Sprint end date. Must be after start date.         |
| Goal         | Text area      | No       | A short statement of what the sprint aims to deliver. |
| Capacity     | Numeric input  | No       | Total available story points for the sprint.       |

- **Status** is not editable in this form — it is managed via the "Start Sprint" and "Complete Sprint" actions on the board view.
- On create, status defaults to "planning".

#### Content Editor

Below the metadata fields, a markdown editor for the sprint body (retrospective notes, etc.). Same split-pane editor as other entity types.

#### Save Behavior

- On create: creates `folio/sprints/{slug}/SPRINT.md` with metadata as YAML frontmatter and body as markdown.
- On edit: updates the existing `SPRINT.md`, preserving the features/issues lists in frontmatter (those are managed via the planning view).

---

## Reviews

### List View (`/reviews`)

**Route:** `/reviews`

Displays two sections:

#### Project Reviews

Lists all review types found under `folio/reviews/` (each subdirectory containing a `REVIEW.md`).

| Column       | Description                                              |
|--------------|----------------------------------------------------------|
| Review Type  | Directory name, rendered as a title (e.g., "Architecture") |
| Description  | First line or summary from `REVIEW.md`                   |

Clicking a review type navigates to the detail view.

#### Folio Health Checks

A dedicated card or section for built-in health diagnostics:

- **Run Health Check** button — Triggers the equivalent of `folio doctor` and displays results.
- **Last Run** — Timestamp of the most recent health check, if available.
- **Status Summary** — Pass/warn/fail counts from the last run.

### Detail View (`/reviews/:type`)

**Route:** `/reviews/:type`

Renders the `REVIEW.md` file for the selected review type.

#### Content

- Full markdown rendering of the review guidance document.
- Checklists in the markdown (`- [ ]` items) are rendered as interactive checkboxes. However, checkbox state is **not persisted** to the file — reviews are guidance documents, and execution is handled by external skills/agents. Checkbox interaction is for in-session reference only.

#### Header Actions

- **Edit** — Opens the markdown editor for the review guidance.

### Health Check Results View (`/reviews/health`)

**Route:** `/reviews/health`

Displays the results of a `folio doctor` run.

#### Results Table

| Column       | Description                                           |
|--------------|-------------------------------------------------------|
| Check        | Name of the health check (e.g., "Directory structure valid") |
| Status       | Pass / Warn / Fail, with colored icon                 |
| Details      | Explanation of the result or remediation guidance      |

#### Checks Performed

The health check validates:

- `folio/` directory exists and has the expected structure.
- `folio.yaml` is present and parseable.
- Core wiki pages are present (e.g., `project-brief.md`).
- All feature directories contain a `FEATURE.md`.
- All issue directories contain an `ISSUE.md`.
- All sprint directories contain a `SPRINT.md` with valid frontmatter.
- `features/backlog.md` references only existing features.
- Features have required frontmatter fields (status at minimum).
- Workflow states in feature frontmatter match those configured in `folio.yaml`.
- Sprint `SPRINT.md` files reference only existing features and issues.
- Sprint dates are valid (end date after start date).
- At most one sprint has status "active".
- Internal markdown links within `folio/` resolve to existing files (broken link detection).
- All `assignee` values in features and issues match a `name` defined in `team.md`.

#### Actions

- **Re-run** button to execute health checks again.
- **Export** — Download results as a markdown report.

---

## Team

**Route:** `/team`

Displays and manages team members defined in `folio/team.md`. This view provides visibility into who is on the project, their roles, and their current assignments.

### Team List (`/team`)

Displays all members from `folio/team.md` as a table.

| Column       | Description                                                      |
|--------------|------------------------------------------------------------------|
| Name         | Team member display name                                         |
| Role         | Team role (e.g., engineer, designer, product, pumpking)          |
| GitHub       | GitHub username (linked to profile if present)                   |
| Assignments  | Count of features and issues currently assigned to this member   |

- Sorted alphabetically by name.
- **Primary action:** "Add Member" button opens an inline form or modal.
- Clicking a member row expands to show their current assignments (features and issues with status badges).

#### Add Member

A form (inline row or modal) with the following fields:

| Field    | Type       | Required | Description                                           |
|----------|------------|----------|-------------------------------------------------------|
| Name     | Text input | Yes      | Display name. Must be unique within the team.         |
| Role     | Text input | No       | Free-form role text (e.g., `engineer`, `designer`).   |
| GitHub   | Text input | No       | GitHub username.                                      |

- **Save** appends the member to `folio/team.md` frontmatter.
- **Validation:** If a member with the same name already exists, display an inline error and prevent save.

#### Remove Member

- Each row has a "Remove" action (icon button or context menu).
- If the member is currently assigned to any features or issues, display a warning dialog listing the affected entities: "This member is assigned to N features and N issues. Their assignments will not be cleared automatically."
- On confirm, the member is removed from `folio/team.md` frontmatter.

#### Edit Member

- Role and GitHub fields are inline-editable (click to edit, Enter to save, Escape to cancel).
- Name changes are not supported inline — remove and re-add to change a name (since name is the assignment key).

#### Empty State

If `team.md` does not exist or has no members:

- Display: "No team members defined. Add your first team member to enable assignment tracking."
- "Add Member" button.

---

## Configuration

**Route:** `/config`

Provides a structured editor for `folio.yaml`.

### Sections

#### Workflow States

- Displays the current ordered list of workflow states (e.g., draft → ready → in-progress → review → done).
- **Add state** — Append a new state to the workflow.
- **Remove state** — Remove a state (with a warning if any features currently use it).
- **Reorder** — Drag to reorder states.

#### Templates

- **Template source** — Display and edit the template source path (git repo URL or filesystem path) used by `folio init`.

#### Review Types

- List of configured review types.
- Add or remove review type entries.

#### Raw Editor

A fallback tab that shows the raw `folio.yaml` content in a YAML-aware editor, for advanced users who prefer to edit the configuration directly.

### Save Behavior

- Writes changes to `folio/folio.yaml`.
- Validates YAML syntax before saving. Displays inline errors on invalid YAML.
- Warns if removing a workflow state that is currently in use by one or more features.

---

## Chat Interface

The UI includes a built-in AI chat assistant that provides conversational access to project context, feature planning, and general assistance. The chat uses the [Vercel AI SDK](https://sdk.vercel.ai) to connect to LLM providers.

### Configuration

Chat requires LLM API credentials, configured via a local environment file:

**File:** `folio/.env.local`

```
# LLM Provider Configuration
# At least one provider must be configured for chat to be available.

# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google AI (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=...

# Default model (optional — Forge picks a sensible default if omitted)
FOLIO_CHAT_MODEL=anthropic/claude-sonnet-4-20250514
```

- `folio/.env.local` is **never** committed to version control. The default `.gitignore` generated by `folio init` excludes it.
- If no API keys are configured, the chat toggle is hidden and the feature is silently unavailable. No error is shown.
- The Go backend reads `folio/.env.local` on startup and exposes an `/api/chat` endpoint that proxies requests to the configured LLM provider.

### Chat Architecture

The chat system uses a split architecture:

- **Frontend:** Uses the [Vercel AI SDK](https://sdk.vercel.ai) React hooks (`useChat`) for streaming UI, message state management, and user interaction. The frontend sends messages to the Go backend's `/api/chat` endpoint.
- **Backend (Go):** Acts as a streaming proxy. It receives chat requests from the frontend, assembles the system prompt with project context, and forwards the request to the configured LLM provider's HTTP API (e.g., OpenAI's `/v1/chat/completions`, Anthropic's `/v1/messages`). The Go backend streams the response back to the frontend using Server-Sent Events (SSE), which the Vercel AI SDK client-side hooks consume natively.

The Go backend does **not** use the Vercel AI SDK server-side library (which is JavaScript-only). Instead, it implements the LLM provider HTTP protocol directly in Go and returns responses in the format expected by the Vercel AI SDK's client-side streaming hooks.

### Toggle Behavior

The chat interface is accessed via a **persistent toggle button** in the bottom-right corner of the application:

| State     | Appearance                                                        |
|-----------|-------------------------------------------------------------------|
| Collapsed | A floating action button (chat bubble icon) fixed to the bottom-right. |
| Expanded  | A slide-out panel on the right side of the screen, overlaying (not displacing) the main content area. |

- The toggle is visible on all routes.
- Panel width is approximately 400px on desktop, full-width on smaller viewports.
- The panel can be dismissed by clicking the toggle again, pressing `Escape`, or clicking outside the panel.
- The chat state (conversation history) persists across route navigations within a session. Refreshing the page clears the conversation.

### Chat Panel Layout

The expanded chat panel contains:

#### Header

- **Title:** "Chat" or the active model name (e.g., "Claude Sonnet").
- **Model selector:** A dropdown to switch between configured LLM providers/models, populated from the API keys found in `.env.local`.
- **Clear conversation** button — Resets the chat history for the current session.
- **Close** button — Collapses the panel.

#### Message Area

A scrollable message thread displaying the conversation:

| Element          | Description                                                    |
|------------------|----------------------------------------------------------------|
| User messages    | Right-aligned, styled with a distinct background color.        |
| Assistant messages | Left-aligned, rendered as markdown (headings, lists, code blocks, tables). |
| Streaming indicator | An animated indicator shown while the assistant response is being generated. Responses stream token-by-token as they arrive. |
| Timestamps       | Subtle, relative timestamps on each message (optional, can be toggled). |

- Code blocks in assistant responses include a "Copy" button.
- Long responses are fully scrollable within the message area. The panel auto-scrolls to the latest message.

#### Input Area

- A multi-line text input at the bottom of the panel.
- `Enter` sends the message. `Shift+Enter` inserts a newline.
- A "Send" button beside the input for mouse users.
- A "Stop" button replaces "Send" during active streaming, allowing the user to cancel a response.
- The input supports pasting markdown and long text.

### Project Context Awareness

The chat assistant automatically has access to the Folio project context:

- **System prompt** includes a summary of the project structure: project name, list of wiki pages, features (with status), issues, and configured workflow states.
- The system prompt is assembled on each conversation start (or on "Clear conversation") by reading the current state of the `folio/` directory.
- The system prompt does **not** include full document bodies — only names, statuses, and metadata. The user can ask the assistant to read specific documents, which triggers a backend lookup.

#### Context Injection

When the user asks about a specific feature, issue, or wiki page, the backend:

1. Identifies the referenced entity from the user's message.
2. Reads the relevant file(s) from the filesystem.
3. Injects the file content into the conversation context as a system message (not visible to the user, but available to the LLM).

This keeps the base context small while allowing deep dives into specific content on demand.

### Limitations

- Chat does **not** perform write operations. It cannot create, edit, or delete features, issues, or wiki pages. It is read-only and advisory. Write capabilities may be added in a future phase with explicit user confirmation flows.
- Chat conversations are **not persisted** to the filesystem. They exist only in the browser session.
- Chat is **local only** — requests go from the browser to the local `folio serve` backend, which proxies to the LLM provider. No conversation data is stored or transmitted beyond the LLM API call.

### Error States

| Condition                     | Behavior                                                      |
|-------------------------------|---------------------------------------------------------------|
| No API keys configured        | Chat toggle is hidden. No error shown.                        |
| Invalid API key               | Error message displayed in the chat panel: "Authentication failed. Check your API key in folio/.env.local." |
| LLM provider unreachable      | Error message: "Could not reach [provider]. Check your network connection." |
| Rate limited                  | Error message: "Rate limited by [provider]. Wait a moment and try again." |
| Mid-stream failure            | Partial response is preserved. An error notice is appended: "Response interrupted. Try sending your message again." |

---

## Common Patterns

### Markdown Editing

All markdown editing across the application uses a consistent split-pane editor:

- **Left pane:** Raw markdown with syntax highlighting, line numbers, and keyboard shortcuts.
  - `Ctrl/Cmd+B` — Bold
  - `Ctrl/Cmd+I` — Italic
  - `Ctrl/Cmd+K` — Insert link
  - `Ctrl/Cmd+Shift+I` — Insert image reference
  - `Tab` / `Shift+Tab` — Indent / outdent list items
- **Right pane:** Live preview, rendered with the same markdown engine used in detail views.
- A toolbar above the editor provides buttons for common formatting (headings, bold, italic, lists, code blocks, links, images).
- The editor supports **tab-to-indent** (not tab-to-next-field) for markdown authoring ergonomics.

### Frontmatter Editing

When editing content that includes YAML frontmatter, the frontmatter is **not shown in the raw editor**. Instead, frontmatter fields are presented as structured form fields above the editor. This prevents users from accidentally breaking frontmatter syntax.

On save, the form field values are serialized back to YAML frontmatter and prepended to the markdown body.

### Confirmation Dialogs

All destructive actions (delete feature, delete issue, delete wiki page, remove from backlog) require a confirmation dialog:

- Dialog title: "Delete {entity type}?"
- Dialog body: "This will permanently delete {name} and all supporting artifacts. This action cannot be undone."
- Actions: "Cancel" (secondary) and "Delete" (danger/red).

### Empty States

When a list view has no items, display a helpful empty state:

- Illustration or icon (optional).
- Message: e.g., "No features yet. Create your first feature to get started."
- Primary action button: e.g., "New Feature".

### Error Handling

- **Network/filesystem errors:** Display a toast notification with the error message. The toast auto-dismisses after 5 seconds but can be dismissed manually.
- **Validation errors:** Display inline below the relevant field, in red text.
- **404 / missing file:** If a route references a file that no longer exists (e.g., deleted via CLI), display a "Not Found" view with a link back to the parent list.

### Loading States

- List views show a skeleton loader while data is being fetched.
- Detail views show a content placeholder while the markdown file is being read and rendered.
- Save operations show a spinner on the save button and disable it to prevent double-submission.

### Keyboard Navigation

- All interactive elements are reachable via `Tab`.
- Lists support `Up/Down` arrow key navigation.
- `Enter` activates the focused element.
- `Escape` closes modals, dropdowns, the chat panel, and returns focus to the triggering element.
- `Ctrl/Cmd+Shift+L` — Toggle the chat panel open/closed.

### URL Structure

All routes use clean URLs that map to the filesystem structure:

| Route                     | Filesystem Path                              |
|---------------------------|----------------------------------------------|
| `/wiki/project-brief`     | `folio/wiki/project-brief.md`            |
| `/features/feature-alpha` | `folio/features/feature-alpha/FEATURE.md`    |
| `/issues/login-timeout`   | `folio/issues/login-timeout/ISSUE.md`        |
| `/reviews/architecture`   | `folio/reviews/architecture/REVIEW.md`       |

This makes the URL predictable and debuggable — users can reason about which file a given view represents.
