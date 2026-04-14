---
assignees:
  - Charlie
created: "2026-04-13"
modified: "2026-04-13"
points: 5
priority: medium
status: in-progress
title: Implement API rate limiting
type: task
labels:
  - api
  - security
---
We need to implement rate limiting on the public API to prevent abuse and ensure fair usage across customers.

## Requirements

- Per-customer rate limits based on their subscription tier
- Free tier: 100 requests/minute
- Pro tier: 1000 requests/minute
- Enterprise tier: 10,000 requests/minute
- Return proper `429 Too Many Requests` with `Retry-After` header
- Rate limit headers on every response (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)
- Use Redis-based sliding window counter

## Progress

- [x] Redis sliding window implementation
- [x] Middleware integration
- [ ] Per-tier configuration from billing data
- [ ] Dashboard widget showing usage
