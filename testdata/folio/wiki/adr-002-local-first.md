---
title: "ADR-002: Local-First Architecture"
modified: "2026-03-18"
icon: home
order: 5
aliases:
  - adr-002
  - local-first
---

# ADR-002: Local-First Architecture

**Status:** Accepted  
**Date:** 2026-03-18  
**Deciders:** Alice, Dan, Carol

## Context

After deciding on [[adr-001-markdown-storage|Markdown storage]], we needed to determine whether Folio would be:

1. A **hosted SaaS** with a backend server and database
2. A **local-first tool** that runs entirely on the developer's machine

## Decision

We chose **local-first**.

## Rationale

- **Zero setup**: `go install` and you're running — no accounts, no servers, no config
- **Privacy**: Project data never leaves the developer's machine
- **Speed**: No network latency; everything is a local file read
- **Offline support**: Works on planes, in coffee shops, anywhere
- **Simplicity**: One binary, no Docker, no Postgres, no Redis

## Trade-offs

- **No real-time collaboration**: Two people can't edit the same wiki page simultaneously
- **No centralized dashboard**: Each developer sees their own local state
- **Sync via git**: Teams share state by pushing/pulling — this adds friction but aligns with how developers already work

## Consequences

- The [[deployment-runbook]] is about distributing a binary, not deploying a service
- The [[team-agreements]] need to account for merge conflicts in project files
- We rely on git for history, audit trail, and "backup"
- The [[onboarding-checklist]] is simpler because there's no hosted environment to provision access to

## Dissent

Dan initially argued for a lightweight hosted option to enable a shared dashboard. We decided to revisit this after v1.0 if teams request it. The dissent is noted here per our [[team-agreements|decision-making process]].
