# Folio

An experimental, local-first project management tool that stores features, plans, issues, and docs as markdown files on disk — designed for teams working with AI agents. Folio provides a web UI for managing context and a CLI for agent integration.

## Philosophy

**Agile for agentic engineering.** Folio shares the principles of Scrum — transparency, inspection, and adaptation — and extends them to a world where AI agents are first-class participants in the development process.

**Features, not user stories.** The core artifact in Folio is the *Feature*, composed of a `FEATURE.md` (what to build) and a `PLAN.md` (how to build it). This is a lightweight form of spec-driven development where each feature is co-owned by product, engineering, and design.

**Three tiers of context.** Agentic development requires context, and that context should be colocated and versioned with the rest of a project:

- **Evergreen** — Long-lived project documents: purpose, personas, tech stack, design system, conventions (`project-docs/`)
- **Development** — Task-level context: features with specs and plans, issues with reproduction steps and analysis (`features/`, `issues/`)
- **Rolling knowledge** — Learnings, decisions, and notes that evolve over time (`wiki/`)

**Files, not databases.** All project data is stored as plain markdown files with YAML frontmatter. No database to set up, migrate, or back up. The filesystem is the source of truth, and your data is always readable, grep-able, and diffable.

**Orthogonal by design.** Folio is not an IDE, not an agent harness, not version control, and not a communication tool. It is intended to complement these tools — not replace them. It works alongside git, editors, CI/CD, Slack, and whatever agent framework you prefer.

**A single binary.** One Go binary provides a web interface for managing context documents and is designed to also serve as a CLI tool for agents.

**Opinionated but customizable.** Folio includes sane defaults for organizing context (workflow states, directory structure, frontmatter schemas) but can be customized to fit your team's process.

**Skills** *(future)*. Folio will be able to install skills into common agent tools (Claude Code, OpenCode, etc.) to give agents direct access to project context.

## Data Model

All data lives under a single directory (`./folio` by default) within the overall project:

```
folio/
├── folio.yaml              # Project config (workflow states, etc.)
├── team.md                 # Team roster (YAML frontmatter)
├── roadmap.md              # Kanban board definition
├── project-docs/           # Evergreen context
│   ├── project-brief.md
│   ├── design.md
│   └── ...
├── features/               # One directory per feature
│   └── my-feature/
│       ├── FEATURE.md      # Metadata in frontmatter + description
│       ├── PLAN.md         # Implementation plan (optional)
│       └── *.md|*.json|... # Supporting artifacts
├── issues/                 # One directory per issue
│   └── my-issue/
│       ├── ISSUE.md        # Metadata in frontmatter + description
│       └── ...             # Supporting artifacts
└── wiki/                   # Rolling knowledge base
    └── page-name.md
```

## Frontend

The web UI is a React single-page application embedded into the Go binary for production deployments.

- **Framework:** React 19 with react-router-dom v7
- **Build tool:** Vite 8
- **Styling:** Tailwind CSS 4 + custom CSS
- **Data fetching:** TanStack React Query
- **Editor:** TipTap (rich text) + CodeMirror (code artifacts)
- **Drag and drop:** dnd-kit
- **UI components:** shadcn/ui primitives (Radix UI)

In development, the frontend runs as a separate Vite dev server and proxies API requests to the Go backend.

## Getting Started

### Prerequisites

- **Go** 1.21+
- **Node.js** 20+ and **pnpm** 9+ (for building the frontend)
- **[just](https://github.com/casey/just)** command runner

### Quick Start

```bash
just install        # Install all dependencies (pnpm + Go modules)
just dev            # Start Go backend + Vite frontend dev server
```

The dev server starts at `http://localhost:5173` (Vite, proxying API to Go on port 2600), using `testdata/folio` for sample data.

### Common Commands

Run `just` with no arguments to see all available recipes. Key commands:

```bash
just test           # Run all tests (Go + frontend)
just lint           # Run all linters (ESLint + go vet)
just build          # Full production build (frontend + Go binary with embedded SPA)
just clean          # Clean all build artifacts
```

Individual targets are also available: `just test-go`, `just test-frontend`, `just build-frontend`, `just build-go`, etc.

### Production Build

`just build` produces a single self-contained Go binary with the frontend embedded. No Node.js runtime required at deploy time.

### Running

```bash
folio web                           # Start on port 2600, data from ./folio
folio web --port 8080               # Custom port
folio web --data /path/to/project   # Custom data directory
folio web --mdns                    # Advertise as folio.local via mDNS
folio web --mdns=myproject          # Advertise as myproject.local
```

### CLI Reference

**Global flags** (available to all subcommands):

| Flag | Description | Default |
|------|-------------|---------|
| `--data` | Path to the Folio data directory | `./folio` (or `FOLIO_DATA` env var) |
| `--log-dir` | Override log file directory | `~/.local/folio/logs` (production only) |

**`folio web` flags:**

| Flag | Description | Default |
|------|-------------|---------|
| `--port` | Port to listen on | `2600` |
| `--static` | Path to frontend dist directory | Embedded (production) |
| `--mdns` | Enable mDNS with optional hostname | Disabled; default hostname `folio.local` |

### Configuration

Create a `folio.yaml` in your data directory:

```yaml
project: my-project
version: "0.1.0"
workflow:
  states: [draft, deferred, ready, in-progress, review, done]
  default: draft
```

Set `FOLIO_DATA` to point to your project data directory, or use `--data`:

```bash
export FOLIO_DATA=/path/to/my-project
folio web
```

### Logging

- **Dev mode** (`just dev`): Logs are written to the console (stderr).
- **Production builds** (`just build`): The resulting binary logs to `~/.local/folio/logs/folio.log`. Override with `--log-dir`.

## License

MIT — see [LICENSE](LICENSE).
