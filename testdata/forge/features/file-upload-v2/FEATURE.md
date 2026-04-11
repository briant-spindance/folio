---
title: File Upload v2
status: review
assignee: Charlie
points: 3
sprint: sprint-3
priority: 5
created: "2026-03-20"
modified: "2026-04-07"
---

## Summary

Rewrite the file upload system to support multipart streaming, progress tracking, and resumable uploads for large files.

## Acceptance Criteria

- [x] Files up to 100 MB upload without timeout
- [x] Upload progress is displayed in real time
- [ ] Interrupted uploads can be resumed
- [ ] Uploaded files are virus-scanned before storage
