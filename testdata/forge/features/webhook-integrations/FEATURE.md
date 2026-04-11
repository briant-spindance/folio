---
title: Webhook Integrations
status: draft
assignee: null
points: null
sprint: null
priority: 7
created: "2026-04-03"
modified: "2026-04-03"
---

## Summary

Allow users to configure outbound webhooks that fire on forge events: feature status changes, new issues, sprint lifecycle events.

## Acceptance Criteria

- [ ] Users can register webhook endpoints with custom headers
- [ ] Webhooks fire on feature status change
- [ ] Webhooks fire on new issue creation
- [ ] Failed webhook deliveries are retried with exponential backoff
- [ ] Delivery log visible in the UI
