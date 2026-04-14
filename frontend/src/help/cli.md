---
title: CLI Reference
description: Complete command-line reference for the folio binary.
order: 8
icon: terminal
---

# CLI Reference

The `folio` binary provides both a web server and a set of commands for managing project data from the terminal. All commands support `--json` for machine-readable output, making them suitable for scripting, CI, and AI agent integration.

## Global Flags

These flags are available to all subcommands:

| Flag | Description | Default |
|------|-------------|---------|
| `--data` | Path to the Folio data directory | `./folio` (or `FOLIO_DATA` env var) |
| `--log-dir` | Override log file directory | `~/.local/folio/logs` (production only) |

## folio init

Creates the `folio/` directory structure with default configuration, wiki page templates, and example content.

```bash
folio init                          # Create folio/ in current directory
folio init --data /path/to/project  # Create at a specific path
folio init --force                  # Overwrite existing directory
folio init --json                   # JSON output
```

| Flag | Description | Default |
|------|-------------|---------|
| `--force` | Delete and recreate an existing `folio/` directory | `false` |
| `--json` | Output in JSON format | `false` |

## folio web

Starts the web server, serving the API and the embedded frontend SPA. On first run, Folio creates `~/.local/folio/` and an empty `project-list.yaml` if they don't exist. If a `./folio` directory is found in the current working directory that isn't already registered, Folio will prompt to add it to the project list.

```bash
folio web                           # Start on port 2600, data from ./folio
folio web --port 8080               # Custom port
folio web --data /path/to/project   # Custom data directory (single-project mode)
folio web --projects /path/to/list  # Custom project-list.yaml (skips ~/.local/folio)
folio web --mdns                    # Advertise as folio.local via mDNS
folio web --mdns=myproject          # Advertise as myproject.local
```

| Flag | Description | Default |
|------|-------------|---------|
| `--port` | Port to listen on | `2600` |
| `--static` | Path to frontend dist directory | Embedded (production) |
| `--projects` | Path to a custom project-list.yaml | `~/.local/folio/project-list.yaml` |
| `--mdns` | Enable mDNS with optional hostname | Disabled; default hostname `folio.local` |

## folio projects

Commands for managing the project list. Alias: `folio project`.

Folio supports multiple projects from a single server. Projects are tracked in `~/.local/folio/project-list.yaml` (or a custom path via `--projects`). The web UI shows a project switcher dropdown when two or more projects are registered.

### List

```bash
folio projects list                 # List all registered projects
folio projects --json list          # JSON output
```

Output shows each project's name, slug, path, and which is active (marked with `*`).

### Add

```bash
folio projects add /path/to/folio          # Register a project
folio projects add /path --name "My App"   # Register with a custom name
folio projects --json add /path/to/folio   # JSON output
```

The path must be a directory containing a `folio.yaml` file. The project name is read from `folio.yaml` unless overridden with `--name`.

| Flag | Type | Description |
|------|------|-------------|
| `--name` | string | Override the project name (default: read from folio.yaml) |

### Remove

```bash
folio projects remove <slug>
```

Removes a project from the project list. You cannot remove the currently active project -- activate a different project first.

### Activate

```bash
folio projects activate <slug>
```

Sets the active project. The active project is the default project loaded when the web UI starts.

## folio features

CRUD commands for managing features. Alias: `folio feature`.

The `--json` flag is a persistent flag on the parent command and must be placed **before** the subcommand:

```bash
# Correct
folio features --json list

# Incorrect -- will not work
folio features list --json
```

### List

```bash
folio features --json list
folio features --json list --status in-progress,review
folio features --json list --priority high,critical
folio features --json list --assignee "Alice"
folio features --json list --tags backend,api
folio features --json list --sort priority --dir desc
```

| Flag | Type | Description |
|------|------|-------------|
| `--status` | comma-separated | Filter by status |
| `--priority` | comma-separated | Filter by priority |
| `--assignee` | string | Filter by assignee name |
| `--tags` | comma-separated | Filter by tags |
| `--sort` | string | Sort by: `order`, `title`, `status`, `priority`, `modified` |
| `--dir` | string | Sort direction: `asc`, `desc` |
| `--limit` | int | Items per page (default: 50) |
| `--page` | int | Page number (default: 1) |

### Get

```bash
folio features --json get <slug>
```

### Create

```bash
folio features --json create "My Feature" --priority high --body "Description"
```

| Flag | Type | Description |
|------|------|-------------|
| `--priority` | string | `critical`, `high`, `medium`, `low` |
| `--body` | string | Feature description (markdown) |

### Update

```bash
folio features --json update <slug> --status in-progress
folio features --json update <slug> --title "New Title" --priority critical
folio features --json update <slug> --tags "backend,api"
```

| Flag | Type | Description |
|------|------|-------------|
| `--title` | string | New title |
| `--status` | string | New status |
| `--priority` | string | New priority |
| `--body` | string | New body (markdown) |
| `--tags` | comma-separated | Set tags (empty string clears) |

### Delete

```bash
folio features --json delete <slug>
```

## folio issues

CRUD commands for managing issues. Alias: `folio issue`.

The `--json` flag placement follows the same pattern as features.

### List

```bash
folio issues --json list
folio issues --json list --status open
folio issues --json list --type bug --priority critical,high
folio issues --json list --feature my-feature
folio issues --json list --assignee "Charlie"
folio issues --json list --labels security,backend
folio issues --json list --sort priority --dir desc
```

| Flag | Type | Description |
|------|------|-------------|
| `--status` | comma-separated | Filter by status |
| `--type` | comma-separated | Filter by type |
| `--priority` | comma-separated | Filter by priority |
| `--assignee` | string | Filter by assignee name |
| `--feature` | string | Filter by linked feature slug |
| `--labels` | comma-separated | Filter by labels |
| `--sort` | string | Sort by: `order`, `title`, `status`, `type`, `priority`, `modified` |
| `--dir` | string | Sort direction: `asc`, `desc` |
| `--limit` | int | Items per page (default: 50) |
| `--page` | int | Page number (default: 1) |

### Get

```bash
folio issues --json get <slug>
```

### Create

```bash
folio issues --json create "Fix login bug" --type bug --priority high --feature user-auth
```

| Flag | Type | Description |
|------|------|-------------|
| `--type` | string | `bug`, `task`, `improvement`, `chore` |
| `--priority` | string | `critical`, `high`, `medium`, `low` |
| `--body` | string | Issue description (markdown) |
| `--feature` | string | Linked feature slug |

### Update

```bash
folio issues --json update <slug> --status closed
folio issues --json update <slug> --priority critical
folio issues --json update <slug> --feature user-auth
```

| Flag | Type | Description |
|------|------|-------------|
| `--title` | string | New title |
| `--status` | string | New status |
| `--type` | string | New type |
| `--priority` | string | New priority |
| `--body` | string | New body (markdown) |
| `--feature` | string | Linked feature slug (empty string to unlink) |
| `--labels` | comma-separated | Set labels (empty string clears) |

### Delete

```bash
folio issues --json delete <slug>
```

## folio docs

Read-only commands for viewing project documents.

```bash
folio docs --json list              # List all project documents
folio docs --json get project-brief # Show a specific document
```

## folio doctor

Runs health checks against the `folio/` directory to find structural issues, invalid frontmatter, broken references, and other problems. Exits with code 1 if any checks fail.

```bash
folio doctor                        # Run all health checks
folio doctor --json                 # Machine-readable output
folio doctor --data /path/to/project
```

### What Doctor Validates

1. **Directory structure** -- Required directories exist (`features/`, `issues/`, `wiki/`, `sprints/`, `project-docs/`)
2. **Configuration** -- `folio.yaml` exists, is valid YAML, has required fields
3. **Feature frontmatter** -- All features have valid frontmatter with valid status and priority
4. **Issue frontmatter** -- All issues have valid frontmatter with valid status, type, and priority
5. **Wiki pages** -- All wiki pages parse correctly and have titles
6. **Project docs** -- All project docs have valid frontmatter
7. **Team file** -- `team.md` parses correctly, members have names
8. **Roadmap consistency** -- Cards reference valid columns and rows
9. **Duplicate slugs** -- No slug collisions between features and issues
10. **Referential integrity** -- Issue `feature` references and roadmap `feature_slug` references point to existing features

### Severity Levels

| Level | Meaning | Exit Code |
|-------|---------|-----------|
| `pass` | Check succeeded | 0 |
| `warn` | Non-critical problem | 0 |
| `fail` | Critical problem | 1 |

## folio install-skills

Installs Folio agent skills (SKILL.md files) into the configuration directory for your AI coding tool. See [Skills](/help/skills) for details.

```bash
folio install-skills                # Interactive tool selection
folio install-skills --json         # JSON output
```

## folio version

Prints the folio version, commit hash, build date, and Go version.

```bash
folio version                       # Human-readable output
folio version --json                # Machine-readable output
```
