import { Hono } from "hono"
import { listFeatures, getFeature, createFeature } from "../store/features.js"
import { updateCard } from "../store/roadmap.js"

const router = new Hono()

// GET /api/features
router.get("/", (c) => {
  const features = listFeatures()
  return c.json(features)
})

// GET /api/features/:slug
router.get("/:slug", (c) => {
  const slug = c.req.param("slug")
  const feature = getFeature(slug)
  if (!feature) {
    return c.json({ error: "Feature not found", slug }, 404)
  }
  return c.json(feature)
})

// POST /api/features
router.post("/", async (c) => {
  const body = await c.req.json<{
    title?: string
    body?: string
    priority?: string
    roadmapCardId?: string
  }>()

  if (!body.title || !body.title.trim()) {
    return c.json({ error: "Title is required" }, 400)
  }

  try {
    const feature = createFeature({
      title: body.title.trim(),
      body: body.body,
      priority: body.priority as "critical" | "high" | "medium" | "low" | undefined,
      roadmapCardId: body.roadmapCardId,
    })

    // If created from a roadmap card, link the card back to this feature
    if (body.roadmapCardId) {
      updateCard(body.roadmapCardId, { featureSlug: feature.slug })
    }

    return c.json(feature, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create feature"
    if (message.includes("already exists")) {
      return c.json({ error: message }, 409)
    }
    return c.json({ error: message }, 500)
  }
})

export default router
