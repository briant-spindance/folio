# API Rate Limiting Design Notes

## Overview

This document outlines the rate limiting strategy for the API.

## Strategy

We will implement a **token bucket** algorithm with the following defaults:

- **Window**: 60 seconds
- **Max requests**: 100 per window (authenticated), 20 per window (unauthenticated)
- **Burst allowance**: 10 extra requests

## Headers

Rate limit info is returned in response headers:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests per window |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |

## Error Response

When rate limited, the API returns:

```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please retry after 42 seconds.",
  "retry_after": 42
}
```

## Redis Schema

```
rate_limit:{user_id}:{window_start} -> count (TTL: window_size)
```
