---
title: Design System
modified: "2026-04-10"
---

# Design System

Forge uses a custom design token system built on Tailwind CSS v4 and shadcn/ui components.

## Color Tokens

| Token | Value | Usage |
|---|---|---|
| `--background` | `hsl(0 0% 100%)` | Page background |
| `--surface` | `hsl(220 14% 96%)` | Sidebar, cards |
| `--surface-raised` | `hsl(0 0% 100%)` | Elevated cards |
| `--foreground` | `hsl(220 14% 10%)` | Primary text |
| `--foreground-muted` | `hsl(220 8% 46%)` | Secondary text |
| `--primary` | `hsl(221 83% 53%)` | Interactive elements |

## Workflow State Colors

| State | Color |
|---|---|
| `draft` | Gray |
| `ready` | Cyan |
| `in-progress` | Amber |
| `review` | Purple |
| `done` | Green |

## Typography

- **UI font:** Inter
- **Code font:** JetBrains Mono
- **Base size:** 14px (0.875rem)

## Component Patterns

All components follow shadcn/ui conventions with `data-slot` attributes for Tailwind v4 targeting.
