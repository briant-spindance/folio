---
name: folio-project-docs
description: Read and understand Folio project documentation. Use when you need project context like the project brief, design system, API spec, conventions, or other evergreen reference documents.
---

# Folio Project Docs

Read and understand the evergreen project documentation in a Folio project.

## When to Use This Skill

Use this skill when:

- Starting work on a project and need to understand its purpose, goals, or constraints
- Looking for the project brief, design system, API spec, or conventions
- Need to understand the project's tech stack or architecture
- Referencing stable documentation that rarely changes
- An agent needs background context before making changes

## Understanding Project Docs

Project docs are the **evergreen** tier of Folio's context model — stable, long-lived documents that provide foundational context:

| Tier | Directory | Purpose | Mutability |
|------|-----------|---------|------------|
| **Evergreen** | **`project-docs/`** | **Stable project context** | **Rarely changes** |
| Development | `features/`, `issues/` | Task-level context | Changes per task |
| Rolling knowledge | `wiki/` | Decisions and learnings | Evolves over time |

Project docs are **read-only** through the Folio CLI and web UI. They are edited directly as files. This protects them from accidental modification — they represent the team's agreed-upon context.

## CLI Reference

```bash
# List all project documents
folio docs --json list

# Get a specific document by slug
folio docs --json get project-brief
```

The `--json` flag is a persistent flag on the parent command and must be placed **before** the subcommand.

### List Documents

```bash
folio docs --json list
```

**JSON response:**

```json
[
  {
    "slug": "project-brief",
    "title": "Project Brief",
    "icon": null,
    "body": "# Project Brief\n\nFull markdown content...",
    "order": 0
  },
  {
    "slug": "design",
    "title": "Design System & Frontend Architecture",
    "icon": null,
    "body": "...",
    "order": 4
  }
]
```

Documents are returned sorted by their `order` field.

### Get a Document

```bash
folio docs --json get <slug>
```

Returns a single document object with the full markdown body.

## File Structure

Project docs are markdown files in `folio/project-docs/`:

```
folio/project-docs/
├── project-brief.md        # What the project is and why
├── design.md               # Design system and UI architecture
├── api.md                  # API specification
├── cli.md                  # CLI documentation
├── conventions.md          # Coding standards and patterns
├── user-interface.md       # UI/UX documentation
└── architecture.md         # System design and infrastructure
```

### Frontmatter Format

```yaml
---
title: "Project Brief"
order: 0
---

# Project Brief

Document content in markdown...
```

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Display name of the document |
| `order` | No | Sort order (integer). Documents are displayed in ascending order. Default is 0. |

The slug is the filename without the `.md` extension.

## Common Document Types

Folio projects typically include these evergreen documents:

| Document | Purpose |
|----------|---------|
| **Project Brief** | What the project is, why it exists, core principles, target users |
| **Design System** | Visual design principles, component library, color palette, typography |
| **API Specification** | REST API endpoints, request/response formats, authentication |
| **CLI Documentation** | Command-line interface reference |
| **Conventions** | Coding standards, naming conventions, file organization rules |
| **User Interface** | UI architecture, page layouts, navigation patterns |
| **Architecture** | System design, infrastructure, deployment model |

## Using Project Docs for Context

When starting work on a Folio project, read the project docs to understand:

1. **Project Brief** — Read first. Understand the project's purpose, principles, and goals.
2. **Design System** — Understand the visual language and component patterns before making UI changes.
3. **API Specification** — Understand the API contract before modifying endpoints.
4. **Conventions** — Follow established patterns for code style, naming, and organization.

### Workflow for gathering context

```bash
# List available docs to see what's there
folio docs --json list

# Read the project brief first for high-level context
folio docs --json get project-brief

# Then read specific docs relevant to your task
folio docs --json get design        # If doing UI work
folio docs --json get api           # If doing API work
folio docs --json get conventions   # If writing code
```

## Validation

`folio doctor` validates project docs:

- Each `.md` file in `project-docs/` must have valid YAML frontmatter
- The `title` field should not be empty (produces a warning)
- The `order` field must be an integer if present (produces a warning if it's a string)
- No two documents should share the same `order` value (produces a warning)

## Editing Project Docs

Project docs are read-only through the CLI and web UI, but they can be edited directly as files. When editing project docs:

- Maintain valid YAML frontmatter with a `title` and `order`
- Keep content stable and factual — project docs are reference material, not working notes
- If content is evolving frequently, consider moving it to the wiki instead
- Run `folio doctor` after editing to validate the changes
