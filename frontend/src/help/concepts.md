---
title: Core Concepts
description: Philosophy, data model, and the three tiers of context.
order: 2
icon: lightbulb
---

# Core Concepts

Folio is a local-first project management tool designed for teams working with AI agents. This page explains the ideas behind it and how data is organized.

## Philosophy

### Agile for Agentic Engineering

Folio shares the principles of Scrum -- transparency, inspection, and adaptation -- and extends them to a world where AI agents are first-class participants in the development process. Every piece of project context is stored as a plain file that both humans and agents can read and write.

### Features, Not User Stories

The core artifact in Folio is the **Feature**, composed of a `FEATURE.md` (what to build) and a `PLAN.md` (how to build it). This is a lightweight form of spec-driven development where each feature is co-owned by product, engineering, and design.

### Files, Not Databases

All project data is stored as plain markdown files with YAML frontmatter. No database to set up, migrate, or back up. The filesystem is the source of truth, and your data is always readable, grep-able, and diffable.

### Complementary, Not Competing

Folio is not an IDE, not an agent harness, not version control, and not a communication tool. It complements these tools -- working alongside git, editors, CI/CD, Slack, and whatever agent framework you prefer.

### A Single Binary

One Go binary provides a web interface for managing context documents and a CLI tool for agents and automation. In production, the frontend SPA is embedded into the binary via Go's `//go:embed` directive.

### Opinionated but Customizable

Folio includes sane defaults for organizing context (workflow states, directory structure, frontmatter schemas) but can be customized to fit your team's process.

## Three Tiers of Context

Folio organizes project knowledge into three distinct tiers based on how the content changes over time:

| Tier | Directory | Purpose | Mutability |
|------|-----------|---------|------------|
| **Evergreen** | `project-docs/` | Stable project context | Rarely changes |
| **Development** | `features/`, `issues/` | Task-level context | Changes per task |
| **Rolling Knowledge** | `wiki/` | Decisions and learnings | Evolves over time |

### Evergreen (Project Docs)

Long-lived reference documents that provide foundational context: project brief, design system, API specification, coding conventions. These are **read-only** through the CLI and web UI to protect them from accidental modification. Edit them directly as files.

**When to use:** Information that is stable and provides essential context for anyone (human or AI) working on the project.

### Development (Features & Issues)

Task-level context tied to specific work. Each feature gets a directory with a spec (`FEATURE.md`), an optional plan (`PLAN.md`), and any supporting artifacts. Issues follow a similar pattern with `ISSUE.md`.

**When to use:** Anything tied to a specific piece of work -- specifications, bug reports, implementation plans, supporting materials.

### Rolling Knowledge (Wiki)

Evolving documentation that captures decisions, learnings, and processes. Wiki pages are standalone markdown files that can link to each other with wikilinks.

**When to use:** Architecture decisions, onboarding guides, retrospective notes, deployment procedures -- knowledge that grows and changes as the project evolves.

## Data Model

All data lives under a single directory (`./folio` by default) within your project:

```
folio/
├── folio.yaml              # Project configuration
├── team.md                 # Team roster
├── roadmap.md              # Kanban board definition
├── project-docs/           # Evergreen context
│   ├── project-brief.md
│   ├── design.md
│   └── ...
├── features/               # One directory per feature
│   └── my-feature/
│       ├── FEATURE.md      # Spec (frontmatter + markdown)
│       ├── PLAN.md         # Implementation plan (optional)
│       └── *.md|*.json|... # Supporting artifacts
├── issues/                 # One directory per issue
│   └── my-issue/
│       ├── ISSUE.md        # Description (frontmatter + markdown)
│       └── ...             # Supporting artifacts
├── wiki/                   # Rolling knowledge base
│   └── page-name.md
├── sprints/                # Sprint data
└── .sessions/              # AI session storage (gitignored)
```

### Key Files

- **`folio.yaml`** -- Project configuration: name, version, and workflow states. See [Configuration](/help/configuration).
- **`team.md`** -- Team roster with names, roles, and optional GitHub handles. Used for assignment autocomplete and validation.
- **`roadmap.md`** -- Kanban board definition with columns, rows, and cards. See [Roadmap](/help/roadmap).

### Frontmatter Convention

Every content file in Folio uses YAML frontmatter to store structured metadata:

```yaml
---
title: "My Document"
status: draft
priority: high
---

Markdown body content goes here.
```

The frontmatter is parsed by the Go backend and served as structured data through the API. The markdown body is the document's content, rendered in the web UI with full GitHub Flavored Markdown support.

## Architecture

Folio is a full-stack application with two main components:

| Component | Technology | Role |
|-----------|-----------|------|
| **Backend** | Go, chi router, cobra CLI | HTTP API, CLI, filesystem data access |
| **Frontend** | React 19, Vite, TypeScript | Single-page application, rich text editing |

In development, the frontend runs as a separate Vite dev server and proxies API requests to the Go backend. In production, the frontend is compiled and embedded into the Go binary, producing a single self-contained executable.

The backend reads and writes markdown files directly on the filesystem. There is no database -- the `folio/` directory is the complete source of truth.
