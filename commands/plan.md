---
description: Execute the implementation plan for a Folio feature
---

Execute the implementation plan for the feature "$1".

Follow the skill instructions in @skills/folio-features/SKILL.md for lifecycle management.

## Steps

1. Read the feature spec and plan:
   - `folio features --json get $1` to get the feature details
   - Read the FEATURE.md and PLAN.md from the feature directory
2. Transition the feature to `in-progress`: `folio features --json update $1 --status in-progress`
3. Execute each step in the PLAN.md sequentially:
   - Create or modify files as specified
   - Run tests after each significant change
   - Commit logical units of work
4. After all steps are complete, verify the implementation:
   - Run the full test suite
   - Ensure all acceptance criteria from FEATURE.md are met
5. Transition the feature to `review`: `folio features --json update $1 --status review`

## Context

Current feature state:
!`folio features --json get $1`
