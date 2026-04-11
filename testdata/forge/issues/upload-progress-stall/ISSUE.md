---
title: Upload Progress Bar Stalls at 99%
status: open
type: bug
assignee: Charlie
labels: [bug, ux]
created: "2026-04-06"
modified: "2026-04-09"
---

## Description

The upload progress bar reaches 99% and then hangs for several seconds before completing. This is confusing for users who think their upload has failed.

## Root Cause

The progress event fires based on bytes sent, not bytes received and processed by the server. The final 1% represents server-side processing time.

## Proposed Fix

Show "Processing..." state after 99% rather than freezing the progress bar.
