---
title: CLI Reference
modified: "2026-04-07"
icon: terminal
---

# CLI Reference

The `forge` binary exposes all project management operations as subcommands.

## Global Flags

| Flag | Description |
|---|---|
| `--dir` | Path to project root (default: current directory) |
| `--json` | Output machine-readable JSON |

## Commands

### `forge init`

Scaffold a new `forge/` directory in the current project.

```bash
forge init
```

### `forge feature`

Manage features.

```bash
forge feature list
forge feature view <slug>
forge feature create --title "My Feature"
forge feature status <slug> in-progress
forge feature assign <slug> alice
```

### `forge backlog`

Manage the prioritized feature backlog.

```bash
forge backlog list
forge backlog reorder <slug> --priority 3
forge backlog promote <slug>
forge backlog demote <slug>
```

### `forge sprint`

Manage sprints.

```bash
forge sprint list
forge sprint create --name "Sprint 4"
forge sprint add <sprint-slug> <feature-slug>
forge sprint start <sprint-slug>
forge sprint complete <sprint-slug>
forge sprint board <sprint-slug>
```

### `forge issue`

Manage issues.

```bash
forge issue list
forge issue create --title "Bug: login timeout"
forge issue view <slug>
```

### `forge doctor`

Run health checks on the project structure.

```bash
forge doctor
```
