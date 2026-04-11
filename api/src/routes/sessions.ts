import { Hono } from "hono"
import { listSessions, upsertSession, deleteSession } from "../store/sessions.js"

const router = new Hono()

// GET /api/ai-sessions/:key — list sessions for a context key
router.get("/:key", (c) => {
  const key = decodeURIComponent(c.req.param("key"))
  return c.json(listSessions(key))
})

// PUT /api/ai-sessions/:key — upsert a single session
router.put("/:key", async (c) => {
  const key = decodeURIComponent(c.req.param("key"))
  const body = await c.req.json<{
    id?: string
    name?: string
    savedAt?: number
    messages?: unknown[]
  }>()
  if (!body.id || !body.messages) {
    return c.json({ error: "id and messages are required" }, 400)
  }
  const session = {
    id: body.id,
    name: body.name ?? "Conversation",
    savedAt: body.savedAt ?? Date.now(),
    messages: body.messages,
  }
  upsertSession(key, session)
  return c.json({ ok: true, id: session.id })
})

// DELETE /api/ai-sessions/:key/:id — delete a single session
router.delete("/:key/:id", (c) => {
  const key = decodeURIComponent(c.req.param("key"))
  const id = c.req.param("id")
  deleteSession(key, id)
  return c.json({ ok: true })
})

export default router
