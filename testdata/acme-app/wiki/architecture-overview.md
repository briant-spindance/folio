---
title: Architecture Overview
modified: "2026-04-09"
icon: building
order: 2
aliases:
  - system-design
  - arch
---

# Architecture Overview

Acme App follows a microservices architecture deployed on Kubernetes.

## Service Map

```
                    ┌─────────────┐
                    │   CDN /     │
                    │  CloudFront │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  API Gateway │
                    │  (Kong)      │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
   ┌─────▼─────┐   ┌──────▼─────┐   ┌──────▼──────┐
   │  Auth      │   │  Core API  │   │  Billing    │
   │  Service   │   │  Service   │   │  Service    │
   └─────┬─────┘   └──────┬─────┘   └──────┬──────┘
         │                 │                 │
   ┌─────▼─────┐   ┌──────▼─────┐   ┌──────▼──────┐
   │ PostgreSQL │   │ PostgreSQL │   │   Stripe    │
   │ (Users)    │   │ (Data)     │   │   API       │
   └───────────┘   └────────────┘   └─────────────┘
```

## Key Decisions

- **Language:** Go for all backend services
- **Database:** PostgreSQL with pgx driver
- **Cache:** Redis for sessions, rate limiting, and pub/sub
- **Message Queue:** NATS for async inter-service communication
- **Frontend:** React with TypeScript, deployed to CDN
- **Infrastructure:** Kubernetes on AWS EKS
