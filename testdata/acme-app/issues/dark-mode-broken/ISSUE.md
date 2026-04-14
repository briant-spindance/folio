---
assignees: []
created: "2026-04-11"
modified: "2026-04-11"
points: 2
priority: low
status: open
title: Dark mode colors broken on Safari
type: bug
labels:
  - ui
  - browser-compat
---
The dark mode theme has several contrast issues specific to Safari on macOS:

- Dropdown menus have white text on light gray background
- Modal overlay is fully opaque instead of semi-transparent
- Code blocks lose syntax highlighting colors

Works fine in Chrome and Firefox. Likely a CSS `color-scheme` or `prefers-color-scheme` issue with Safari's rendering.
