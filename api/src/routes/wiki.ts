import { Hono } from "hono"
import { listWikiDocs, getWikiDoc, saveWikiDoc, deleteWikiDoc, slugifyTitle, uniqueSlug, reorderWikiDocs } from "../store/wiki.js"

const router = new Hono()

// GET /api/wiki
router.get("/", (c) => {
  const docs = listWikiDocs()
  return c.json(docs)
})

// PATCH /api/wiki/reorder — reorder docs
router.patch("/reorder", async (c) => {
  const body = await c.req.json<{ slugs?: string[] }>()
  if (!Array.isArray(body.slugs)) {
    return c.json({ error: "slugs array is required" }, 400)
  }
  reorderWikiDocs(body.slugs)
  return c.json({ ok: true })
})

// GET /api/wiki/:slug
router.get("/:slug", (c) => {
  const slug = c.req.param("slug")
  const doc = getWikiDoc(slug)
  if (!doc) {
    return c.json({ error: "Document not found", slug }, 404)
  }
  return c.json(doc)
})

// PUT /api/wiki/:slug — create or update
router.put("/:slug", async (c) => {
  const slug = c.req.param("slug")
  const body = await c.req.json<{ title?: string; icon?: string | null; body?: string }>()

  if (!body.title || typeof body.title !== "string") {
    return c.json({ error: "title is required" }, 400)
  }

  const doc = saveWikiDoc(slug, {
    title: body.title,
    icon: body.icon ?? null,
    body: body.body ?? "",
  })
  return c.json(doc)
})

// POST /api/wiki — create new with auto-generated slug
router.post("/", async (c) => {
  const body = await c.req.json<{ title?: string; icon?: string | null; body?: string }>()

  if (!body.title || typeof body.title !== "string") {
    return c.json({ error: "title is required" }, 400)
  }

  const baseSlug = slugifyTitle(body.title)
  const slug = uniqueSlug(baseSlug)

  const doc = saveWikiDoc(slug, {
    title: body.title,
    icon: body.icon ?? null,
    body: body.body ?? "",
  })
  return c.json({ ...doc, slug }, 201)
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
