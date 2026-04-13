---
icon: book-open
modified: "2026-04-13"
title: Project Brief 2
---
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

LayerTechnologyCLIGo, CobraWeb UIReact 19, Vite, Tailwind CSS v4APIGo, net/httpStorageFilesystem (Markdown + YAML)AIVercel AI SDK

## Golang System Architecture

Forge's backend is built as a **single Go binary** that provides both CLI commands and an HTTP API server.

### Core Components

**CLI Layer**

- Built with [Cobra](https://github.com/spf13/cobra) for command structure
- All project operations available as subcommands (`forge feature create`, `forge wiki edit`, etc.)
- Direct filesystem operations for maximum speed and simplicity

**API Server**

- JSON REST API served at `/api` using Go's standard `net/http` package
- Single binary serves both static UI assets and API endpoints
- Reads and writes to `forge/` directory in the repository root

**Web Server**

The binary also servers the Single Page Web App (SPA) for the user

**Storage Layer**

- File-based persistence using Markdown and YAML
- No database required — all state is human-readable and git-friendly
- Structured directory layout under `forge/` for features, wiki, sprints, etc.

### Design Philosophy

The Go implementation follows these principles:

1. **Simplicity** — Minimal dependencies, standard library first
2. **Portability** — Single static binary runs anywhere
3. **Transparency** — All operations are file I/O that can be inspected
4. **Performance** — Direct filesystem access, no ORM overhead
5. **AI-friendly** — Structured text files that LLMs can parse and generate

This architecture enables Forge to be both a powerful CLI tool for developers and a web application with full CRUD capabilities, all while maintaining human-readable project state.

## Development Phases

### Phase 1 — Foundation

Core CRUD for all entity types, web UI, CLI parity, health checks.

### Phase 2 — Enhancement

ADRs, review-to-feature linking, enhanced git integration, cloud deployment.

### Phase 3 — AI Integration

Chat interface with project context, AI-assisted feature writing, smart sprint planning.
