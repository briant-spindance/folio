---
title: API Rate Limiting
status: draft
priority: medium
modified: '2026-04-12'
created: '2026-04-05'
order: 1
assignees:
  - Charlie
  - Bob
  - Dana
points: 2
---

## Summary

Implement per-user and per-IP rate limiting on the API to prevent abuse and ensure fair usage across all tenants.

## Acceptance Criteria

- \[ \] Per-user rate limit: 1000 requests/hour
- \[ \] Per-IP rate limit: 100 requests/minute for unauthenticated requests
- \[ \] Rate limit headers returned on every response (X-RateLimit-\*)
- \[ \] 429 responses include Retry-After header
