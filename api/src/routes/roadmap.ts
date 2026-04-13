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
import {
  CreateCardSchema,
  UpdateCardSchema,
  MoveCardSchema,
  CreateRowSchema,
  UpdateRowSchema,
  ReorderLabelsSchema,
  CreateColumnSchema,
  ReorderNamesSchema,
  validateBody,
} from "../lib/validation.js"
import { serializeRoadmap, serializeRoadmapCard } from "../lib/serialize.js"

const router = new Hono()

// GET /api/roadmap — get full roadmap
router.get("/", (c) => {
  const roadmap = getRoadmap()
  return c.json(serializeRoadmap(roadmap))
})

// PUT /api/roadmap — save full roadmap (bulk update)
router.put("/", async (c) => {
  const body = await c.req.json()
  // For bulk update, transform feature_slug back to featureSlug in cards
  if (body.cards && Array.isArray(body.cards)) {
    body.cards = body.cards.map((card: Record<string, unknown>) => {
      if ("feature_slug" in card) {
        const { feature_slug, ...rest } = card
        return { ...rest, featureSlug: feature_slug }
      }
      return card
    })
  }
  const roadmap = saveRoadmap(body)
  return c.json(serializeRoadmap(roadmap))
})

// ── Cards ───────────────────────────────────────────────────────────────────

// POST /api/roadmap/cards — add a new card
router.post("/cards", async (c) => {
  const body = await c.req.json()
  const parsed = validateBody(CreateCardSchema, body)
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422)
  }

  const card = addCard({
    title: parsed.data.title,
    notes: parsed.data.notes ?? "",
    column: parsed.data.column ?? "now",
    row: parsed.data.row ?? "",
    order: parsed.data.order ?? 0,
    featureSlug: null,
  })
  return c.json(serializeRoadmapCard(card), 201)
})

// PUT /api/roadmap/cards/:id — update a card
router.put("/cards/:id", async (c) => {
  const id = c.req.param("id")
  const body = await c.req.json()
  const parsed = validateBody(UpdateCardSchema, body)
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422)
  }

  // Transform feature_slug to featureSlug for the store
  const updates: Record<string, unknown> = { ...parsed.data }
  if ("feature_slug" in updates) {
    updates.featureSlug = updates.feature_slug
    delete updates.feature_slug
  }

  const card = updateCard(id, updates)
  if (!card) {
    return c.json({ error: "Card not found", id }, 404)
  }
  return c.json(serializeRoadmapCard(card))
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
  const body = await c.req.json()
  const parsed = validateBody(MoveCardSchema, body)
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422)
  }
  const card = moveCard(id, parsed.data)
  if (!card) {
    return c.json({ error: "Card not found", id }, 404)
  }
  return c.json(serializeRoadmapCard(card))
})

// ── Rows ────────────────────────────────────────────────────────────────────

// POST /api/roadmap/rows — add a row
router.post("/rows", async (c) => {
  const body = await c.req.json()
  const parsed = validateBody(CreateRowSchema, body)
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422)
  }
  const row = addRow(parsed.data.label, parsed.data.color)
  return c.json(row, 201)
})

// PUT /api/roadmap/rows/:label — update a row (rename / change color)
router.put("/rows/:label", async (c) => {
  const oldLabel = decodeURIComponent(c.req.param("label"))
  const body = await c.req.json()
  const parsed = validateBody(UpdateRowSchema, body)
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422)
  }
  const row = updateRow(oldLabel, parsed.data)
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
  const body = await c.req.json()
  const parsed = validateBody(ReorderLabelsSchema, body)
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422)
  }
  reorderRows(parsed.data.labels)
  return c.json({ ok: true })
})

// ── Columns ─────────────────────────────────────────────────────────────────

// POST /api/roadmap/columns — add a column
router.post("/columns", async (c) => {
  const body = await c.req.json()
  const parsed = validateBody(CreateColumnSchema, body)
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422)
  }
  const columns = addColumn(parsed.data.name)
  return c.json({ columns }, 201)
})

// PUT /api/roadmap/columns/:name — rename a column
router.put("/columns/:name", async (c) => {
  const oldName = decodeURIComponent(c.req.param("name"))
  const body = await c.req.json()
  const parsed = validateBody(CreateColumnSchema, body)
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422)
  }
  const columns = updateColumn(oldName, parsed.data.name)
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
  const body = await c.req.json()
  const parsed = validateBody(ReorderNamesSchema, body)
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422)
  }
  reorderColumns(parsed.data.names)
  return c.json({ ok: true })
})

export default router
