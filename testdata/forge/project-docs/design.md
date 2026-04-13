---
title: Design System & Frontend Architecture
order: 4
---

# Forge — Design System & Frontend Architecture

## Overview

This document defines the visual design system, component architecture, and frontend technology stack for the Forge web UI. It serves as the reference for the demo build and carries forward into the production version.

Forge's UI is a project management tool used by mixed teams — product owners, designers, engineers, and AI agents. The design must feel **professional and calm**, not flashy. It should get out of the way and let the content (markdown, metadata, boards) be the focus.

---

## Design Principles

- **Content over chrome.** Minimize decorative elements. Let markdown content, metadata, and board states be the visual focus.
- **Clarity over density.** Prefer generous spacing and clear type hierarchy over cramming information into every pixel. Users scan more than they read.
- **Consistency over novelty.** Use the same patterns everywhere. A list is always a list. A card is always a card. A badge is always a badge.
- **Accessible by default.** Meet WCAG 2.1 AA contrast ratios in both light and dark modes. All interactive elements must be keyboard-navigable.

---

## Technology Stack

### Framework

| Layer          | Technology                | Notes                                    |
|----------------|---------------------------|------------------------------------------|
| Framework      | React 19 + Vite           | Fast dev server, optimized production builds. |
| Routing        | React Router v7           | File-based or config-based routing.      |
| State          | Zustand or React Context  | Lightweight; no Redux-level complexity needed. |
| Data fetching  | TanStack Query (React Query) | Caching, refetching, optimistic updates. |
| AI Chat        | Vercel AI SDK (`ai` package) | First-class React hooks for streaming chat. |
| Styling        | Tailwind CSS v4           | Utility-first, design token integration. |
| Components     | shadcn/ui                 | Copy-paste Radix UI primitives with Tailwind styling. |
| Markdown       | `react-markdown` + `remark-gfm` + `rehype-highlight` | GFM tables, task lists, syntax highlighting. |
| Code editor    | CodeMirror 6              | Markdown editing with syntax highlighting. |
| Drag & drop    | `@dnd-kit/core`           | Backlog reordering, sprint board, planning view. |
| Icons          | Lucide React              | Consistent, clean icon set. Ships with shadcn/ui. |

### Build & Tooling

| Tool           | Purpose                                   |
|----------------|-------------------------------------------|
| Vite           | Dev server, HMR, production bundling.     |
| TypeScript     | Strict mode enabled.                      |
| ESLint         | Code quality.                             |
| Prettier       | Code formatting.                          |
| Vitest         | Unit testing (Vite-native).               |

### Production Embedding

For the demo, the frontend runs standalone via `vite dev`. In production, the built output (`dist/`) is embedded into the Go binary via `go:embed` and served by the Go HTTP server. The design system and component architecture are the same in both modes.

---

## Typography

### Font Families

| Role         | Font            | Weight Range | Source                | Fallback Stack                       |
|--------------|-----------------|--------------|-----------------------|--------------------------------------|
| UI / Body    | Inter           | 400–700      | Google Fonts or local | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` |
| Code / Mono  | JetBrains Mono  | 400–700      | Google Fonts or local | `"SF Mono", "Cascadia Code", "Fira Code", Consolas, monospace` |

Inter is used for all interface text — navigation, labels, body copy, form fields. JetBrains Mono is used for code blocks, inline code, the markdown editor, file paths, and slugs.

### Type Scale

Based on a 1.25 modular scale with a 14px base. All sizes use `rem` units.

| Token         | Size    | rem      | Weight | Line Height | Usage                              |
|---------------|---------|----------|--------|-------------|------------------------------------|
| `text-xs`     | 11px    | 0.6875   | 400    | 1.45        | Timestamps, helper text, badges    |
| `text-sm`     | 12px    | 0.75     | 400    | 1.5         | Secondary labels, table cells      |
| `text-base`   | 14px    | 0.875    | 400    | 1.6         | Body text, form inputs, nav items  |
| `text-lg`     | 16px    | 1.0      | 500    | 1.5         | Section labels, card titles        |
| `text-xl`     | 20px    | 1.25     | 600    | 1.4         | Page headings                      |
| `text-2xl`    | 25px    | 1.5625   | 700    | 1.3         | Dashboard hero, sprint name        |
| `text-3xl`    | 31px    | 1.9375   | 700    | 1.2         | Landing / empty state headings     |

### Rendered Markdown

Markdown content (feature descriptions, wiki pages, issue bodies) uses a slightly different scale optimized for readability:

| Element    | Size   | Weight | Line Height |
|------------|--------|--------|-------------|
| Body       | 15px   | 400    | 1.7         |
| H1         | 28px   | 700    | 1.3         |
| H2         | 22px   | 600    | 1.35        |
| H3         | 18px   | 600    | 1.4         |
| H4         | 15px   | 600    | 1.5         |
| Code (inline) | 13px | 400   | inherit     |
| Code (block)  | 13px | 400   | 1.6         |

---

## Color System

The color system supports **light and dark modes** with light as the default. Colors are defined as CSS custom properties (design tokens) and consumed via Tailwind.

### Semantic Tokens

These tokens map to purpose, not to specific hues. The actual HSL values change between light and dark mode.

#### Surfaces

| Token                  | Light Mode              | Dark Mode                | Usage                            |
|------------------------|-------------------------|--------------------------|----------------------------------|
| `--background`         | `0 0% 100%`            | `240 10% 4%`            | Page background                  |
| `--surface`            | `220 14% 96%`          | `240 6% 10%`            | Cards, panels, sidebar           |
| `--surface-raised`     | `0 0% 100%`            | `240 5% 13%`            | Elevated cards, dropdowns        |
| `--surface-overlay`    | `0 0% 100%`            | `240 4% 16%`            | Modals, popovers                 |
| `--surface-inset`      | `220 14% 93%`          | `240 6% 7%`             | Input fields, code blocks        |

#### Borders

| Token                  | Light Mode              | Dark Mode                | Usage                            |
|------------------------|-------------------------|--------------------------|----------------------------------|
| `--border`             | `220 13% 91%`          | `240 4% 16%`            | Default borders                  |
| `--border-strong`      | `220 9% 80%`           | `240 4% 22%`            | Focused inputs, dividers         |

#### Text

| Token                  | Light Mode              | Dark Mode                | Usage                            |
|------------------------|-------------------------|--------------------------|----------------------------------|
| `--foreground`         | `220 14% 10%`          | `0 0% 95%`              | Primary text                     |
| `--foreground-muted`   | `220 8% 46%`           | `220 7% 55%`            | Secondary text, placeholders     |
| `--foreground-subtle`  | `220 8% 65%`           | `220 7% 38%`            | Disabled text, timestamps        |

#### Interactive

| Token                  | Light Mode              | Dark Mode                | Usage                            |
|------------------------|-------------------------|--------------------------|----------------------------------|
| `--primary`            | `221 83% 53%`          | `217 91% 60%`           | Primary buttons, links, active nav |
| `--primary-foreground` | `0 0% 100%`            | `0 0% 100%`             | Text on primary backgrounds      |
| `--primary-hover`      | `221 83% 47%`          | `217 91% 55%`           | Primary hover state              |
| `--accent`             | `220 14% 96%`          | `240 5% 15%`            | Hover backgrounds, selected rows |
| `--accent-foreground`  | `220 14% 10%`          | `0 0% 95%`              | Text on accent backgrounds       |

#### Status Colors

Used for workflow badges, health checks, and alerts.

| Token                  | Light Mode              | Dark Mode                | Usage                            |
|------------------------|-------------------------|--------------------------|----------------------------------|
| `--status-success`     | `142 71% 45%`          | `142 71% 45%`           | Done, passed, healthy            |
| `--status-warning`     | `38 92% 50%`           | `38 92% 50%`            | Warnings, attention needed       |
| `--status-error`       | `0 84% 60%`            | `0 84% 60%`             | Failed, errors, destructive      |
| `--status-info`        | `199 89% 48%`          | `199 89% 48%`           | Informational, in-progress       |

#### Workflow State Colors

Each workflow state gets a distinct color for badges and board columns. These are customizable via `forge.yaml` in the future but have sensible defaults.

| State          | Color Token              | Light Value (HSL)        | Visual                    |
|----------------|--------------------------|--------------------------|---------------------------|
| `draft`        | `--state-draft`          | `220 8% 65%`            | Gray                     |
| `ready`        | `--state-ready`          | `199 89% 48%`           | Blue                     |
| `in-progress`  | `--state-in-progress`    | `38 92% 50%`            | Amber                    |
| `review`       | `--state-review`         | `271 76% 53%`           | Purple                   |
| `done`         | `--state-done`           | `142 71% 45%`           | Green                    |

Badges use the state color as background (at 15% opacity in light mode, 20% in dark mode) with the state color as text, ensuring readability in both themes.

---

## Spacing & Layout

### Spacing Scale

Based on a 4px grid:

| Token  | Value | Usage                                              |
|--------|-------|----------------------------------------------------|
| `0.5`  | 2px   | Tight internal spacing (badge padding)             |
| `1`    | 4px   | Compact gaps                                       |
| `1.5`  | 6px   | Icon-to-text gap                                   |
| `2`    | 8px   | Input padding, small card padding                  |
| `3`    | 12px  | Between related elements                           |
| `4`    | 16px  | Card padding, section gaps                         |
| `5`    | 20px  | Between sections                                   |
| `6`    | 24px  | Page padding, major section gaps                   |
| `8`    | 32px  | Between page-level sections                        |
| `10`   | 40px  | Top-of-page breathing room                         |
| `12`   | 48px  | Major layout gaps                                  |
| `16`   | 64px  | Page-level vertical spacing                        |

### Layout Dimensions

| Element              | Value        | Notes                                    |
|----------------------|--------------|------------------------------------------|
| Sidebar width        | 240px        | Collapsed: 0px (hidden). No icon-only mode. |
| Content max-width    | 1200px       | Centered within content area.            |
| Content padding      | 24px (6)     | All sides.                               |
| Card border-radius   | 8px          |                                          |
| Input border-radius  | 6px          |                                          |
| Button border-radius | 6px          |                                          |
| Badge border-radius  | 9999px       | Fully rounded (pill shape).              |
| Chat panel width     | 400px        | Full-width below 768px.                  |
| Sprint board min-col | 280px        | Columns scroll horizontally if needed.   |

### Breakpoints

| Name   | Value    | Behavior                                          |
|--------|----------|---------------------------------------------------|
| `sm`   | 640px    | Chat panel goes full-width.                       |
| `md`   | 768px    | Sidebar collapses to hamburger menu.              |
| `lg`   | 1024px   | Default layout: sidebar + content.                |
| `xl`   | 1280px   | Content area maxes out; centered with margin.     |

---

## Component Patterns

All components are built from shadcn/ui primitives. Below are the Forge-specific patterns and how they compose the primitives.

### Badges

Used for workflow states, issue labels, sprint status, and health check results.

| Variant       | Background             | Text Color             | Border      |
|---------------|------------------------|------------------------|-------------|
| State badge   | State color @ 15%/20%  | State color            | None        |
| Label badge   | `--surface`            | `--foreground`         | `--border`  |
| Count badge   | `--primary`            | `--primary-foreground` | None        |

Badges use `text-xs` (11px), `font-medium`, padding `2px 8px`, fully rounded.

### Cards

Used for dashboard sections, sprint list items, board cards, and review summaries.

```
┌─────────────────────────────────────────┐
│  Card Title                    Action ↗ │
│                                         │
│  Card content — text, metadata,         │
│  or nested components.                  │
│                                         │
│  Footer: timestamps, links, badges      │
└─────────────────────────────────────────┘
```

- Background: `--surface-raised`
- Border: 1px `--border`
- Border-radius: 8px
- Padding: 16px
- Hover (when clickable): border transitions to `--border-strong`, subtle shadow

### Tables

Used for feature lists, issue lists, document lists, sprint items.

- Header row: `text-sm`, `font-medium`, `--foreground-muted`, uppercase tracking
- Body rows: `text-base`, `--foreground`
- Row hover: `--accent` background
- Row borders: 1px `--border` bottom
- Cell padding: 8px vertical, 12px horizontal
- No outer border — tables float within the content area

### Sidebar

```
┌──────────────────┐
│  ⚒ Forge          │
│  project-name     │
│  ⎇ main (dirty)  │
│                   │
│  ● Dashboard      │
│  ○ Wiki            │
│  ○ Features       │
│  ○ Sprints        │
│  ○ Issues         │
│  ○ Reviews        │
│  ○ Configuration  │
│                   │
│                   │
│                   │
│  ⚙ Settings       │
└──────────────────┘
```

- Background: `--surface`
- Active nav item: `--primary` text, `--accent` background with left border accent (3px `--primary`)
- Inactive nav item: `--foreground-muted` text
- Hover: `--accent` background
- VCS indicator: `text-xs`, `--foreground-subtle`, branch icon from Lucide

### Sprint Board

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Sprint 3 — Ship OAuth and fix upload bugs          [Complete Sprint]  │
│  Apr 14 – Apr 25 (4 days remaining)     ████████░░░░░░░  21/40 pts    │
├──────────┬──────────┬──────────┬──────────┬──────────┤                  │
│  Draft   │  Ready   │ In Prog  │  Review  │   Done   │                  │
│  (0)     │  (1)     │  (2)     │  (1)     │  (0)     │                  │
│          │ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │          │                  │
│          │ │Paymnt│ │ │OAuth │ │ │User  │ │          │                  │
│          │ │—,8pts│ │ │Bob,5 │ │ │Auth  │ │          │                  │
│          │ └──────┘ │ ├──────┤ │ │Ali,8 │ │          │                  │
│          │          │ │Login │ │ └──────┘ │          │                  │
│          │          │ │Timout│ │          │          │                  │
│          │          │ └──────┘ │          │          │                  │
└──────────┴──────────┴──────────┴──────────┴──────────┘                  │
```

- Column backgrounds: transparent (no fill — cards provide visual weight)
- Column headers: `text-sm`, `--foreground-muted`, with count badge
- Column dividers: 1px `--border`
- Board cards: Same as standard cards but compact (12px padding, `text-sm`)
- Feature cards: left border accent in state color (3px)
- Issue cards: left border accent dashed in state color (3px) to visually distinguish from features
- Drag ghost: 50% opacity, slight rotation (2deg)
- Drop target: dashed border `--primary` on the column

### Markdown Editor (Split Pane)

```
┌─────────────────────────────────┬─────────────────────────────────┐
│  ▊ B I 🔗 H1 H2 • — <> 📎    │  Preview                        │
├─────────────────────────────────┤                                 │
│  1 │ ## Summary                 │  Summary                        │
│  2 │                            │  ───────                        │
│  3 │ Integrate OAuth 2.0 for    │  Integrate OAuth 2.0 for        │
│  4 │ third-party login.         │  third-party login.             │
│  5 │                            │                                 │
│  6 │ ## Acceptance Criteria     │  Acceptance Criteria            │
│  7 │                            │  ───────────────────            │
│  8 │ - Users can log in via     │  • Users can log in via         │
│  9 │   Google and GitHub        │    Google and GitHub             │
│ 10 │                            │                                 │
├─────────────────────────────────┴─────────────────────────────────┤
│                                              Cancel    Save       │
└───────────────────────────────────────────────────────────────────┘
```

- Editor pane background: `--surface-inset`
- Editor font: JetBrains Mono, 13px, line height 1.6
- Line numbers: `--foreground-subtle`, right-aligned, 40px gutter
- Toolbar: `--surface`, bottom border `--border`, icon buttons 28px square
- Preview pane background: `--background`
- Divider: 1px `--border`, draggable to resize panes (50/50 default split)

### Wikilinks

Wiki pages use `[[wikilinks]]` to reference other pages. These are rendered differently depending on whether the target page exists.

#### Existing Page Link

- Text color: `--primary`
- Underline: solid 1px `--primary` (at 40% opacity)
- Hover: underline opacity increases to 100%, background `--primary` at 5%
- Cursor: pointer
- The link text is the target page's title (or custom display text for `[[slug|text]]`)

#### Broken / Stub Link (target page does not exist)

- Text color: `--status-error`
- Underline: dashed 1px `--status-error` (at 50% opacity)
- Hover: underline opacity increases to 100%, background `--status-error` at 5%
- Cursor: pointer
- A small `Plus` icon (12px, `--status-error`) appears to the right of the link text on hover, indicating "create this page"
- Tooltip on hover: "Create page: {slug}"

#### Backlinks Section

Displayed at the bottom of wiki page detail views, below the rendered markdown content.

```
──────────────────────────────────────────

Linked from

  ┌─────────────────────────────────┐
  │  Project Brief                  │
  │  Roadmap                        │
  │  OAuth Integration Notes        │
  └─────────────────────────────────┘
```

- **Divider:** 1px `--border`, full width, with `24px` vertical spacing above
- **Heading:** "Linked from" in `text-sm`, `font-medium`, `--foreground-muted`, uppercase tracking (same style as table headers)
- **List items:** Each backlink is a row with:
  - Page title as a link (styled with `--primary`, navigates to the page detail view)
  - `text-base` font size
  - `8px` vertical padding between items
- **Container:** `--surface` background, `--border` border, 8px border-radius, 12px padding
- **Empty state:** Section is hidden entirely when no backlinks exist

#### Alias Badges

Displayed below the page title on wiki detail views when the page has aliases.

- Use the same styling as label badges: `--surface` background, `--foreground` text, `--border` border
- Prefix text: "Also known as:" in `text-xs`, `--foreground-muted`
- Each alias is rendered in `text-xs`, `font-mono` (JetBrains Mono), inside a pill badge

### Chat Panel

```
                                          ┌───────────────────────┐
                                          │ Chat  Claude Sonnet ▾ │
                                          │              ✕  🗑    │
                                          ├───────────────────────┤
                                          │                       │
                                          │  Tell me about the    │
                                          │  OAuth feature     ⤶  │
                                          │                       │
                                          │  The OAuth Integration│
                                          │  feature is currently │
                                          │  in-progress...       │
                                          │                       │
                                          │  ```yaml              │
                                          │  status: in-progress  │
                                          │  assignee: Bob        │
                                          │  ```                  │
                                          │                       │
                                          ├───────────────────────┤
                                          │  Ask about your       │
                                          │  project...     Send  │
                                          └───────────────────────┘
```

- Panel background: `--surface`
- Panel border-left: 1px `--border`
- User message bubble: `--primary` @ 10%, `--foreground` text, right-aligned
- Assistant message bubble: `--surface-raised`, left-aligned, markdown rendered
- Input area: `--surface-inset` background, `--border` top border
- Streaming indicator: three animated dots using `--foreground-muted`
- Toggle button (collapsed): 48px circle, `--primary` background, chat icon, fixed bottom-right with 24px margin

---

## Screen Inventory

All screens from the UI spec, with their primary components and layout patterns.

### Dashboard (`/`)

| Section                  | Components Used                              |
|--------------------------|----------------------------------------------|
| Project Summary          | Card, text, count badges                     |
| Backlog Snapshot         | Card, ordered list, status badges, links     |
| Feature Status Dist.     | Card, horizontal bar chart or badge groups   |
| Active Sprint            | Card (large), progress bar, status badges    |
| Recent Issues            | Card, compact table                          |
| Forge Health             | Card, pass/warn/fail badges                  |
| VCS Status               | Card, text, commit hash mono                 |

Layout: 2-column grid on `lg+`, single column below. Cards stack vertically.

### Wiki (`/wiki`)

| View                     | Components Used                              |
|--------------------------|----------------------------------------------|
| List                     | Table (title, aliases, modified), sort controls, "New Page" button |
| Detail                   | Rendered markdown with wikilinks, backlinks section, alias badges, header actions |
| Create / Edit            | Title input, alias tag input, split-pane editor with wikilink preview, save/cancel |

Layout: Single column, content max-width.

### Features (`/features`)

| View                     | Components Used                              |
|--------------------------|----------------------------------------------|
| List                     | Table, filter chips, sort dropdown, bulk actions |
| Detail                   | Rendered markdown + metadata sidebar (2-col) |
| Create / Edit            | Form fields + split-pane editor              |
| Backlog                  | Drag-and-drop ordered list, cards            |

Layout: List is single column. Detail is 2-column (content 65% + sidebar 35%).

### Sprints (`/sprints`)

| View                     | Components Used                              |
|--------------------------|----------------------------------------------|
| List                     | Active sprint card + table of others         |
| Board                    | Kanban columns, drag-and-drop cards, header  |
| Planning                 | Two-panel drag-and-drop, running totals      |
| Create / Edit            | Form fields + markdown editor                |

Layout: Board is full-width horizontal scroll. Planning is 50/50 split.

### Issues (`/issues`)

| View                     | Components Used                              |
|--------------------------|----------------------------------------------|
| List                     | Table, filter chips, sort dropdown           |
| Detail                   | Rendered markdown + metadata sidebar (2-col) |
| Create / Edit            | Form fields + split-pane editor              |

Layout: Same as Features.

### Reviews (`/reviews`)

| View                     | Components Used                              |
|--------------------------|----------------------------------------------|
| List                     | Review type cards + health check section     |
| Detail                   | Rendered markdown with interactive checklists|
| Health Results           | Results table with status icons              |

Layout: Single column, content max-width.

### Configuration (`/config`)

| View                     | Components Used                              |
|--------------------------|----------------------------------------------|
| Structured editor        | Form sections, drag-to-reorder lists         |
| Raw editor               | CodeMirror YAML editor                       |

Layout: Single column, tabbed (Structured / Raw).

---

## Interaction & Motion

### Transitions

Keep motion minimal and functional. Animations serve to orient the user, not to decorate.

| Interaction            | Animation                                    | Duration    |
|------------------------|----------------------------------------------|-------------|
| Page navigation        | Content area fade-in                         | 150ms       |
| Sidebar hover/active   | Background color transition                  | 100ms       |
| Modal open             | Fade-in + scale from 95% to 100%            | 200ms ease-out |
| Modal close            | Fade-out + scale to 95%                     | 150ms ease-in  |
| Chat panel open        | Slide in from right                          | 200ms ease-out |
| Chat panel close       | Slide out to right                           | 150ms ease-in  |
| Toast notification     | Slide in from top-right, fade out after 5s   | 200ms / 300ms  |
| Dropdown open          | Fade-in + slide down 4px                    | 150ms ease-out |
| Drag ghost             | Opacity 50%, 2deg rotation                   | Immediate   |
| Drop target highlight  | Border transition to dashed `--primary`      | 100ms       |
| Skeleton loader        | Shimmer gradient animation                   | 1.5s loop   |
| Button hover           | Background color transition                  | 100ms       |
| Badge appear           | Fade-in + scale from 90%                    | 100ms       |

### Reduced Motion

Respect `prefers-reduced-motion: reduce`. When enabled:
- Replace all animations with instant state changes (0ms duration).
- Skeleton loaders use a static gray block instead of shimmer.
- Drag-and-drop uses a static ghost (no rotation).

---

## Iconography

Use **Lucide React** exclusively. Lucide ships with shadcn/ui and provides a consistent, clean icon set at 24px default.

### Key Icon Mappings

| Concept          | Icon              | Notes                                    |
|------------------|-------------------|------------------------------------------|
| Dashboard        | `LayoutDashboard` |                                          |
| Project Docs     | `FileText`        | Used for non-wiki documents           |
| Wiki             | `BookOpen`        | Wiki pages and knowledge base         |
| Features         | `Puzzle`          |                                          |
| Sprints          | `Timer`           |                                          |
| Issues           | `CircleDot`       |                                          |
| Reviews          | `ClipboardCheck`  |                                          |
| Configuration    | `Settings`        |                                          |
| Chat             | `MessageCircle`   |                                          |
| Git branch       | `GitBranch`       |                                          |
| Add / Create     | `Plus`            |                                          |
| Edit             | `Pencil`          |                                          |
| Delete           | `Trash2`          |                                          |
| Search           | `Search`          |                                          |
| Close            | `X`               |                                          |
| Drag handle      | `GripVertical`    |                                          |
| Promote (up)     | `ChevronUp`       |                                          |
| Demote (down)    | `ChevronDown`     |                                          |
| Status: pass     | `CheckCircle2`    | `--status-success`                       |
| Status: warning  | `AlertTriangle`   | `--status-warning`                       |
| Status: fail     | `XCircle`         | `--status-error`                         |
| External link    | `ExternalLink`    |                                          |
| Upload           | `Upload`          |                                          |
| Copy             | `Copy`            |                                          |

Icon sizes: 16px in compact contexts (badges, inline), 20px in buttons and nav, 24px in headers and empty states.

---

## Dark Mode Implementation

Theme is toggled via a button in the sidebar footer (sun/moon icon). The user's preference is stored in `localStorage` and defaults to **light mode**. The system also respects `prefers-color-scheme` on first visit if no stored preference exists.

### Mechanism

- A `data-theme="light"` or `data-theme="dark"` attribute is set on `<html>`.
- CSS custom properties (the semantic tokens above) are defined in `:root[data-theme="light"]` and `:root[data-theme="dark"]` blocks.
- Tailwind's `darkMode: 'selector'` strategy is configured to use `[data-theme="dark"]`.
- Components never reference raw color values — always use semantic tokens via Tailwind utilities (e.g., `bg-background`, `text-foreground`, `border-border`).

### Contrast Requirements

All text/background combinations must meet **WCAG 2.1 AA** (4.5:1 for normal text, 3:1 for large text):

| Combination                           | Light Ratio | Dark Ratio |
|---------------------------------------|-------------|------------|
| `--foreground` on `--background`      | 15.4:1      | 14.8:1     |
| `--foreground-muted` on `--background`| 5.2:1       | 4.8:1      |
| `--primary` on `--background`         | 4.6:1       | 5.1:1      |
| `--primary-foreground` on `--primary` | 7.2:1       | 6.8:1      |

---

## File Structure (Demo)

```
forge-ui/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx                    # App entry point
│   ├── app.tsx                     # Root component, router setup
│   ├── globals.css                 # Tailwind imports, CSS custom properties
│   ├── lib/
│   │   ├── utils.ts                # cn() helper, shared utilities
│   │   └── api.ts                  # API client for forge serve backend
│   ├── hooks/
│   │   ├── use-theme.ts            # Dark/light mode toggle
│   │   └── use-chat.ts             # Vercel AI SDK chat hook wrapper
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitives (button, card, badge, etc.)
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── breadcrumbs.tsx
│   │   │   └── chat-panel.tsx
│   │   ├── markdown/
│   │   │   ├── renderer.tsx        # Markdown rendering component
│   │   │   └── editor.tsx          # Split-pane markdown editor
│   │   ├── board/
│   │   │   ├── board.tsx           # Kanban board container
│   │   │   ├── column.tsx          # Board column
│   │   │   └── card.tsx            # Board card (feature/issue)
│   │   └── shared/
│   │       ├── status-badge.tsx    # Workflow state badge
│   │       ├── metadata-sidebar.tsx
│   │       ├── empty-state.tsx
│   │       ├── confirm-dialog.tsx
│   │       └── progress-bar.tsx
│   ├── pages/
│   │   ├── dashboard.tsx
│   │   ├── docs/
│   │   │   ├── list.tsx
│   │   │   ├── detail.tsx
│   │   │   └── editor.tsx
│   │   ├── features/
│   │   │   ├── list.tsx
│   │   │   ├── detail.tsx
│   │   │   ├── editor.tsx
│   │   │   └── backlog.tsx
│   │   ├── sprints/
│   │   │   ├── list.tsx
│   │   │   ├── board.tsx
│   │   │   ├── planning.tsx
│   │   │   └── editor.tsx
│   │   ├── issues/
│   │   │   ├── list.tsx
│   │   │   ├── detail.tsx
│   │   │   └── editor.tsx
│   │   ├── reviews/
│   │   │   ├── list.tsx
│   │   │   ├── detail.tsx
│   │   │   └── health.tsx
│   │   └── config.tsx
│   └── types/
│       └── index.ts                # TypeScript types for features, issues, sprints, etc.
└── .env.local                      # LLM API keys (git-ignored)
```

---

## Demo Scope

The demo is a **standalone Vite app** with mock data (no Go backend). It validates the design system, layout, and interaction patterns before building the production version.

### What the demo includes

- Full layout: sidebar, header, breadcrumbs, chat panel toggle
- All pages rendered with static/mock data
- Dark/light mode toggle with persisted preference
- Functional drag-and-drop on sprint board and backlog
- Functional markdown editor with live preview
- Chat panel UI (streaming simulation with mock responses)
- Responsive behavior at all breakpoints

### What the demo defers

- Real API calls to a Go backend
- Filesystem reads/writes
- VCS integration (shown with mock data)
- Vercel AI SDK integration (chat is simulated)
- Authentication or multi-user features
