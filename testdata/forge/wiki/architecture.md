---
title: Architecture
modified: "2026-04-11"
icon: boxes
order: 1
---

# Architecture

Forge is a single Go binary that serves both the web UI and a JSON API.

## Components

```
forge (binary)
├── cmd/           ← Cobra CLI commands
├── internal/
│   ├── server/    ← HTTP server, routing
│   ├── store/     ← filesystem read/write
│   ├── model/     ← entity types
│   └── search/    ← in-memory search
└── web/           ← embedded React frontend (go:embed)
```

## Data Flow

```
Browser → Vite Dev Server → /api/* proxy → Go API server
                         → /* (HTML)    → React app

Production:
Browser → Go binary (serves both /api/* and static React build)
```

## Filesystem Layout

```
forge/
├── forge.yaml           ← project config
├── team.md              ← team roster
├── features/
│   └── {slug}/
│       └── FEATURE.md   ← frontmatter + markdown body
├── issues/
│   └── {slug}/
│       └── ISSUE.md
├── sprints/
│   └── {slug}/
│       └── SPRINT.md
└── wiki/
    └── {slug}.md
```


