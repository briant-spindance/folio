---
title: Login Timeout on Slow Connections
status: open
type: bug
assignee: null
labels: [bug, security]
created: "2026-04-08"
modified: "2026-04-08"
---

## Description

Users on slow connections (< 1 Mbps) experience session timeouts during login before the server responds. The client-side timeout is set to 5 seconds which is too aggressive.

## Steps to Reproduce

1. Throttle network to "Slow 3G" in browser devtools
2. Navigate to `/login`
3. Enter valid credentials and submit
4. Observe timeout error before response arrives

## Expected Behavior

Login should succeed within 30 seconds on slow connections.

## Actual Behavior

Client throws a timeout error after 5 seconds, before the server has responded.
