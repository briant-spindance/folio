---
description: Review current code changes for bugs, issues, and improvements
subtask: true
---

Review the current code changes in this project.

## Changes to Review

### Staged changes:
!`git diff --staged`

### Unstaged changes:
!`git diff`

### Untracked files:
!`git status --porcelain`

## Review Checklist

Analyze all changes above and provide feedback on:

1. **Correctness** - Are there any bugs, logic errors, or edge cases not handled?
2. **Security** - Are there any security vulnerabilities (injection, exposed secrets, etc.)?
3. **Performance** - Are there any obvious performance issues or N+1 patterns?
4. **Style** - Do the changes follow the project's existing conventions and patterns?
5. **Tests** - Are the changes adequately tested? Are there missing test cases?
6. **Documentation** - Do public APIs or significant behavior changes have documentation?

Provide a structured review with specific file:line references and actionable suggestions.
