---
title: Roadmap
description: Visualize and organize work with a kanban-style roadmap board.
order: 7
icon: kanban
---

# Roadmap

The roadmap is a kanban-style board for visualizing and organizing work at a high level. It provides a strategic view of what's happening now, what's coming next, and what's planned for later.

## How the Roadmap Works

The roadmap is defined in a single file, `folio/roadmap.md`, using YAML frontmatter. It consists of three main concepts:

- **Columns** -- Horizontal lanes representing time horizons or phases (e.g., Now, Next, Later)
- **Rows** -- Optional swim lanes for grouping cards by category (e.g., Platform, Frontend, Backend)
- **Cards** -- Individual items on the board, optionally linked to features

## Roadmap Configuration

The roadmap is configured in `folio/roadmap.md`:

```yaml
---
title: Roadmap
columns: [now, next, later]
rows:
  - label: Platform
    color: blue
  - label: Frontend
    color: green
  - label: Backend
    color: purple
cards:
  - id: card-1
    title: "Build authentication"
    column: now
    row: Platform
    feature_slug: auth-feature
  - id: card-2
    title: "Design dashboard"
    column: next
    row: Frontend
---
```

### Columns

Columns define the horizontal lanes of the board. The default columns are `now`, `next`, and `later`, but you can customize them to match your planning process.

### Rows

Rows are optional swim lanes that group cards vertically. Each row has a `label` and an optional `color`. If no rows are defined, all cards appear in a single lane.

### Cards

Cards are the items on the board. Each card has:

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier for the card |
| `title` | Yes | Display text on the card |
| `column` | Yes | Which column the card belongs to (must match a defined column) |
| `row` | No | Which row the card belongs to (must match a defined row label) |
| `feature_slug` | No | Link to a feature by slug. Keeps the roadmap connected to the backlog. |

## Using the Roadmap

### In the Web UI

Navigate to **Roadmap** in the sidebar to see the board. You can:

- View cards organized by column and row
- See which cards are linked to features
- Drag cards between columns to reprioritize

### Linking Cards to Features

When a card has a `feature_slug`, the roadmap stays connected to your feature backlog. This means:

- The card displays the linked feature's current status
- Clicking the card navigates to the feature detail view
- `folio doctor` validates that the referenced feature exists

## Validation

`folio doctor` validates the roadmap:

- Cards must reference valid columns (defined in the `columns` list)
- Cards must reference valid rows (defined in the `rows` list)
- `feature_slug` references must point to existing features
