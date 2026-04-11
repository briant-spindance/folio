import { Hono } from "hono"
import { listWikiDocs, getWikiDoc } from "../store/wiki.js"

const router = new Hono()

// GET /api/wiki
router.get("/", (c) => {
  const docs = listWikiDocs()
  return c.json(docs)
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

export default router
