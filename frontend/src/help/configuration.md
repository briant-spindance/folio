---
title: Configuration
description: Configure Folio with folio.yaml, environment variables, and runtime flags.
order: 9
icon: settings
---

# Configuration

Folio is configured through a combination of a project configuration file (`folio.yaml`), environment variables, and command-line flags.

## folio.yaml

The main configuration file lives at the root of your Folio data directory:

```yaml
project: my-project
version: "0.1.0"
workflow:
  states: [draft, deferred, ready, in-progress, review, done]
  default: draft
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `project` | Yes | Project name, displayed in the dashboard and CLI output |
| `version` | No | Project version string |
| `workflow.states` | Yes | Ordered list of feature status values |
| `workflow.default` | Yes | Initial status assigned to new features (must be in `states`) |

### Customizing Workflow States

The `workflow.states` list defines the valid statuses a feature can have. Customize these to match your team's process:

```yaml
# Example: Simpler workflow
workflow:
  states: [backlog, in-progress, done]
  default: backlog

# Example: With staging
workflow:
  states: [backlog, ready, in-progress, review, staging, done]
  default: backlog
```

The default Folio workflow is:

```
draft -> deferred -> ready -> in-progress -> review -> done
```

Note that issue statuses (`open`, `in-progress`, `closed`) are separate and not configurable through `folio.yaml`.

## Data Directory

Folio looks for project data in a `folio/` directory. The location is determined by (in order of precedence):

1. **`--data` flag** -- Pass explicitly on any command
2. **`FOLIO_DATA` environment variable** -- Set once for your session or shell profile
3. **Default** -- `./folio` relative to the current working directory

```bash
# Using the flag
folio web --data /path/to/my-project/folio

# Using the environment variable
export FOLIO_DATA=/path/to/my-project/folio
folio web

# Using the default (./folio)
cd /path/to/my-project
folio web
```

## Team Roster

The team roster is defined in `folio/team.md`:

```yaml
---
members:
  - name: Alice Johnson
    role: Engineer
  - name: Bob Smith
    role: Designer
  - name: Charlie Davis
    role: Product Owner
---

# Team

Project team members and roles.
```

Each member needs at minimum a `name`. The `role` is optional but recommended. Member names are used for:

- Assigning features and issues (autocomplete in the UI)
- Validation in `folio doctor`
- Display throughout the web UI

## Logging

Logging behavior depends on how Folio is built:

| Mode | Log Destination | How to Set |
|------|----------------|------------|
| **Dev** (`just dev`) | Console (stderr) | Automatic |
| **Production** (`just build`) | `~/.local/folio/logs/folio.log` | Override with `--log-dir` |

```bash
# Override log directory in production
folio web --log-dir /var/log/folio
```

## mDNS / Bonjour

Folio can advertise itself on the local network using mDNS (Bonjour), making it discoverable as `folio.local` or a custom hostname:

```bash
# Advertise as folio.local
folio web --mdns

# Advertise as myproject.local
folio web --mdns=myproject
```

This is useful when running Folio on a shared development machine or NAS.

## Web Server Options

| Flag | Description | Default |
|------|-------------|---------|
| `--port` | Port to listen on | `2600` |
| `--static` | Path to frontend dist directory (overrides embedded) | Embedded frontend |
| `--mdns` | Enable mDNS with optional hostname | Disabled |
| `--data` | Path to Folio data directory | `./folio` |
| `--log-dir` | Override log file directory | `~/.local/folio/logs` |

## Production Build

A production build embeds the frontend SPA into the Go binary:

```bash
just build
```

The resulting binary is fully self-contained -- no Node.js runtime, no separate static files. Deploy a single file.

### Build Tags

| Tag | Purpose |
|-----|---------|
| `embed` | Embed the frontend `dist/` into the binary |
| `embed_skills` | Embed the `skills/` directory into the binary |

Both tags are set automatically by `just build`. For manual builds:

```bash
go build -tags 'embed embed_skills' -o folio ./cmd/folio
```

## Validation

Run `folio doctor` to validate your configuration:

```bash
folio doctor
```

Doctor checks that `folio.yaml` exists, parses correctly, and has all required fields. It also validates the team roster, directory structure, and all content files. See the [CLI Reference](/help/cli) for the full list of checks.
