---
title: Project Brief
order: 0
---
## Overview

Folio is a local-first project management tool that stores features, plans, issues, and docs as markdown files on disk. It is designed for teams working with AI agents, providing a web UI for managing project context and a CLI for agent integration.

A single Go binary serves both the web interface and CLI commands. The React frontend is embedded into the binary at build time, so there are no runtime dependencies beyond the binary itself.

## Why Folio Exists

Agentic development demands well-structured, accessible context. Most project management tools lock data behind APIs, databases, or proprietary formats that are difficult for AI agents to read and write. Folio solves this by keeping everything as plain markdown files with YAML frontmatter -- readable, grep-able, diffable, and version-controlled alongside the code.

## Who It's For

- Small teams and solo developers who work alongside AI coding agents
- Teams that want project context colocated with their codebase
- Developers who prefer files over databases and CLIs over GUIs

## Core Principles

- **Files, not databases.** All project data is plain markdown with YAML frontmatter. The filesystem is the source of truth.
- **Agile for agentic engineering.** Extends Scrum principles (transparency, inspection, adaptation) to a world where AI agents are first-class development participants.
- **Features, not user stories.** The core artifact is the Feature, composed of a FEATURE.md (what to build) and a PLAN.md (how to build it).
- **Three tiers of context.** Evergreen project docs, task-level feature/issue specs, and rolling wiki knowledge -- all versioned with the project.
- **Complementary, not competing.** Folio is not an IDE, agent harness, or version control system. It works alongside git, editors, CI/CD, and agent frameworks.
- **A single binary.** One Go executable provides both the web UI and the CLI.
- **Opinionated but customizable.** Sane defaults for directory structure, workflow states, and frontmatter schemas, all configurable via folio.yaml.

## Technical Stack

| Layer | Technology |
|-------|------------|
| Backend & CLI | Go 1.25, chi (HTTP), cobra (CLI), YAML/frontmatter parsing |
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS 4 |
| Editor | TipTap (rich text), CodeMirror (code) |
| UI components | shadcn/ui (Radix), dnd-kit (drag & drop), TanStack React Query |
| Build & release | just (task runner), GoReleaser, GitHub Actions |
| Package manager | pnpm (frontend), Go modules (backend) |

## Key Constraints

- No external database or runtime dependencies -- everything is files on disk
- The Go binary must embed the frontend SPA for zero-dependency production deploys
- All CLI commands must support `--json` output for machine consumption
- Data format must remain human-readable and editable with any text editor
- Multi-project support: a single server can manage multiple folio directories
