---
title: API Rate Limiting
status: draft
assignee: null
points: null
sprint: null
priority: null
created: "2026-04-05"
modified: "2026-04-05"
---

## Summary

Implement per-user and per-IP rate limiting on the API to prevent abuse and ensure fair usage across all tenants.

## Acceptance Criteria

- [ ] Per-user rate limit: 1000 requests/hour
- [ ] Per-IP rate limit: 100 requests/minute for unauthenticated requests
- [ ] Rate limit headers returned on every response (X-RateLimit-*)
- [ ] 429 responses include Retry-After header
