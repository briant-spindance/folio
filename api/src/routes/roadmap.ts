import { Hono } from "hono"
import {
  getRoadmap,
  saveRoadmap,
  addCard,
  updateCard,
  deleteCard,
  moveCard,
  addRow,
  updateRow,
  deleteRow,
  reorderRows,
  addColumn,
  updateColumn,
  deleteColumn,
  reorderColumns,
} from "../store/roadmap.js"

const router = new Hono()

// GET /api/roadmap — get full roadmap
router.get("/", (c) => {
  const roadmap = getRoadmap()
  return c.json(roadmap)
})

// PUT /api/roadmap — save full roadmap (bulk update)
router.put("/", async (c) => {
  const body = await c.req.json()
  const roadmap = saveRoadmap(body)
  return c.json(roadmap)
})

// ── Cards ───────────────────────────────────────────────────────────────────

// POST /api/roadmap/cards — add a new card
router.post("/cards", async (c) => {
  const body = await c.req.json<{
    title?: string
    notes?: string
    column?: string
    row?: string
    order?: number
  }>()

  if (!body.title || typeof body.title !== "string") {
    return c.json({ error: "title is required" }, 400)
  }

  const card = addCard({
    title: body.title,
    notes: body.notes ?? "",
    column: body.column ?? "now",
    row: body.row ?? "",
    order: body.order ?? 0,
    featureSlug: null,
  })
  return c.json(card, 201)
})

// PUT /api/roadmap/cards/:id — update a card
router.put("/cards/:id", async (c) => {
  const id = c.req.param("id")
  const body = await c.req.json<Partial<{ title: string; notes: string; column: string; row: string; order: number }>>()
  const card = updateCard(id, body)
  if (!card) {
    return c.json({ error: "Card not found", id }, 404)
  }
  return c.json(card)
})

// DELETE /api/roadmap/cards/:id — delete a card
router.delete("/cards/:id", (c) => {
  const id = c.req.param("id")
  const deleted = deleteCard(id)
  if (!deleted) {
    return c.json({ error: "Card not found", id }, 404)
  }
  return c.json({ ok: true, id })
})

// PATCH /api/roadmap/cards/:id/move — move a card
router.patch("/cards/:id/move", async (c) => {
  const id = c.req.param("id")
  const body = await c.req.json<{ column?: string; row?: string; order?: number }>()
  const card = moveCard(id, body)
  if (!card) {
    return c.json({ error: "Card not found", id }, 404)
  }
  return c.json(card)
})

// ── Rows ────────────────────────────────────────────────────────────────────

// POST /api/roadmap/rows — add a row
router.post("/rows", async (c) => {
  const body = await c.req.json<{ label?: string; color?: string | null }>()
  if (!body.label || typeof body.label !== "string") {
    return c.json({ error: "label is required" }, 400)
  }
  const row = addRow(body.label, body.color)
  return c.json(row, 201)
})

// PUT /api/roadmap/rows/:label — update a row (rename / change color)
router.put("/rows/:label", async (c) => {
  const oldLabel = decodeURIComponent(c.req.param("label"))
  const body = await c.req.json<{ label?: string; color?: string | null }>()
  const row = updateRow(oldLabel, body)
  if (!row) {
    return c.json({ error: "Row not found", label: oldLabel }, 404)
  }
  return c.json(row)
})

// DELETE /api/roadmap/rows/:label — delete a row
router.delete("/rows/:label", (c) => {
  const label = decodeURIComponent(c.req.param("label"))
  const deleted = deleteRow(label)
  if (!deleted) {
    return c.json({ error: "Row not found", label }, 404)
  }
  return c.json({ ok: true, label })
})

// PATCH /api/roadmap/rows/reorder — reorder rows
router.patch("/rows/reorder", async (c) => {
  const body = await c.req.json<{ labels?: string[] }>()
  if (!Array.isArray(body.labels)) {
    return c.json({ error: "labels array is required" }, 400)
  }
  reorderRows(body.labels)
  return c.json({ ok: true })
})

// ── Columns ─────────────────────────────────────────────────────────────────

// POST /api/roadmap/columns — add a column
router.post("/columns", async (c) => {
  const body = await c.req.json<{ name?: string }>()
  if (!body.name || typeof body.name !== "string") {
    return c.json({ error: "name is required" }, 400)
  }
  const columns = addColumn(body.name)
  return c.json({ columns }, 201)
})

// PUT /api/roadmap/columns/:name — rename a column
router.put("/columns/:name", async (c) => {
  const oldName = decodeURIComponent(c.req.param("name"))
  const body = await c.req.json<{ name?: string }>()
  if (!body.name || typeof body.name !== "string") {
    return c.json({ error: "name is required" }, 400)
  }
  const columns = updateColumn(oldName, body.name)
  if (!columns) {
    return c.json({ error: "Column not found", name: oldName }, 404)
  }
  return c.json({ columns })
})

// DELETE /api/roadmap/columns/:name — delete a column
router.delete("/columns/:name", (c) => {
  const name = decodeURIComponent(c.req.param("name"))
  const deleted = deleteColumn(name)
  if (!deleted) {
    return c.json({ error: "Column not found", name }, 404)
  }
  return c.json({ ok: true, name })
})

// PATCH /api/roadmap/columns/reorder — reorder columns
router.patch("/columns/reorder", async (c) => {
  const body = await c.req.json<{ names?: string[] }>()
  if (!Array.isArray(body.names)) {
    return c.json({ error: "names array is required" }, 400)
  }
  reorderColumns(body.names)
  return c.json({ ok: true })
})

export default router
