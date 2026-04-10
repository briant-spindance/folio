# Forge — Project Brief

## Overview

Forge is a lightweight project management tool built for agile teams embracing agentic engineering workflows. It provides a web UI and CLI on top of a filesystem-based project structure, enabling both humans and AI agents to collaborate on project planning, feature development, and delivery.

As traditional agile practices evolve alongside AI-augmented development, teams need tooling that preserves agile principles — iterative delivery, continuous feedback, team autonomy — while adapting practices to a world where AI agents are active participants in the workflow. Forge is that tooling.

## Problem

Modern agile teams working with AI agents face a bookkeeping problem. Project documentation, feature definitions, backlog management, issue tracking, and review guidance all need to be:

- Accessible to both humans and AI agents
- Version-controlled alongside the codebase
- Structured enough to be machine-readable, flexible enough to be human-friendly

Today this is managed manually — creating directories, editing markdown files, maintaining backlog order by hand. Forge eliminates that friction with a purpose-built interface layer.

## Solution

A single Go binary that:

1. **Web UI** — A modern SPA (React or Svelte, embedded in the binary) that the entire team — product owners, designers, engineers — uses to manage project docs, features, issues, and reviews.
2. **CLI** — An agent-first (but human-friendly) command-line interface that AI agents and terminal-preferring engineers use to interact with the same content.

Both interfaces read and write the same filesystem structure. The files are the source of truth.

## Core Principles

- **Filesystem is the source of truth.** Forge is an interface layer, not a database. All content lives as markdown files and directories in the project repo.
- **Agent-first, not agent-only.** The CLI is designed for AI agents but remains ergonomic for humans.
- **Local-first, cloud-aware.** Primary use case is local development (`forge serve`), but architecture should not preclude centralized deployment.
- **VCS-agnostic.** Forge reads and writes files. It does not assume git, and it does not manage version control.
- **Sensible defaults, team-configurable.** Workflow states, review types, and project structure start with good defaults but can be adapted through retrospectives.
- **Open-source ready.** Clean APIs, good documentation, and a clear separation of concerns from the start.

## Project Structure

All Forge-managed content lives under a `forge/` directory in the project root:

```
forge/
├── forge.yaml                  # Project configuration (workflow states, templates, etc.)
├── team.md                     # Team members (names, roles, handles) for assignment
├── project-docs/               # Evergreen project documentation (flat)
│   ├── project-brief.md
│   ├── use-cases.md
│   ├── personas.md
│   ├── design-docs.md
│   ├── technical-docs.md
│   └── roadmap.md
├── features/                   # Feature definitions (directory-per-feature)
│   ├── backlog.md              # Prioritized feature list
│   ├── feature-alpha/
│   │   ├── FEATURE.md          # Feature definition, status, metadata
│   │   └── ...                 # Supporting artifacts (wireframes, specs, etc.)
│   └── feature-beta/
│       ├── FEATURE.md
│       └── ...
├── issues/                     # Issue tracking (directory-per-issue)
│   ├── login-timeout-on-slow-connections/
│   │   ├── ISSUE.md
│   │   └── ...                 # Supporting artifacts
│   └── missing-validation-on-upload/
│       └── ISSUE.md
├── sprints/                    # Sprint iterations (directory-per-sprint)
│   ├── sprint-1/
│   │   └── SPRINT.md           # Sprint metadata, assigned features/issues
│   └── sprint-2/
│       └── SPRINT.md
└── reviews/                    # Periodic review guidance (directory-per-review-type)
    ├── architecture/
    │   ├── REVIEW.md           # Review instructions and checklist
    │   └── ...                 # Supporting docs
    ├── security/
    │   └── REVIEW.md
    ├── usability/
    │   └── REVIEW.md
    └── design/
        └── REVIEW.md
```

### Project Docs

Flat markdown files in `project-docs/`. These are intentionally kept short and consumable so agents can quickly ingest project context. They represent the big picture: goals, personas, architecture, design direction, and roadmap.

### Team

`team.md` lives at the root of `forge/` (alongside `forge.yaml`) and defines the team members who participate in the project. Each member has a `name` (used as the canonical identifier for assignment), an optional `role`, and optional external handles (e.g., GitHub username). Forge uses this file for assignee validation (`forge doctor`), autocomplete in the CLI and web UI, and general team visibility.

### Features

The primary unit of work. Each feature gets its own directory under `features/` containing a `FEATURE.md` file and any supporting artifacts. Features are co-authored by product, design, and engineering. They are pointed and prioritized like a traditional backlog, with priority order maintained in `features/backlog.md`.

### Issues

Follow the same directory-per-entity pattern as features. Each issue gets a named directory under `issues/` (using a descriptive slug) with an `ISSUE.md` and optional supporting artifacts.

### Reviews

Guidance documents for periodic reviews. Each review type gets a directory under `reviews/` with a `REVIEW.md` containing instructions and checklists. Review execution is handled by skills/agents, not by Forge directly.

Reviews fall into two categories:

- **Project reviews** — Domain-specific reviews defined by the team (architecture, security, usability, design, etc.).
- **Forge health reviews** — Built-in reviews shipped with Forge that check the health of the `forge/` directory itself. For example: Is the directory structure valid? Are core project documents present and up to date? Are there features missing required metadata? These act as a self-diagnostic for the project's Forge setup.

### Sprints

Time-boxed iterations stored under `sprints/`. Each sprint gets a directory containing a `SPRINT.md` with YAML frontmatter for metadata and a markdown body for notes or retrospective content. Sprint membership (which features and issues belong to a sprint) is stored in the sprint's frontmatter — not in the individual feature or issue files. This keeps the sprint as the single source of truth for its contents.

## Entity Schemas

All Forge entities use markdown files with YAML frontmatter for structured metadata. The frontmatter is the machine-readable portion; the markdown body below it is free-form content.

### FEATURE.md

```yaml
---
name: "OAuth Integration"          # Required. Human-readable feature name.
status: draft                      # Required. Current workflow state (default: draft).
assignee: "Alice Johnson"          # Optional. Team member name (should match a name in team.md).
points: 5                          # Optional. Story points or effort estimate.
---

## Summary

Feature description and details in markdown...
```

**Derived fields** (not stored in frontmatter, computed at read time):

- `slug` — The feature's directory name (e.g., `oauth-integration`).
- `path` — Filesystem path to `FEATURE.md`.
- `backlog_position` — Position in `features/backlog.md`, or `null` if not in the backlog.
- `sprint` — Slug of the sprint that contains this feature (found by scanning sprint files), or `null`.
- `artifacts` — Other files in the feature directory.
- `created`, `last_modified` — Filesystem timestamps.

### ISSUE.md

```yaml
---
name: "Login Timeout on Slow Connections"  # Required. Human-readable issue name.
status: open                               # Required. Current status (default: open).
assignee: "Bob Smith"                      # Optional. Team member name (should match a name in team.md).
labels:                                    # Optional. Categorization labels.
  - bug
  - security
feature: user-authentication               # Optional. Linked feature slug.
---

## Description

Issue description and details in markdown...
```

**Derived fields** (not stored in frontmatter, computed at read time):

- `slug` — The issue's directory name.
- `path` — Filesystem path to `ISSUE.md`.
- `sprint` — Slug of the sprint that contains this issue (found by scanning sprint files), or `null`.
- `artifacts` — Other files in the issue directory.
- `created`, `last_modified` — Filesystem timestamps.

**Note on `feature` vs `linked_feature`:** The frontmatter key is `feature`. In JSON API responses, this is serialized as `linked_feature` for clarity.

### SPRINT.md

```yaml
---
name: "Sprint 3"                   # Required. Human-readable sprint name.
status: planning                   # Required. Lifecycle state: planning | active | completed.
start_date: 2026-04-14             # Required. Sprint start date (YYYY-MM-DD).
end_date: 2026-04-25               # Required. Sprint end date (YYYY-MM-DD).
goal: "Complete OAuth and fix critical bugs"  # Optional. Sprint goal.
capacity: 40                       # Optional. Team capacity in points for this sprint.
features:                          # Optional. Slugs of features assigned to this sprint.
  - oauth-integration
  - user-authentication
issues:                            # Optional. Slugs of issues assigned to this sprint.
  - login-timeout-on-slow-connections
---

## Sprint Notes

Retrospective notes, observations, or other sprint-level content...
```

**Derived fields** (not stored in frontmatter, computed at read time):

- `slug` — The sprint's directory name.
- `path` — Filesystem path to `SPRINT.md`.
- `days_remaining` — Computed from `end_date` vs. today.
- `points_committed` — Sum of points from all assigned features.
- `points_completed` — Sum of points from assigned features in "done" status.
- `feature_count`, `issue_count` — Counts of assigned items.

### Sprint Membership

The sprint's `features` and `issues` arrays in `SPRINT.md` frontmatter are the **canonical source** for sprint membership. Individual feature and issue files do not store a sprint reference.

When a feature or issue is viewed (via CLI or API), its `sprint` field is computed by scanning all sprint files to find which sprint (if any) contains that entity's slug. CLI convenience flags like `forge feature create --sprint <slug>` write to the target sprint's `SPRINT.md`, not to the feature's frontmatter.

## Feature Lifecycle

Features move through a configurable workflow. The default states are:

```
draft → ready → in-progress → review → done
```

Status is tracked as metadata in `FEATURE.md` (e.g., frontmatter). Teams can modify the workflow states via configuration to reflect their evolving process — consistent with the agile principle of inspect-and-adapt.

## Issue Lifecycle

Issues have two default statuses: `open` and `closed`. These are sufficient for standalone issue tracking outside of sprints.

When an issue is assigned to a sprint, it participates in the sprint board alongside features. On the sprint board, issues are organized into the same workflow state columns as features (e.g., Draft | Ready | In Progress | Review | Done). An issue's `status` field in its frontmatter is updated to reflect its board position — meaning an issue on a sprint board can have any of the configured workflow states as its status, not just `open`/`closed`.

The mapping works as follows:

- When an issue is **added to a sprint**, its status remains unchanged. If the status is `open`, it appears in the first workflow column (e.g., Draft).
- **Dragging an issue between board columns** updates its `status` in `ISSUE.md` frontmatter to the target workflow state.
- When a sprint is **completed**, issues not in "done" status retain their current status. They can be reassigned to a new sprint or managed independently.
- `open` and `closed` remain valid statuses for issues not on a sprint board. `closed` is treated equivalently to `done` for sprint board purposes.

## Roles

- **Team members** (product, design, engineering) — Use the web UI and/or CLI to author, manage, and review project content.
- **AI agents** — Use the CLI to read project context, create/update features and issues, and interact with the project structure programmatically.
- **Pumpking** — A designated person responsible for merging completed features into the main codebase.

## Key Operations

### Bootstrapping

- `forge init` — Scaffold a new `forge/` directory from a template (pulled from a repo or local filesystem path). If no template is specified, Forge uses a sensible default configuration embedded in the binary itself.

### Features

- Create, list, view, edit, and delete features
- Manage backlog priority (reorder, promote, demote)
- Update feature status through workflow states
- Assign features to practitioners

### Issues

- Create, list, view, edit, and delete issues
- Track issue metadata (status, assignee, labels, linked feature)

### Project Docs

- Create, list, view, and edit project documents
- Browse project context quickly

### Reviews

- List available review types
- View review guidance and checklists
- Run built-in Forge health checks (`forge doctor` or similar) to validate directory structure and project doc completeness

## Technical Approach

- **Language:** Go
- **Binary:** Single binary distribution via Go's `embed` package
- **Web UI:** SPA (React or Svelte, TBD) embedded in the Go binary, served locally
- **CLI:** Subcommand-based (e.g., `forge feature create`, `forge issue list`, `forge backlog reorder`)
- **Data format:** Markdown with YAML frontmatter for metadata
- **Configuration:** `forge.yaml` at the `forge/` root for project-level settings (workflow states, template source, review types, etc.)
- **Templating:** `forge init` pulls from a configurable template source (git repo or filesystem path), with a sensible default embedded in the binary

## Phasing

### Phase 1 — Core

- `forge init` with template support
- Features: CRUD, backlog management, workflow status
- Issues: CRUD, basic metadata
- Project docs: CRUD
- Reviews: browse guidance docs
- Web UI: browse and manage all of the above
- CLI: full parity with web UI operations

### Phase 2 — Considerations

- Architectural Decision Records (ADRs) as a new entity type
- Review-to-feature linking and tracking review outcomes
- Cloud deployment model
- Enhanced git integration (optional, opt-in)

## Context

Forge is being built by Mutually Human as part of the SE 2.0 / Agentic Development initiative. It will be used internally by delivery teams and may be open-sourced. A companion project will provide skills (e.g., Claude Code skills) that automate workflows on top of Forge's file structure.

## License

TBD — internal use initially, with open-source release under consideration.
