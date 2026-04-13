---
description: Create a new Folio issue (bug, task, improvement, chore)
---

Create a new issue titled "$ARGUMENTS" in this Folio project.

Follow the skill instructions in @skills/folio-issues/SKILL.md exactly.

## Steps

1. Determine the issue type and priority from the arguments and context:
   - If the title suggests a bug (e.g., "fix", "broken", "error"), default to `--type bug`
   - If it's a new piece of work, default to `--type task`
   - If it improves existing functionality, default to `--type improvement`
   - If it's maintenance or cleanup, default to `--type chore`
2. Use `folio issues --json create "$ARGUMENTS" --type <type> --priority <priority>` to create the issue
3. Edit the generated ISSUE.md to add:
   - A clear description of the issue
   - Steps to reproduce (for bugs)
   - Expected behavior
   - Any relevant analysis
4. If this issue relates to an existing feature, link it: `folio issues --json update <slug> --feature <feature-slug>`

## Context

Existing features for linking:
!`folio features --json list --limit 10`
