---
name: folio-wiki
description: Manage the Folio wiki knowledge base. Use when creating, editing, or linking wiki pages that capture decisions, learnings, and evolving project knowledge.
---

# Folio Wiki

Manage the rolling knowledge base in a Folio project — decisions, learnings, architecture notes, and other evolving documentation.

## When to Use This Skill

Use this skill when:

- Creating a new wiki page to capture a decision or learning
- Editing existing wiki content
- Linking wiki pages together with wikilinks
- Looking up project knowledge or decisions
- Organizing the knowledge base

## Understanding the Wiki

Wiki pages are the **rolling knowledge** tier of Folio's context model:

| Tier | Directory | Purpose | Examples |
|------|-----------|---------|----------|
| Evergreen | `project-docs/` | Stable, long-lived context | Project brief, design system, API spec |
| Development | `features/`, `issues/` | Task-level context | Feature specs, bug reports, plans |
| **Rolling knowledge** | **`wiki/`** | **Evolving decisions and learnings** | **Architecture decisions, onboarding guides, retrospective notes** |

Wiki pages are for knowledge that evolves over time. If something is stable and rarely changes, it belongs in `project-docs/`. If it's tied to a specific task, it belongs in a feature or issue.

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

There are no subdirectories — all wiki pages live at the top level of `wiki/`.

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

See [[deployment-process]] for how this affects our infrastructure.
For context on our target users, see [[personas|our user personas]].
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | No | Display name. If omitted, derived from the filename slug (e.g., `api-conventions.md` becomes "Api Conventions") |
| `aliases` | No | Alternate slugs that wikilinks will resolve to this page |

The slug is always the filename without the `.md` extension.

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

If the target page does not exist, the link is rendered distinctly (e.g., red/dashed) in the web UI, and clicking it opens a pre-filled create form.

### Backlinks

When a page is viewed, Folio automatically finds all other pages that link to it (by slug or alias) and displays them as backlinks. This is computed at read time — you don't need to maintain backlink references manually.

## Creating Wiki Pages

Wiki pages are created by writing markdown files directly to the `folio/wiki/` directory. There is no CLI command for wiki CRUD — manage wiki pages by creating and editing files.

### Creating a new page

1. Choose a descriptive slug (filename). Use lowercase with hyphens: `my-page-name.md`
2. Create the file at `folio/wiki/<slug>.md`
3. Add frontmatter with at least a `title`
4. Write the content in markdown
5. Add `[[wikilinks]]` to connect to related pages

### Example: Creating a decision page

```markdown
---
title: "Database Selection"
aliases:
  - db-choice
---

## Decision

We selected PostgreSQL for the following reasons...

## Alternatives Considered

- SQLite: Too limited for concurrent writes
- MySQL: Team has less experience

## Impact

See [[deployment-process]] for infrastructure changes.
See [[api-conventions]] for query patterns.
```

## When to Create a Wiki Page

Create a wiki page when:

- **A decision was made** that affects the project going forward (architecture, technology choices, process changes)
- **A lesson was learned** during implementation that others should know
- **A process needs documentation** (onboarding, deployment, release procedures)
- **Knowledge keeps coming up** in conversations and should be written down once
- **A retrospective produced insights** worth preserving

Do NOT create a wiki page when:

- The content is stable and rarely changes — use `project-docs/` instead
- The content is about a specific feature or issue — put it in that feature/issue directory
- The content is temporary or throwaway

## Validation

`folio doctor` validates wiki pages:

- Each `.md` file in `wiki/` must have valid YAML frontmatter (can be empty `---\n---`)
- The `title` field should not be empty (produces a warning)

## Tips

- Keep pages focused. One topic per page.
- Use wikilinks liberally — they help agents and humans discover related knowledge.
- Add aliases for common abbreviations (e.g., `aliases: [adr]` for "Architecture Decision Records").
- Update pages when knowledge changes rather than creating new ones. Wiki pages are living documents.
- Use descriptive slugs. `database-selection.md` is better than `decision-3.md`.
