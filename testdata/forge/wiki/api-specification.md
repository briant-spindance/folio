---
title: API Specification 3
modified: "2026-04-12"
icon: plug
order: 3
---

The Forge API is a JSON REST API served at /api by the Go binary. 2 3

## Base URL

```
http://localhost:8080/api
```

## Something else

```
http://localhost:8080/api/2
```

## Authentication

No authentication for local development. Production deployments may add bearer token support.

Some more content here.

## Features

### List Features

```

GET /api/features
```

Returns all features sorted by backlog priority.

```

GET /api/seomthing else
```

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





