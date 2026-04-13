---
title: Contributing Guide
modified: "2026-04-12"
icon: git-pull-request
order: 5
---

# Contributing Guide

## Getting Started

```bash
git clone https://github.com/your-org/folio
cd folio
pnpm install
pnpm dev
```

This starts:
- **API server** on `http://localhost:3001` (Hono, reads `testdata/folio/`)
- **Frontend** on `http://localhost:5173` (Vite, proxies `/api` to API server)

## Project Structure

```
folio/
├── api/          ← Hono dev server (TypeScript)
├── frontend/     ← React 19 + Vite + shadcn/ui
├── testdata/     ← Sample folio project data
├── demo/         ← Static HTML mockups (reference)
└── project-docs/ ← Specifications and planning docs
```

## Code Style

- TypeScript strict mode everywhere
- ESLint + Prettier (run `pnpm lint` and `pnpm format`)
- Component files are PascalCase, utility files are kebab-case

## Pull Request Process

1. Branch from `main`
2. Write tests for new behavior
3. Ensure `pnpm build` passes
4. Open a PR with a description matching the feature spec





