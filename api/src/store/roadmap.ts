import { existsSync, readFileSync, writeFileSync } from "node:fs"
import matter from "gray-matter"
import { paths } from "../lib/paths.js"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoadmapCard {
  id: string
  title: string
  notes: string
  column: string
  row: string
  order: number
}

export interface RoadmapRow {
  label: string
  color: string | null
}

export interface Roadmap {
  title: string
  columns: string[]
  rows: RoadmapRow[]
  cards: RoadmapCard[]
  modified: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a short random id (8 hex chars). */
function generateId(): string {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

const DEFAULT_COLUMNS = ["now", "next", "later"]

function buildRoadmap(data: Record<string, unknown>): Roadmap {
  const columns = Array.isArray(data.columns)
    ? data.columns.map(String)
    : DEFAULT_COLUMNS

  const rows: RoadmapRow[] = Array.isArray(data.rows)
    ? data.rows.map((r: unknown) => {
        if (typeof r === "object" && r !== null && "label" in r) {
          const obj = r as Record<string, unknown>
          return {
            label: String(obj.label),
            color: obj.color ? String(obj.color) : null,
          }
        }
        return { label: String(r), color: null }
      })
    : []

  const cards: RoadmapCard[] = Array.isArray(data.cards)
    ? data.cards.map((c: unknown) => {
        const card = c as Record<string, unknown>
        return {
          id: String(card.id ?? generateId()),
          title: String(card.title ?? ""),
          notes: String(card.notes ?? ""),
          column: String(card.column ?? columns[0] ?? "now"),
          row: String(card.row ?? ""),
          order: typeof card.order === "number" ? card.order : 0,
        }
      })
    : []

  return {
    title: String(data.title ?? "Roadmap"),
    columns,
    rows,
    cards,
    modified: data.modified ? String(data.modified) : null,
  }
}

function serializeRoadmap(roadmap: Roadmap): string {
  const today = new Date().toISOString().slice(0, 10)
  const frontmatter: Record<string, unknown> = {
    title: roadmap.title,
    columns: roadmap.columns,
    rows: roadmap.rows,
    cards: roadmap.cards,
    modified: today,
  }
  return matter.stringify("", frontmatter)
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function getRoadmap(): Roadmap {
  if (!existsSync(paths.roadmap)) {
    return {
      title: "Roadmap",
      columns: DEFAULT_COLUMNS,
      rows: [],
      cards: [],
      modified: null,
    }
  }

  const raw = readFileSync(paths.roadmap, "utf-8")
  const { data } = matter(raw)
  return buildRoadmap(data)
}

export function saveRoadmap(roadmap: Roadmap): Roadmap {
  const today = new Date().toISOString().slice(0, 10)
  const updated = { ...roadmap, modified: today }
  writeFileSync(paths.roadmap, serializeRoadmap(updated), "utf-8")
  return updated
}

// ---------------------------------------------------------------------------
// Card operations
// ---------------------------------------------------------------------------

export function addCard(input: Omit<RoadmapCard, "id">): RoadmapCard {
  const roadmap = getRoadmap()
  const card: RoadmapCard = { ...input, id: generateId() }
  roadmap.cards.push(card)
  saveRoadmap(roadmap)
  return card
}

export function updateCard(id: string, updates: Partial<Omit<RoadmapCard, "id">>): RoadmapCard | null {
  const roadmap = getRoadmap()
  const idx = roadmap.cards.findIndex((c) => c.id === id)
  if (idx === -1) return null
  roadmap.cards[idx] = { ...roadmap.cards[idx], ...updates }
  saveRoadmap(roadmap)
  return roadmap.cards[idx]
}

export function deleteCard(id: string): boolean {
  const roadmap = getRoadmap()
  const idx = roadmap.cards.findIndex((c) => c.id === id)
  if (idx === -1) return false
  roadmap.cards.splice(idx, 1)
  saveRoadmap(roadmap)
  return true
}

export function moveCard(
  id: string,
  target: { column?: string; row?: string; order?: number }
): RoadmapCard | null {
  const roadmap = getRoadmap()
  const idx = roadmap.cards.findIndex((c) => c.id === id)
  if (idx === -1) return null
  if (target.column !== undefined) roadmap.cards[idx].column = target.column
  if (target.row !== undefined) roadmap.cards[idx].row = target.row
  if (target.order !== undefined) roadmap.cards[idx].order = target.order
  saveRoadmap(roadmap)
  return roadmap.cards[idx]
}

// ---------------------------------------------------------------------------
// Row operations
// ---------------------------------------------------------------------------

export function addRow(label: string, color?: string | null): RoadmapRow {
  const roadmap = getRoadmap()
  const row: RoadmapRow = { label, color: color ?? null }
  roadmap.rows.push(row)
  saveRoadmap(roadmap)
  return row
}

export function deleteRow(label: string): boolean {
  const roadmap = getRoadmap()
  const idx = roadmap.rows.findIndex((r) => r.label === label)
  if (idx === -1) return false
  roadmap.rows.splice(idx, 1)
  // Remove cards in this row
  roadmap.cards = roadmap.cards.filter((c) => c.row !== label)
  saveRoadmap(roadmap)
  return true
}

export function reorderRows(labels: string[]): void {
  const roadmap = getRoadmap()
  const rowMap = new Map(roadmap.rows.map((r) => [r.label, r]))
  roadmap.rows = labels
    .map((l) => rowMap.get(l))
    .filter((r): r is RoadmapRow => r !== undefined)
  saveRoadmap(roadmap)
}

export function updateRow(
  oldLabel: string,
  updates: { label?: string; color?: string | null }
): RoadmapRow | null {
  const roadmap = getRoadmap()
  const idx = roadmap.rows.findIndex((r) => r.label === oldLabel)
  if (idx === -1) return null

  if (updates.label !== undefined && updates.label !== oldLabel) {
    // Rename: update all cards referencing the old label
    for (const card of roadmap.cards) {
      if (card.row === oldLabel) card.row = updates.label
    }
    roadmap.rows[idx].label = updates.label
  }
  if (updates.color !== undefined) {
    roadmap.rows[idx].color = updates.color
  }

  saveRoadmap(roadmap)
  return roadmap.rows[idx]
}

// ---------------------------------------------------------------------------
// Column operations
// ---------------------------------------------------------------------------

export function addColumn(name: string): string[] {
  const roadmap = getRoadmap()
  roadmap.columns.push(name)
  saveRoadmap(roadmap)
  return roadmap.columns
}

export function updateColumn(oldName: string, newName: string): string[] | null {
  const roadmap = getRoadmap()
  const idx = roadmap.columns.indexOf(oldName)
  if (idx === -1) return null

  roadmap.columns[idx] = newName
  // Rename: update all cards referencing the old column
  for (const card of roadmap.cards) {
    if (card.column === oldName) card.column = newName
  }
  saveRoadmap(roadmap)
  return roadmap.columns
}

export function deleteColumn(name: string): boolean {
  const roadmap = getRoadmap()
  const idx = roadmap.columns.indexOf(name)
  if (idx === -1) return false

  roadmap.columns.splice(idx, 1)
  // Remove cards in this column
  roadmap.cards = roadmap.cards.filter((c) => c.column !== name)
  saveRoadmap(roadmap)
  return true
}

export function reorderColumns(names: string[]): void {
  const roadmap = getRoadmap()
  const existing = new Set(roadmap.columns)
  roadmap.columns = names.filter((n) => existing.has(n))
  saveRoadmap(roadmap)
}
