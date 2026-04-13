---
title: Wiki
description: Build a rolling knowledge base of decisions, learnings, and evolving documentation.
order: 6
icon: file-text
---

# Wiki

The wiki is Folio's **rolling knowledge** tier -- a place for evolving documentation that captures decisions, learnings, processes, and other knowledge that grows over time.

## What Goes in the Wiki?

Create a wiki page when:

- **A decision was made** that affects the project going forward (architecture choices, technology selections, process changes)
- **A lesson was learned** during implementation that others should know
- **A process needs documentation** (onboarding, deployment, release procedures)
- **Knowledge keeps coming up** in conversations and should be written down once
- **A retrospective produced insights** worth preserving

Do **not** use the wiki for:

- Stable reference material -- use [Project Docs](/help/project-docs) instead
- Task-specific context -- put it in the relevant [Feature](/help/features) or [Issue](/help/issues) directory

## File Structure

Wiki pages are flat markdown files in `folio/wiki/`:

```
folio/wiki/
├── architecture-decisions.md
├── onboarding-guide.md
├── api-conventions.md
├── deployment-process.md
└── retrospective-2025-q1.md
```

There are no subdirectories -- all wiki pages live at the top level.

## Wiki Page Format

Each wiki page is a markdown file with optional YAML frontmatter:

```yaml
---
title: "Architecture Decisions"
aliases:
  - adr
  - arch-decisions
---

## Overview

This page tracks key architecture decisions for the project.

## Decision Log

### 2025-01-15: Use PostgreSQL over SQLite

We chose PostgreSQL for production because...
```

### Frontmatter Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `title` | No | string | Display name. If omitted, derived from the filename. |
| `icon` | No | string | Icon name for display in the docs list. |
| `description` | No | string | Short summary shown in the docs list. |
| `aliases` | No | list | Alternate slugs that wikilinks can resolve to this page. |

The slug is always the filename without the `.md` extension.

## Managing Wiki Pages

### From the Web UI

Navigate to **Project Docs** in the sidebar (wiki pages are managed through the docs interface). You can:

- **Create** a new page with the **New Doc** button
- **Edit** an existing page with the **Edit** button
- **Delete** a page with the **Delete** button
- **Reorder** pages by dragging them in the list

The editor supports both a rich text mode (WYSIWYG) and a raw markdown mode.

### From the Filesystem

Wiki pages can also be managed directly as files:

1. Create a new `.md` file in `folio/wiki/`
2. Use lowercase with hyphens for the filename: `my-page-name.md`
3. Add frontmatter with at least a `title`
4. Write the content in markdown

## Wikilinks

Wiki pages can link to each other using wikilink syntax:

| Syntax | Behavior |
|--------|----------|
| `[[slug]]` | Links to the page with that slug or alias. Renders as the target page's title. |
| `[[slug\|display text]]` | Links to the target page but shows custom display text. |

Examples:

```markdown
See [[architecture-decisions]] for background.
Check our [[api-conventions|API style guide]] for details.
Related: [[adr]] (resolves to architecture-decisions via alias).
```

If the target page does not exist, the link is rendered distinctly in the web UI, and clicking it opens a pre-filled create form.

### Backlinks

When a page is viewed, Folio automatically finds all other pages that link to it (by slug or alias) and displays them as backlinks. This is computed at read time -- no manual maintenance needed.

## Tips

- **Keep pages focused.** One topic per page.
- **Use wikilinks liberally.** They help both agents and humans discover related knowledge.
- **Add aliases** for common abbreviations (e.g., `aliases: [adr]` for "Architecture Decision Records").
- **Update existing pages** when knowledge changes rather than creating new ones. Wiki pages are living documents.
- **Use descriptive slugs.** `database-selection.md` is better than `decision-3.md`.

## Validation

`folio doctor` validates wiki pages:

- Each `.md` file in `wiki/` must have valid YAML frontmatter (can be empty `---\n---`)
- The `title` field should not be empty
