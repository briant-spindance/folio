---
title: Project Brief
modified: "2026-04-09"
---

# Project Brief

Forge is a lightweight, local-first project management tool for software teams working alongside AI agents. It stores all project state as Markdown and YAML files directly in your repository.

## Why Forge?

Modern development with AI agents requires project context to be **file-native** — readable by both humans and LLMs, version-controlled alongside code, and structured enough for automation without requiring a database.

## Guiding Principles

- **Files over databases** — all state lives in `forge/` as plain text
- **CLI-first** — every operation available as a shell command
- **AI-native** — designed so LLMs can read and write project state
- **Convention over configuration** — sensible defaults, minimal setup
- **Git-friendly** — diffs, branches, and merges work naturally

## Technology Stack

| Layer | Technology |
|---|---|
| CLI | Go, Cobra |
| Web UI | React 19, Vite, Tailwind CSS v4 |
| API | Go, net/http |
| Storage | Filesystem (Markdown + YAML) |
| AI | Vercel AI SDK |

## Development Phases

### Phase 1 — Foundation
Core CRUD for all entity types, web UI, CLI parity, health checks.

### Phase 2 — Enhancement
ADRs, review-to-feature linking, enhanced git integration, cloud deployment.

### Phase 3 — AI Integration
Chat interface with project context, AI-assisted feature writing, smart sprint planning.
