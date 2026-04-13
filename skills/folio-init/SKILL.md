---
name: folio-init
description: Bootstrap a new Folio project. Use when setting up a fresh Folio directory structure with configuration, team roster, and initial documentation.
---

# Folio Init

Bootstrap a new Folio project directory with the standard structure, configuration, and starter content.

## When to Use This Skill

Use this skill when:

- Setting up Folio for the first time in a project
- Reinitializing a Folio directory (with `--force`)
- Configuring `folio.yaml` after initialization
- Setting up the team roster
- Understanding what the scaffold creates

## Initializing a Project

```bash
# Create folio/ in the current directory
folio init

# Create at a specific path
folio init --data /path/to/project

# Overwrite an existing folio/ directory
folio init --force

# JSON output
folio init --json
```

| Flag | Type | Description |
|------|------|-------------|
| `--force` | bool | Delete and recreate an existing `folio/` directory |
| `--json` | bool | Output in JSON format |
| `--data` | string | Path to the Folio data directory (global flag, default: `./folio`) |

**JSON response:**

```json
{
  "path": "/absolute/path/to/folio",
  "template": "built-in",
  "files_created": [
    "folio.yaml",
    "team.md",
    ".gitignore",
    "roadmap.md",
    "wiki/project-brief.md",
    "features/backlog.md",
    "reviews/architecture/REVIEW.md"
  ]
}
```

## What Gets Created

The `folio init` command creates this directory structure:

```
folio/
├── folio.yaml                    # Project configuration
├── team.md                       # Team roster
├── .gitignore                    # Excludes .sessions/ and .env.local
├── roadmap.md                    # Kanban roadmap (now/next/later)
├── features/
│   └── backlog.md                # Feature backlog placeholder
├── issues/                       # Empty
├── wiki/
│   └── project-brief.md          # Starter project brief
├── sprints/                      # Empty
├── project-docs/                 # Empty
├── reviews/
│   └── architecture/
│       └── REVIEW.md             # Architecture review checklist
└── .sessions/                    # AI session storage (gitignored)
```

## Post-Init Configuration

After running `folio init`, configure these files:

### 1. Configure `folio.yaml`

The default configuration:

```yaml
project: my-project
version: "0.1.0"
workflow:
  states: [draft, deferred, ready, in-progress, review, done]
  default: draft
```

| Field | Description |
|-------|-------------|
| `project` | Project name (used in the dashboard and CLI output) |
| `version` | Project version string |
| `workflow.states` | Ordered list of feature status values. Customize to match your team's process. |
| `workflow.default` | The initial status assigned to new features. Must be one of the `states`. |

**Customization example:**

```yaml
project: my-saas-app
version: "1.0.0"
workflow:
  states: [backlog, ready, in-progress, review, staging, done]
  default: backlog
```

### 2. Set Up the Team Roster

Edit `folio/team.md` to add team members:

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

- Assigning features and issues
- Validation in `folio doctor`
- Autocomplete in the CLI and web UI

### 3. Write the Project Brief

Edit `folio/wiki/project-brief.md` (created by init) to describe:

- What the project is
- Why it exists
- Who it's for
- Core principles or constraints

This is typically the first document a new team member or AI agent reads.

### 4. Add Project Docs

Create evergreen documents in `folio/project-docs/`:

```yaml
---
title: "Design System"
order: 1
---

# Design System

Document your design principles, component patterns, colors, and typography here.
```

Common project docs to create:

| Document | Slug | Purpose |
|----------|------|---------|
| Project Brief | `project-brief` | What and why |
| Design System | `design` | Visual language and components |
| API Specification | `api` | REST endpoints and data shapes |
| Conventions | `conventions` | Coding standards and patterns |
| Architecture | `architecture` | System design and infrastructure |

### 5. Validate the Setup

Run the health check to verify everything is configured correctly:

```bash
folio doctor
```

This validates directory structure, configuration, frontmatter, and cross-references. Fix any warnings or failures before proceeding.

## Workflow

1. Run `folio init` in your project root
2. Edit `folio.yaml` with your project name and workflow states
3. Fill in `team.md` with team members
4. Write the project brief in `wiki/project-brief.md`
5. Add any evergreen docs to `project-docs/`
6. Run `folio doctor` to validate
7. Commit the `folio/` directory to version control
