---
description: Run Folio health checks and fix any issues found
subtask: true
---

Run health checks on this Folio project and fix any issues found.

Follow the skill instructions in @skills/folio-doctor/SKILL.md for fix guidance.

## Current Health Status

!`folio doctor --json`

## Steps

1. Parse the health check results above
2. For each check with `"level": "warn"` or `"level": "fail"`:
   - Identify the check type from the message
   - Apply the appropriate fix as described in the skill instructions
   - If a fix requires judgment (e.g., which slug to rename), ask me before proceeding
3. After all fixes are applied, run `folio doctor --json` again to verify everything passes
4. Report a summary of what was fixed
