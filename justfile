# Folio — project-level task runner
# Run `just` with no arguments to see all available recipes.

# Default recipe: list all available commands
default:
    @just --list

# ── Dependencies ──────────────────────────────────────────────────

# Install all dependencies (Node.js + Go)
install:
    pnpm install
    cd commandline && go mod download

# ── Development ───────────────────────────────────────────────────

# Start Go backend + Vite frontend dev server
dev:
    #!/usr/bin/env bash
    set -euo pipefail
    cd commandline && go build -o folio ./cmd/folio/
    npx concurrently --names go,vite --prefix-colors cyan,magenta \
        "cd commandline && ./folio web --data ../testdata/folio --static ../frontend/dist" \
        "cd frontend && pnpm dev"

# Start Node.js API + Vite frontend (legacy, for AI chat development)
dev-api:
    npx concurrently --names api,vite --prefix-colors cyan,magenta \
        "pnpm --filter api dev" \
        "VITE_API_PORT=3001 pnpm --filter frontend dev"

# ── Building ──────────────────────────────────────────────────────

# Build the frontend
build-frontend:
    cd frontend && pnpm build

# Build the Go binary (dev mode, no embedded frontend)
build-go:
    cd commandline && go build -o folio ./cmd/folio/

# Full production build: frontend + Go binary with embedded frontend
build: build-frontend
    cd commandline && rm -rf cmd/folio/dist
    cp -r frontend/dist commandline/cmd/folio/dist
    cd commandline && go build -tags embed -o folio ./cmd/folio/
    rm -rf commandline/cmd/folio/dist

# ── Testing ───────────────────────────────────────────────────────

# Run all tests (Go + frontend)
test: test-go test-frontend

# Run Go tests
test-go:
    cd commandline && go test ./... -v

# Run frontend tests
test-frontend:
    cd frontend && pnpm test

# Run frontend tests in watch mode
test-watch:
    cd frontend && pnpm test:watch

# ── Linting ───────────────────────────────────────────────────────

# Run all linters
lint: lint-frontend lint-go

# Run frontend ESLint
lint-frontend:
    cd frontend && pnpm lint

# Run Go vet
lint-go:
    cd commandline && go vet ./...

# ── Cleanup ───────────────────────────────────────────────────────

# Clean all build artifacts
clean:
    rm -f commandline/folio
    rm -rf commandline/cmd/folio/dist
    rm -rf frontend/dist

# ── Shortcuts ─────────────────────────────────────────────────────

# Full production build from scratch (install + build)
prod: install build
