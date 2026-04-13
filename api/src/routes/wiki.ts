import { Hono } from "hono"
import { listWikiDocs, getWikiDoc, saveWikiDoc, deleteWikiDoc, slugifyTitle, uniqueSlug, reorderWikiDocs } from "../store/wiki.js"
import { SaveWikiDocSchema, ReorderSlugsSchema, validateBody } from "../lib/validation.js"
import { serializeWikiDoc } from "../lib/serialize.js"

const router = new Hono()

// GET /api/wiki — paginated listing
router.get("/", (c) => {
  const url = new URL(c.req.url)
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1)
  const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50))

  const allDocs = listWikiDocs()
  const total = allDocs.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * limit
  const paged = allDocs.slice(start, start + limit)

  return c.json({
    docs: paged.map(serializeWikiDoc),
    total,
    page: safePage,
    limit,
    total_pages: totalPages,
  })
})

// PATCH /api/wiki/reorder — reorder docs
router.patch("/reorder", async (c) => {
  const body = await c.req.json()
  const parsed = validateBody(ReorderSlugsSchema, body)
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422)
  }
  reorderWikiDocs(parsed.data.slugs)
  return c.json({ ok: true })
})

// GET /api/wiki/:slug
router.get("/:slug", (c) => {
  const slug = c.req.param("slug")
  const doc = getWikiDoc(slug)
  if (!doc) {
    return c.json({ error: "Document not found", slug }, 404)
  }
  return c.json(serializeWikiDoc(doc))
})

// PUT /api/wiki/:slug — create or update
router.put("/:slug", async (c) => {
  const slug = c.req.param("slug")
  const body = await c.req.json()
  const parsed = validateBody(SaveWikiDocSchema, body)
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422)
  }

  const doc = saveWikiDoc(slug, {
    title: parsed.data.title,
    icon: parsed.data.icon ?? null,
    body: parsed.data.body,
  })
  return c.json(serializeWikiDoc(doc))
})

// POST /api/wiki — create new with auto-generated slug
router.post("/", async (c) => {
  const body = await c.req.json()
  const parsed = validateBody(SaveWikiDocSchema, body)
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422)
  }

  const baseSlug = slugifyTitle(parsed.data.title)
  const slug = uniqueSlug(baseSlug)

  const doc = saveWikiDoc(slug, {
    title: parsed.data.title,
    icon: parsed.data.icon ?? null,
    body: parsed.data.body,
  })
  return c.json({ ...serializeWikiDoc(doc), slug }, 201)
})

// DELETE /api/wiki/:slug
router.delete("/:slug", (c) => {
  const slug = c.req.param("slug")
  const deleted = deleteWikiDoc(slug)
  if (!deleted) {
    return c.json({ error: "Document not found", slug }, 404)
  }
  return c.json({ ok: true, slug })
})

export default router
