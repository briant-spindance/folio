---
description: Work on and resolve an existing Folio issue
---

Work on and resolve the issue "$1".

Follow the skill instructions in @skills/folio-issues/SKILL.md for lifecycle management.

## Steps

1. Read the issue details: `folio issues --json get $1`
2. Read the full ISSUE.md from the issue directory for context
3. If the issue is linked to a feature, also read the feature spec for broader context
4. Transition to `in-progress`: `folio issues --json update $1 --status in-progress`
5. Implement the fix or complete the task:
   - Follow the analysis and reproduction steps in the issue
   - Make the necessary code changes
   - Write or update tests to cover the fix
6. Verify the fix:
   - Run relevant tests
   - Confirm the issue's expected behavior is now met
7. Close the issue: `folio issues --json update $1 --status closed`

## Context

Current issue state:
!`folio issues --json get $1`
