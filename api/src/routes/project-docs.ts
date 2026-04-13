import { Hono } from "hono"
import { listProjectDocs, getProjectDoc } from "../store/project-docs.js"
import { serializeProjectDoc } from "../lib/serialize.js"

const router = new Hono()

// GET /api/project-docs — list all project docs
router.get("/", (c) => {
  const docs = listProjectDocs()
  return c.json({ docs: docs.map(serializeProjectDoc) })
})

// GET /api/project-docs/:slug — get a single project doc
router.get("/:slug", (c) => {
  const slug = c.req.param("slug")
  const doc = getProjectDoc(slug)
  if (!doc) {
    return c.json({ error: "Document not found", slug }, 404)
  }
  return c.json(serializeProjectDoc(doc))
})

export default router
