import { Hono } from "hono"
import { listSessions, upsertSession, deleteSession } from "../store/sessions.js"
import { UpsertSessionSchema, validateBody } from "../lib/validation.js"
import { serializeSession } from "../lib/serialize.js"

const router = new Hono()

// GET /api/ai-sessions/:key — list sessions for a context key
router.get("/:key", (c) => {
  const key = decodeURIComponent(c.req.param("key"))
  const sessions = listSessions(key)
  return c.json(sessions.map(serializeSession))
})

// PUT /api/ai-sessions/:key — upsert a single session
router.put("/:key", async (c) => {
  const key = decodeURIComponent(c.req.param("key"))
  const body = await c.req.json()
  const parsed = validateBody(UpsertSessionSchema, body)
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422)
  }
  const session = {
    id: parsed.data.id,
    name: parsed.data.name ?? "Conversation",
    savedAt: parsed.data.saved_at ?? Date.now(),
    messages: parsed.data.messages,
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
