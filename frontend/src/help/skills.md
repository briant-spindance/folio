---
title: Skills
description: Give AI coding agents structured access to your Folio project with installable skills.
order: 10
icon: cpu
---

# Skills

Skills are structured reference documents (SKILL.md files) that teach AI coding agents how to interact with a Folio project. When installed, they give agents like OpenCode the knowledge to create features, manage issues, read project docs, and more -- all through the Folio CLI.

## What Are Skills?

Each skill is a self-contained markdown file that provides an AI agent with:

- **When to use** the skill (trigger conditions)
- **CLI commands** with flags, examples, and JSON response formats
- **File schemas** (frontmatter fields, valid values, directory structure)
- **Workflows** (step-by-step procedures for common tasks)

Skills bridge the gap between Folio's capabilities and an AI agent's ability to use them. Without skills, an agent would need to discover and learn Folio's CLI on its own. With skills, it has immediate, structured access.

## Installing Skills

Run the install command from your project root:

```bash
folio install-skills
```

This copies the skill files into your AI tool's configuration directory. Currently supported tools:

| Tool | Install Directory |
|------|------------------|
| **OpenCode** | `.opencode/skills/` |

The command auto-detects which tools are available. If multiple tools are supported, it prompts you to choose.

### JSON Output

```bash
folio install-skills --json
```

Returns:

```json
{
  "tool": "OpenCode",
  "target_dir": "/path/to/project/.opencode/skills",
  "skills_installed": [
    { "name": "folio-init", "path": "/path/to/project/.opencode/skills/folio-init/SKILL.md" },
    { "name": "folio-features", "path": "..." },
    { "name": "folio-issues", "path": "..." },
    { "name": "folio-project-docs", "path": "..." },
    { "name": "folio-wiki", "path": "..." },
    { "name": "folio-doctor", "path": "..." }
  ]
}
```

## Available Skills

Folio ships with six skills:

### folio-init

**Purpose:** Bootstrap a new Folio project.

**When an agent uses it:** Setting up Folio for the first time, reinitializing a directory, or configuring `folio.yaml` and `team.md` after initialization.

**Key capabilities:**
- Run `folio init` with appropriate flags
- Configure `folio.yaml` (project name, workflow states)
- Set up the team roster
- Create initial project docs and wiki pages
- Validate setup with `folio doctor`

### folio-features

**Purpose:** Manage features through their full lifecycle.

**When an agent uses it:** Creating, updating, planning, or transitioning features. Writing feature specs and implementation plans.

**Key capabilities:**
- Create features with `folio features create`
- Update status, priority, tags, and assignments
- List and filter features by any field
- Understand the FEATURE.md and PLAN.md schemas
- Follow the status lifecycle (draft -> ready -> in-progress -> review -> done)

### folio-issues

**Purpose:** Track and manage issues.

**When an agent uses it:** Reporting bugs, creating tasks, updating issue status, or linking issues to features.

**Key capabilities:**
- Create issues with `folio issues create` (bug, task, improvement, chore)
- Update status, priority, type, and assignments
- Link issues to parent features
- List and filter issues by any field
- Follow the issue lifecycle (open -> in-progress -> closed)

### folio-project-docs

**Purpose:** Read and understand evergreen project documentation.

**When an agent uses it:** Starting work on a project, needing to understand project goals, conventions, API specs, or design systems.

**Key capabilities:**
- List available project docs with `folio docs list`
- Read specific docs with `folio docs get`
- Understand the three-tier context model
- Know the recommended reading order for gathering context

### folio-wiki

**Purpose:** Manage the rolling knowledge base.

**When an agent uses it:** Creating wiki pages to capture decisions or learnings, editing existing content, or looking up project knowledge.

**Key capabilities:**
- Create and edit wiki pages as files in `folio/wiki/`
- Use wikilink syntax (`[[slug]]`) to connect pages
- Understand when to use wiki vs. project docs
- Follow naming and organization best practices

### folio-doctor

**Purpose:** Run health checks and fix issues.

**When an agent uses it:** Validating project structure, fixing frontmatter errors, resolving broken cross-references, or verifying configuration.

**Key capabilities:**
- Run `folio doctor --json` and parse results
- Understand all 10 validation checks
- Apply fixes for common warnings and failures
- Verify fixes by re-running doctor

## How Skills Work at Build Time

In production builds (`just build`), skill files are embedded into the Go binary using Go's `//go:embed` directive. This means `folio install-skills` works without needing the source `skills/` directory on disk.

In development builds, the command reads skills from the `skills/` directory in the repository.

## Best Practices

- **Run `folio install-skills` after updates.** When you update Folio, re-run the install command to get the latest skill definitions.
- **Don't edit installed skills.** The files in `.opencode/skills/` are managed by Folio. Edits will be overwritten on the next install.
- **Commit the installed skills.** The `.opencode/skills/` directory should be committed to version control so all team members and CI environments have access.
- **Use skills alongside project docs.** Skills teach agents *how* to use Folio. Project docs teach them *about your project*. Both are needed for effective AI-assisted development.
