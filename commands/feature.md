---
description: Create a new Folio feature with spec and optional plan
---

Create a new feature titled "$ARGUMENTS" in this Folio project.

Follow the skill instructions in @skills/folio-features/SKILL.md exactly.

## Steps

1. Use `folio features --json create "$ARGUMENTS"` to create the feature (include `--priority` if it was specified in the arguments)
2. Read the generated FEATURE.md and flesh out the spec with:
   - A clear summary of what this feature does
   - Concrete requirements as a bullet list
   - Acceptance criteria where appropriate
3. Ask me if I'd like to create a PLAN.md with implementation details
4. If yes, create a PLAN.md in the feature directory with:
   - High-level approach
   - Ordered implementation steps
   - Files to create or modify
   - Testing strategy
5. When the spec is complete, transition the feature to `ready`: `folio features --json update <slug> --status ready`

## Context

Recent commits for reference:
!`git log --oneline -10`
