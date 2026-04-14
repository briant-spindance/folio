---
title: API Reference
modified: "2026-04-12"
icon: book-open
order: 1
aliases:
  - api-docs
  - endpoints
---

# API Reference

Base URL: `https://api.acme-app.com/v1`

## Authentication

All API requests require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <your-api-key>
```

## Endpoints

### Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/me` | Get current user profile |
| PATCH | `/users/me` | Update current user profile |
| GET | `/users/:id` | Get user by ID (admin only) |
| GET | `/users` | List users (admin only) |

### Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects` | List all projects |
| POST | `/projects` | Create a new project |
| GET | `/projects/:id` | Get project details |
| PATCH | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Delete project |

### Billing

| Method | Path | Description |
|--------|------|-------------|
| GET | `/billing/subscription` | Get current subscription |
| POST | `/billing/checkout` | Create checkout session |
| GET | `/billing/invoices` | List invoices |

## Rate Limits

See the `X-RateLimit-*` headers on every response. Limits vary by subscription tier.

## Errors

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [...]
  }
}
```
