import { Hono } from "hono"
import { search } from "../lib/search.js"

const router = new Hono()

router.get("/", (c) => {
  const q = c.req.query("q")
  if (!q || q.trim() === "") {
    return c.json({ error: "Query parameter 'q' is required" }, 400)
  }

  const typeParam = c.req.query("type")
  const types = typeParam ? typeParam.split(",").map((t) => t.trim()).filter(Boolean) : []

  const limitParam = c.req.query("limit")
  const limit = limitParam ? Math.max(1, Math.min(100, parseInt(limitParam, 10) || 20)) : 20

  const response = search(q.trim(), { types, limit })
  return c.json(response)
})

export default router
