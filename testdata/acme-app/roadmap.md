---
title: Product Roadmap
columns:
  - now
  - next
  - later
rows:
  - label: Backend
    color: '#e8f5e9'
  - label: Frontend
    color: '#e3f2fd'
  - label: Platform
    color: '#fff3e0'
cards:
  - id: ac001
    title: User Authentication
    notes: 'OAuth2, JWT sessions, RBAC, MFA'
    column: now
    row: Backend
    order: 0
    featureSlug: user-authentication
  - id: ac002
    title: Payment Integration
    notes: 'Stripe subscriptions, invoicing, usage billing'
    column: now
    row: Backend
    order: 1
    featureSlug: payment-integration
  - id: ac003
    title: Dashboard Redesign
    notes: 'New dashboard with widgets and customizable layout'
    column: now
    row: Frontend
    order: 0
    featureSlug: null
  - id: ac004
    title: API Rate Limiting
    notes: 'Per-tier rate limits with Redis sliding window'
    column: now
    row: Platform
    order: 0
    featureSlug: null
  - id: ac005
    title: Mobile App
    notes: 'React Native iOS/Android app'
    column: next
    row: Frontend
    order: 0
    featureSlug: mobile-app
  - id: ac006
    title: Webhook System
    notes: 'Outbound webhooks for third-party integrations'
    column: next
    row: Backend
    order: 0
    featureSlug: null
  - id: ac007
    title: Audit Logging
    notes: 'Full audit trail for compliance and debugging'
    column: next
    row: Platform
    order: 0
    featureSlug: null
  - id: ac008
    title: Multi-tenancy
    notes: 'Workspace isolation for enterprise customers'
    column: later
    row: Platform
    order: 0
    featureSlug: null
  - id: ac009
    title: GraphQL API
    notes: 'GraphQL layer alongside REST for flexible queries'
    column: later
    row: Backend
    order: 0
    featureSlug: null
---
