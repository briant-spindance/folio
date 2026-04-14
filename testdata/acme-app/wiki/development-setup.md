---
title: Development Setup
modified: "2026-04-14"
icon: wrench
order: 3
aliases:
  - dev-setup
  - getting-started
---

# Development Setup

## Prerequisites

- Go 1.22+
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

## Quick Start

```bash
# Clone the repo
git clone git@github.com:acme/acme-app.git
cd acme-app

# Start dependencies
docker compose up -d postgres redis

# Run database migrations
go run ./cmd/migrate up

# Start the API server
go run ./cmd/api

# In another terminal, start the frontend
cd frontend && npm install && npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://localhost:5432/acme` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `STRIPE_SECRET_KEY` | Stripe API key | — |
| `JWT_SECRET` | Secret for signing JWTs | — |
| `OAUTH_GOOGLE_CLIENT_ID` | Google OAuth client ID | — |

## Running Tests

```bash
go test ./...           # Backend tests
cd frontend && npm test # Frontend tests
```
