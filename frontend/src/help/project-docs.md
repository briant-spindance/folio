---
title: Project Docs
description: Manage evergreen reference documents that provide stable project context.
order: 5
icon: book-open
---

# Project Docs

Project docs are the **evergreen** tier of Folio's context model -- stable, long-lived documents that provide foundational context for the team and for AI agents. They are read-only through the CLI and web UI to protect them from accidental modification.

## What Are Project Docs?

Project docs are reference materials that rarely change. They capture the team's agreed-upon context: what the project is, how things work, and what conventions to follow. Common examples include:

| Document | Purpose |
|----------|---------|
| **Project Brief** | What the project is, why it exists, core principles, target users |
| **Design System** | Visual design principles, component library, color palette, typography |
| **API Specification** | REST API endpoints, request/response formats, authentication |
| **CLI Documentation** | Command-line interface reference |
| **Conventions** | Coding standards, naming conventions, file organization rules |
| **User Interface** | UI architecture, page layouts, navigation patterns |
| **Architecture** | System design, infrastructure, deployment model |

## File Structure

Project docs are markdown files in `folio/project-docs/`:

```
folio/project-docs/
├── project-brief.md
├── design.md
├── api.md
├── cli.md
├── conventions.md
├── user-interface.md
└── architecture.md
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

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `title` | Yes | string | Display name of the document |
| `order` | No | integer | Sort order (ascending). Default is 0. |

The slug is the filename without the `.md` extension.

## Viewing Project Docs

### In the Web UI

Navigate to **Project Docs** in the sidebar. Documents are listed in order with their titles and descriptions. Click a document to read its full content.

### From the CLI

```bash
# List all project documents
folio docs --json list

# Get a specific document
folio docs --json get project-brief
```

## Creating and Editing

Project docs are **read-only** through the CLI and web UI. To create or edit them, work directly with the files:

1. Create a new `.md` file in `folio/project-docs/`
2. Add YAML frontmatter with a `title` and optional `order`
3. Write the content in markdown
4. Run `folio doctor` to validate

### Example: Creating a New Document

Create `folio/project-docs/conventions.md`:

```yaml
---
title: "Coding Conventions"
order: 5
---

# Coding Conventions

## Naming

- Use camelCase for variables and functions
- Use PascalCase for types and components
- Use kebab-case for file names and URL slugs

## File Organization

- Group by feature, not by file type
- Keep related files in the same directory
```

## Project Docs vs. Wiki

| | Project Docs | Wiki |
|---|---|---|
| **Purpose** | Stable reference material | Evolving knowledge |
| **Mutability** | Rarely changes | Changes frequently |
| **Editing** | File-only (read-only in UI) | Full CRUD in UI |
| **Examples** | Project brief, API spec | Architecture decisions, meeting notes |
| **Directory** | `project-docs/` | `wiki/` |

If content is evolving frequently, consider moving it to the wiki instead. Project docs should represent agreed-upon, stable context.

## Using Project Docs for AI Context

When an AI agent starts work on your project, project docs provide the foundational context it needs. The recommended reading order:

1. **Project Brief** -- Understand the project's purpose and principles
2. **Conventions** -- Follow established patterns for code style and organization
3. **Design System** -- Understand the visual language before making UI changes
4. **API Specification** -- Understand the API contract before modifying endpoints

## Validation

`folio doctor` validates project docs:

- Each `.md` file must have valid YAML frontmatter
- The `title` field should not be empty
- The `order` field must be an integer if present
- No two documents should share the same `order` value
