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
dev: build-go
    npx concurrently --names go,vite --prefix-colors cyan,magenta \
        "cd commandline && ./folio web --data ../testdata/folio --static ../frontend/dist" \
        "cd frontend && pnpm dev"

# ── Building ──────────────────────────────────────────────────────

# Build the frontend
build-frontend:
    cd frontend && pnpm build

# Build version info
version := `git describe --tags --always --dirty 2>/dev/null || echo "dev"`
commit  := `git rev-parse --short HEAD 2>/dev/null || echo "unknown"`
date    := `date -u +%Y-%m-%dT%H:%M:%SZ`
ldflags := "-X github.com/briant-spindance/folio/cmd/folio/cmd.Version=" + version + " -X github.com/briant-spindance/folio/cmd/folio/cmd.Commit=" + commit + " -X github.com/briant-spindance/folio/cmd/folio/cmd.Date=" + date

# Build the Go binary (dev mode, no embedded frontend)
build-go:
    cd commandline && go build -ldflags '{{ldflags}}' -o folio ./cmd/folio/

# Full production build: frontend + Go binary with embedded frontend
build: build-frontend
    cd commandline && rm -rf cmd/folio/dist
    cp -r frontend/dist commandline/cmd/folio/dist
    cd commandline && go build -tags embed -ldflags '{{ldflags}}' -o folio ./cmd/folio/
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

# ── Coverage ──────────────────────────────────────────────────────

# Generate combined coverage report (Go + frontend)
coverage: coverage-go coverage-frontend
    #!/usr/bin/env bash
    set -euo pipefail
    mkdir -p coverage/combined
    # Prefix frontend LCOV paths with frontend/ for the combined report
    sed 's|^SF:src/|SF:frontend/src/|' coverage/frontend/lcov.info > coverage/combined/frontend.lcov
    cp coverage/go/lcov.info coverage/combined/go.lcov
    # Merge and generate combined HTML report
    lcov -a coverage/combined/go.lcov -a coverage/combined/frontend.lcov \
         -o coverage/combined/merged.lcov --ignore-errors inconsistent
    genhtml coverage/combined/merged.lcov -o coverage/combined/html \
            --ignore-errors inconsistent,category
    echo ""
    echo "Coverage reports:"
    echo "  Go:       coverage/go/index.html"
    echo "  Frontend: coverage/frontend/index.html"
    echo "  Combined: coverage/combined/html/index.html"

# Generate Go test coverage report
coverage-go:
    mkdir -p coverage/go
    cd commandline && go test ./... -coverprofile=../coverage/go/coverage.out
    cd commandline && go tool cover -html=../coverage/go/coverage.out -o ../coverage/go/index.html
    cd commandline && ~/go/bin/gcov2lcov -infile=../coverage/go/coverage.out -outfile=../coverage/go/lcov.info
    @echo "Go coverage report: coverage/go/index.html"

# Generate frontend test coverage report
coverage-frontend:
    cd frontend && pnpm vitest run --coverage
    @echo "Frontend coverage report: coverage/frontend/index.html"

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
    rm -rf coverage

# ── Shortcuts ─────────────────────────────────────────────────────

# Full production build from scratch (install + build)
prod: install build
