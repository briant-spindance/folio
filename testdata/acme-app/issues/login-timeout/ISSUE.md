---
assignees:
  - Alice
created: "2026-04-10"
modified: "2026-04-12"
points: 3
priority: high
status: open
title: Login timeout too aggressive
type: bug
labels:
  - auth
  - ux
feature: user-authentication
---
Users are being logged out after only 5 minutes of inactivity. The session timeout should be at least 30 minutes for web sessions and 7 days for "remember me" sessions.

## Steps to Reproduce

1. Log in to the app
2. Leave the tab idle for 5 minutes
3. Try to navigate — redirected to login

## Expected Behavior

Session should last at least 30 minutes of inactivity.

## Actual Behavior

Session expires after exactly 5 minutes regardless of the "remember me" checkbox state.
