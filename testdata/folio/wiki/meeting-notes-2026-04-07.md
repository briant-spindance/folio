---
title: "Meeting Notes: Weekly Planning (April 7)"
modified: "2026-04-07"
icon: calendar
order: 7
---

# Meeting Notes: Weekly Planning — April 7, 2026

**Attendees:** Alice, Bob, Carol, Dan  
**Facilitator:** Carol

## Agenda

1. Retro follow-up from [[incident-retro-api-outage]]
2. Wiki feature progress
3. Sprint planning for next week

## Discussion

### Incident Follow-Up

Dan walked through the [[incident-retro-api-outage|API outage retro]]. The two open action items were assigned:

- Integration test for init → serve: **Bob**
- Update [[onboarding-checklist]]: **Alice**

Carol asked whether we need a pre-release smoke test. Consensus was yes — added to the [[deployment-runbook]].

### Wiki Feature

Alice demoed the wiki list page with drag-to-reorder. Bob raised a question about wikilink syntax: should we support `[[slug|display text]]` or just `[[slug]]`? Decision: support both. This aligns with our [[adr-001-markdown-storage|Markdown-first philosophy]].

Dan suggested adding backlinks — when you view a wiki page, you should see which other pages link to it. Everyone agreed. Alice will implement server-side backlink computation.

### Sprint Planning

Items pulled into the sprint:

- Wiki backlinks (Alice)
- Search highlighting in wiki detail view (Bob)
- `folio doctor` directory checks (Dan)
- Onboarding checklist updates (Alice)

## Decisions

- Wikilink syntax: `[[slug]]` and `[[slug|text]]` both supported
- Backlinks computed server-side, not client-side
- Next retro scheduled for April 14

## Action Items

- [ ] Alice: implement backlinks
- [ ] Bob: add init→serve integration test
- [ ] Dan: add directory checks to `folio doctor`
- [x] Carol: post these notes to the wiki (per [[team-agreements]])
