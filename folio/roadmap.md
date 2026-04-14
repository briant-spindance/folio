---
title: Product Roadmap
columns:
  - now
  - next
  - later
rows:
  - label: Backend
    color: '#f0faf4'
  - label: Frontend
    color: '#f0f8ff'
  - label: Infrastructure
    color: '#fff8f0'
  - label: AI & Agent Integration
    color: '#f5f0ff'
cards:
  - id: b2e5f6g7
    title: Sprint management
    notes: Sprint creation, assignment, and tracking via CLI and web UI. Directory scaffolded and sprint field plumbed through data model, but no commands, API, or UI yet.
    column: now
    row: Backend
    order: 0
    featureSlug: null
  - id: b3m4n5o6
    title: Feature kanban board
    notes: Kanban-style board view for features grouped by status columns, complementing the existing list/table view
    column: now
    row: Frontend
    order: 0
    featureSlug: null
  - id: b5s0t1u2
    title: Project docs editing
    notes: Allow creating and editing project docs from the web UI (currently read-only at every layer)
    column: now
    row: Frontend
    order: 1
    featureSlug: null
  - id: d1a2b3c4
    title: Roadmap skill
    notes: Add a folio-roadmap agent skill documenting the roadmap CLI and data format
    column: now
    row: AI & Agent Integration
    order: 0
    featureSlug: null
  - id: b6v3w4x5
    title: Search indexing
    notes: Full-text search index across features, issues, wiki, and project docs
    column: next
    row: Backend
    order: 0
    featureSlug: null
  - id: b7y6z7a8
    title: AI-assisted feature writing
    notes: Use LLMs to help draft feature specs and implementation plans from prompts
    column: next
    row: AI & Agent Integration
    order: 0
    featureSlug: null
  - id: b8c9d0e1
    title: Automated test coverage
    notes: Increase Go and frontend test coverage, add integration tests for CLI commands
    column: next
    row: Infrastructure
    order: 0
    featureSlug: null
  - id: d2e3f4g5
    title: Sprint skill
    notes: Add a folio-sprints agent skill once sprint management is implemented
    column: next
    row: AI & Agent Integration
    order: 1
    featureSlug: null
  - id: b9f2g3h4
    title: AI doctor checks
    notes: Intelligent validation that checks semantic consistency across roadmap, features, and issues
    column: later
    row: AI & Agent Integration
    order: 0
    featureSlug: null
  - id: c1i5j6k7
    title: Disable AI if no keys
    notes: Disable AI button when no API key is configured, with tooltip explaining why
    column: later
    row: AI & Agent Integration
    order: 1
    featureSlug: null
  - id: c2l8m9n0
    title: Keyboard shortcuts
    notes: Keyboard navigation and shortcuts throughout the web UI
    column: later
    row: Frontend
    order: 0
    featureSlug: null
  - id: c3o1p2q3
    title: Themes
    notes: Dark mode and customizable color themes for the web UI
    column: later
    row: Frontend
    order: 1
    featureSlug: null
  - id: c4r4s5t6
    title: Internationalization
    notes: i18n support for the web UI
    column: later
    row: Frontend
    order: 2
    featureSlug: null
  - id: c5u7v8w9
    title: Plugin / extension system
    notes: Allow third-party extensions for custom entity types, views, and integrations
    column: later
    row: Backend
    order: 0
    featureSlug: null
modified: '2026-04-14'
---
