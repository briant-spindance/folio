# Forge

A lightweight, filesystem-based project management tool for agile teams. Forge provides a web UI on top of a simple directory of markdown files with YAML frontmatter, making project data readable and editable by both humans and AI agents.

## Overview

Forge stores all project data — features, issues, wiki pages, roadmaps, sprints, and team info — as plain markdown files on disk. No database required. The API reads and writes these files directly, and the frontend provides a rich interface for managing them.

### Key Capabilities

- **Features** — Full CRUD with drag-and-drop reordering, inline-editable metadata, supporting file artifacts, and a paginated/filterable list view
- **Issues** — Bug/task/improvement/chore tracking with status, priority, type, labels, assignees, points, and feature association
- **Roadmap** — Kanban-style board with columns, rows, draggable cards, and feature linking
- **Wiki** — Markdown knowledge base with a rich text editor (TipTap) and diff viewing
- **Dashboard** — Overview of project status with quick links to features, issues, docs, and recent activity
- **Search** — Full-text search across all entities
- **AI Chat** — Integrated AI sidebar powered by Anthropic and OpenAI via the Vercel AI SDK

## Architecture

Monorepo with two packages managed by pnpm workspaces:

```
forge/
├── api/          # Hono + Node.js backend
├── frontend/     # React 19 + Vite frontend
└── testdata/     # Sample project data (used in dev)
```

### Backend (`api/`)

- **Framework:** [Hono](https://hono.dev/) with `@hono/node-server`
- **Data layer:** Filesystem-based stores that read/write markdown files with YAML frontmatter (parsed by `gray-matter`)
- **Port:** 3001 (default, configurable via `PORT` env var)
- **Data directory:** Configurable via `FORGE_DATA` env var, defaults to `testdata/forge`

### Frontend (`frontend/`)

- **Framework:** React 19 with react-router-dom v7
- **Build tool:** Vite 8
- **Styling:** Tailwind CSS 4 + custom CSS
- **Data fetching:** TanStack React Query
- **Editor:** TipTap (rich text) + CodeMirror (code artifacts)
- **Drag and drop:** dnd-kit
- **UI components:** shadcn/ui primitives (Radix UI)

### Data Model

All data lives under a single project directory (`testdata/forge` in dev):

```
forge-data/
├── forge.yaml              # Project config (workflow states, etc.)
├── team.md                 # Team roster (YAML frontmatter)
├── roadmap.md              # Kanban board definition
├── features/               # One directory per feature
│   └── my-feature/
│       ├── FEATURE.md      # Title, status, priority, etc. in frontmatter
│       └── *.md|*.json|... # Supporting artifacts
├── issues/                 # One directory per issue
│   └── my-issue/
│       ├── ISSUE.md        # Title, status, type, priority, etc.
│       └── ...             # Supporting artifacts
├── wiki/                   # Markdown knowledge base
│   └── page-name.md
└── sprints/                # One directory per sprint
    └── sprint-1/
        └── SPRINT.md
```

## Getting Started

### Prerequisites

- **Node.js** (v20+)
- **pnpm** (v9+)

### Installation

```bash
pnpm install
```

### Development

Run both the API and frontend concurrently:

```bash
pnpm dev
```

This starts:
- API server at `http://localhost:3001`
- Frontend dev server at `http://localhost:5173` (proxies `/api` requests to the API)

You can also run them individually:

```bash
pnpm api        # API only
pnpm frontend   # Frontend only
```

### Build

```bash
pnpm build
```

Builds the frontend to `frontend/dist/`.

### Configuration

Create an `api/.env` file for environment variables:

```env
PORT=3001
FORGE_DATA=testdata/forge
ANTHROPIC_API_KEY=sk-...     # For AI chat (optional)
OPENAI_API_KEY=sk-...        # For AI chat (optional)
```

## License

Copyright Mutually Human. All rights reserved.
