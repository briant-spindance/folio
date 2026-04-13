---
title: CLI Reference
modified: "2026-04-12"
icon: terminal
order: 4
---

# CLI Reference

The `folio` binary exposes all project management operations as subcommands.

## Global Flags

| Flag | Description |
|---|---|
| `--dir` | Path to project root (default: current directory) |
| `--json` | Output machine-readable JSON |

## Commands

### `folio init`

Scaffold a new `folio/` directory in the current project.

```bash
folio init
```

### `folio feature`

Manage features.

```bash
folio feature list
folio feature view <slug>
folio feature create --title "My Feature"
folio feature status <slug> in-progress
folio feature assign <slug> alice
```

### `folio backlog`

Manage the prioritized feature backlog.

```bash
folio backlog list
folio backlog reorder <slug> --priority 3
folio backlog promote <slug>
folio backlog demote <slug>
```

### `folio sprint`

Manage sprints.

```bash
folio sprint list
folio sprint create --name "Sprint 4"
folio sprint add <sprint-slug> <feature-slug>
folio sprint start <sprint-slug>
folio sprint complete <sprint-slug>
folio sprint board <sprint-slug>
```

### `folio issue`

Manage issues.

```bash
folio issue list
folio issue create --title "Bug: login timeout"
folio issue view <slug>
```

### `folio doctor`

Run health checks on the project structure.

```bash
folio doctor
```





