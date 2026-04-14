---
title: "ADR-001: Use Markdown Files for Storage"
modified: "2026-03-15"
icon: file-text
order: 4
aliases:
  - adr-001
  - markdown-storage-decision
---

# ADR-001: Use Markdown Files for Storage

**Status:** Accepted  
**Date:** 2026-03-15  
**Deciders:** Alice, Bob, Carol

## Context

We needed to decide how Folio stores project data — features, issues, sprints, and wiki pages. The main options were:

1. **SQLite** — embedded database, fast queries, single file
2. **JSON files** — one file per entity, easy to parse
3. **Markdown files with YAML frontmatter** — human-readable, git-friendly

## Decision

We chose **Markdown files with YAML frontmatter**.

## Rationale

- **Human-readable**: Team members can read and edit files without the Folio UI
- **Git-friendly**: Standard merge/diff tooling works out of the box
- **AI-agent friendly**: LLMs can read and write Markdown natively — no serialization layer needed
- **No dependencies**: No database binary to install or manage
- **Convention-based**: File paths encode meaning (`features/my-feature/FEATURE.md`)

## Trade-offs

- **No relational queries**: We can't JOIN across entities; the [[deployment-runbook|search implementation]] does full scans
- **Parsing overhead**: Every read parses frontmatter + Markdown
- **Concurrency**: No built-in locking (acceptable for local-first, single-user tool)

## Consequences

- All stores read from the filesystem on every request (no cache layer yet)
- The [[team-agreements]] around code review are important because file-based storage means merge conflicts are possible
- This decision is closely related to [[adr-002-local-first]]

## References

- Discussion in [[meeting-notes-2026-04-07]]
- Similar approach: Obsidian, Docusaurus, Jekyll
