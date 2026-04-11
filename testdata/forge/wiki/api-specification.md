---
title: API Specification
modified: "2026-04-09"
icon: plug
---

# API Specification

The Forge API is a JSON REST API served at `/api` by the Go binary.

## Base URL

```
http://localhost:8080/api
```

## Authentication

No authentication for local development. Production deployments may add bearer token support.

## Features

### List Features

```
GET /api/features
```

Returns all features sorted by backlog priority.

**Response**
```json
{
  "features": [
    {
      "slug": "oauth-integration",
      "title": "OAuth Integration",
      "status": "ready",
      "assignee": "Alice",
      "points": 5,
      "sprint": "sprint-3",
      "priority": 2
    }
  ]
}
```

### Get Feature

```
GET /api/features/:slug
```

Returns full feature detail including Markdown body.

## Wiki

### List Documents

```
GET /api/wiki
```

### Get Document

```
GET /api/wiki/:slug
```

## Status

### Dashboard Summary

```
GET /api/status
```

Returns aggregated project health for the dashboard.
