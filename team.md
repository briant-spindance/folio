# Team

## Purpose

`team.md` lives at `forge/team.md` and defines the team members who can be assigned to features and issues. The `name` field is the canonical identifier used by `--assignee` flags in the CLI and assignee fields in the web UI.

Forge uses this file for:

- **Assignment validation** — `forge doctor` checks that all `assignee` values in feature and issue frontmatter match a `name` defined here.
- **Autocomplete** — The CLI and web UI can read this file to offer assignee suggestions.
- **Team visibility** — Provides a single place to see who is on the project and their roles.

## Format

`team.md` uses YAML frontmatter for structured member data and an optional markdown body for notes about team structure, conventions, or responsibilities.

### Frontmatter Schema

```yaml
---
members:
  - name: <string>        # Required. Display name used for assignment.
    role: <string>         # Optional. Team role (e.g., engineer, designer, product, pumpking).
    github: <string>       # Optional. GitHub username.
---
```

### Fields

| Field    | Type   | Required | Description                                                              |
|----------|--------|----------|--------------------------------------------------------------------------|
| `name`   | string | Yes      | The display name used for assignment. Must be unique within the team.    |
| `role`   | string | No       | The team member's role (e.g., `engineer`, `designer`, `product`, `pumpking`). Free-form text. |
| `github` | string | No       | GitHub username. Useful for integration and identification.              |

## Example

```yaml
---
members:
  - name: Alice Johnson
    role: engineer
    github: alicej
  - name: Bob Smith
    role: designer
    github: bobs
  - name: Carol Davis
    role: product
    github: carold
  - name: Dan Lee
    role: pumpking
    github: danl
---
```

```markdown
# Team

## Conventions

- Use full names (first + last) for `name` to avoid ambiguity.
- The pumpking role is responsible for merging completed features into the main codebase.
- Engineers and designers can be assigned to features and issues. Product members typically author features but are not assigned as implementors.
```
