---
title: Team Agreements
modified: "2026-04-08"
icon: handshake
order: 2
aliases:
  - working-agreements
  - team-norms
---

# Team Agreements

These are the norms we've agreed to as a team. They're living — we revisit them quarterly.

## Code Review

- Every PR gets at least one review before merge
- Reviewers should respond within **4 business hours**
- Use "Request Changes" sparingly — prefer comments with suggestions
- Approve with nits rather than blocking on style preferences
- See [[adr-001-markdown-storage]] for why we chose file-based storage (this comes up in reviews)

## Communication

- Default to async (Slack threads, wiki pages, PR comments)
- Synchronous meetings are for decisions, not status updates
- Meeting notes go on the wiki within 24 hours (e.g., [[meeting-notes-2026-04-07]])
- If a Slack thread goes past 10 messages, move it to a wiki page

## On-Call

- Rotation is weekly, Monday to Monday
- Acknowledge alerts within **15 minutes** during business hours
- Follow the [[deployment-runbook]] for rollback procedures
- Write a retro for any incident lasting longer than 30 minutes (see [[incident-retro-api-outage]] for the template)

## Decision Making

- Significant technical decisions get an ADR (see [[adr-001-markdown-storage]], [[adr-002-local-first]])
- The person closest to the problem makes the call
- Disagree-and-commit is fine — document the dissent in the ADR

## Work in Progress

- Limit WIP to 2 items per person
- If you're blocked, flag it in standup and pick up something else
- Pairing is encouraged, especially for [[onboarding-checklist|onboarding]] tasks
