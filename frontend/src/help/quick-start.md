---
title: Quick Start
description: Get Folio up and running in 5 minutes.
order: 1
icon: rocket
---

# Quick Start

Get Folio up and running in 5 minutes. This guide walks you through installation, initialization, and creating your first feature.

## Prerequisites

You need the `folio` binary. If you're building from source, see [Configuration](/help/configuration) for build instructions.

## Initialize a Folio Project

Create the `folio/` directory structure in your project:

```bash
folio init
```

This scaffolds the standard directory layout with default configuration, a team roster template, and starter content. You'll get:

```
folio/
├── folio.yaml              # Project configuration
├── team.md                 # Team roster
├── roadmap.md              # Kanban roadmap
├── features/               # Feature specs
├── issues/                 # Issue tracking
├── wiki/                   # Knowledge base
├── project-docs/           # Evergreen reference docs
└── sprints/                # Sprint data
```

## Configure Your Project

Edit `folio/folio.yaml` with your project name:

```yaml
project: my-project
version: "0.1.0"
workflow:
  states: [draft, deferred, ready, in-progress, review, done]
  default: draft
```

Add your team members to `folio/team.md`:

```yaml
---
members:
  - name: Alice Johnson
    role: Engineer
  - name: Bob Smith
    role: Designer
---
```

## Start the Web Server

```bash
folio web
```

This starts the Folio web server on port 2600. Open [http://localhost:2600](http://localhost:2600) in your browser to see the dashboard.

You can customize the port or data directory:

```bash
folio web --port 8080
folio web --data /path/to/my-project/folio
```

To make Folio discoverable on your local network via mDNS (Bonjour), use the `--mdns` flag:

```bash
folio web --mdns                    # Advertise as folio.local
folio web --mdns=myproject          # Advertise as myproject.local
```

## Create Your First Feature

From the web UI, navigate to **Features** in the sidebar and click **New Feature**. Fill in:

- **Title**: A short, descriptive name
- **Priority**: How urgent the work is
- **Description**: What to build (markdown supported)

Or use the CLI:

```bash
folio features create "User Authentication" --priority high --body "Implement OAuth 2.0 login with Google and GitHub."
```

The feature is created as a markdown file at `folio/features/user-authentication/FEATURE.md` and immediately appears in the web UI.

## Validate Your Setup

Run the health check to make sure everything is configured correctly:

```bash
folio doctor
```

Doctor validates your directory structure, configuration, frontmatter schemas, and cross-references. Fix any warnings before committing.

## Install Agent Skills

If you use an AI coding agent (like OpenCode), install Folio skills to give it direct access to your project context:

```bash
folio install-skills
```

This copies structured SKILL.md reference files into your agent's configuration directory. See the [Skills](/help/skills) documentation for details.

## Building from Source

If you're developing Folio itself and need to build from source:

```bash
just install    # Install dependencies (pnpm + Go modules)
just build      # Full production build
```

This compiles the frontend, embeds it into the Go binary, and produces a single executable. See [Configuration](/help/configuration) for details on build tags and development setup.

## Next Steps

- Read [Core Concepts](/help/concepts) to understand Folio's philosophy and data model
- Learn about [Features](/help/features), [Issues](/help/issues), and the [Wiki](/help/wiki)
- Explore the [CLI Reference](/help/cli) for the full command reference
- Set up [Skills](/help/skills) for AI agent integration
