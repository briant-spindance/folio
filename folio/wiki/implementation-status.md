---
title: Implementation Status
icon: clipboard-check
---

A living reference of what is built, what is partially built, and what has not been started. Updated as development progresses.

## Fully Implemented

| Area | Details |
|------|---------|
| **Features CRUD** | List/table view with sorting, filtering (status, priority, assignee, points, tags), pagination, drag-and-drop reordering. Full create, view, edit, delete. Artifact support. CLI: `folio features`. |
| **Issues CRUD** | Full create, view, edit, delete with artifacts. Filtering by status, type, priority, assignee. Drag-and-drop reordering. Linked to parent features. CLI: `folio issues`. |
| **Wiki** | Markdown pages with `[[wikilinks]]` and automatic backlink tracking. Create, edit, delete from web UI. CLI: read-only. |
| **Project Docs** | Read-only evergreen documents served from `folio/project-docs/`. List and detail views in web UI. CLI: `folio docs list`, `folio docs get`. |
| **Roadmap** | Full kanban board with configurable columns (now/next/later) and color-coded swim-lane rows. Drag-and-drop cards between cells. Inline card creation, edit modal, delete. Cards can link to features. |
| **Multi-project** | Single server manages multiple folio directories. Project switcher in web UI header. Project list stored in `~/.local/folio/project-list.yaml`. CLI: `folio projects`. |
| **CLI** | All entity commands (features, issues, docs, projects) with `--json` output. Utility commands: `init`, `doctor`, `version`, `web`, `install-skills`, `install-commands`. |
| **Agent Skills** | 6 skills: folio-init, folio-features, folio-issues, folio-wiki, folio-project-docs, folio-doctor. Distributed via `folio install-skills` (supports Claude Code, OpenCode). |
| **Doctor** | 10 health checks: directory structure, config, feature/issue/wiki/docs/team frontmatter, roadmap consistency, duplicate slugs, referential integrity. Web UI dashboard panel. |
| **Production Build** | Frontend embedded into Go binary. Gzip pre-compression. GoReleaser for cross-platform releases. GitHub Actions CI + release workflow. |
| **In-app Help** | Markdown help articles rendered in the web UI. |

## Partially Implemented / Stubbed

| Area | What Exists | What's Missing |
|------|-------------|----------------|
| **Sprints** | `sprint` field in feature and issue data models. Empty `sprints/` directory scaffolded by `folio init`. Doctor validates directory exists. Stub page at `/sprints` in web UI. | No CLI commands, no API endpoints, no store, no UI beyond the stub page. |
| **Review Tools** | Stub page at `/review` in web UI. `reviews/architecture/REVIEW.md` scaffolded by `folio init`. | No implementation -- purpose and scope TBD. |
| **Configuration** | Stub page at `/configuration` in web UI. | No implementation -- settings are currently file-only via `folio.yaml`. |
| **Project Docs Editing** | Dead code in `DocsEdit.tsx` and `DocsNew.tsx` (not routed, not imported, incorrectly references wiki hooks). | No backend write endpoints, no store write methods, no API client mutations. See issue: "Remove dead DocsEdit and DocsNew page components". |

## Not Started

| Area | Notes |
|------|-------|
| **Feature kanban board** | A board view for features grouped by status columns. The list/table view exists but no kanban toggle. |
| **Search indexing** | Full-text search across features, issues, wiki, and project docs. |
| **AI-assisted feature writing** | LLM-powered drafting of feature specs and implementation plans. |
| **Roadmap skill** | No `folio-roadmap` agent skill exists yet, though the roadmap feature is fully built. |
| **AI doctor checks** | Semantic validation beyond structural checks. |
| **Keyboard shortcuts** | Keyboard navigation throughout the web UI. |
| **Themes** | Dark mode and customizable color themes. |
| **Internationalization** | i18n support for the web UI. |
| **Plugin / extension system** | Third-party extensions for custom entity types, views, and integrations. |
