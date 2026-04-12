import { Hono } from "hono"
import {
  listFeatures,
  getFeature,
  createFeature,
  updateFeature,
  deleteFeature,
  listFeatureArtifacts,
  reorderFeatures,
} from "../store/features.js"
import type { FeatureStatus, Priority } from "../store/features.js"
import { updateCard } from "../store/roadmap.js"

const router = new Hono()

// GET /api/features — paginated listing with filters
router.get("/", (c) => {
  const url = new URL(c.req.url)

  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1)
  const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get("limit") ?? "25", 10) || 25))

  // Filters
  const statusParam = url.searchParams.get("status")
  const status = statusParam
    ? statusParam.split(",").filter((s): s is FeatureStatus =>
        ["draft", "ready", "in-progress", "review", "done"].includes(s))
    : undefined

  const priorityParam = url.searchParams.get("priority")
  const priority = priorityParam
    ? priorityParam.split(",").filter((p): p is Priority =>
        ["critical", "high", "medium", "low"].includes(p))
    : undefined

  const assigneeParam = url.searchParams.get("assignee")
  let assignee: string | null | undefined = undefined
  if (assigneeParam !== null) {
    assignee = assigneeParam === "__unassigned__" ? null : assigneeParam
  }

  const pointsMinParam = url.searchParams.get("pointsMin")
  const pointsMin = pointsMinParam ? Number(pointsMinParam) : undefined

  const pointsMaxParam = url.searchParams.get("pointsMax")
  const pointsMax = pointsMaxParam ? Number(pointsMaxParam) : undefined

  const tagsParam = url.searchParams.get("tags")
  const tags = tagsParam ? tagsParam.split(",").filter(Boolean) : undefined

  // Sorting
  const sortParam = url.searchParams.get("sort") ?? "order"
  const sort = (["order", "title", "status", "priority", "modified"].includes(sortParam)
    ? sortParam
    : "order") as "order" | "title" | "status" | "priority" | "modified"

  const dirParam = url.searchParams.get("dir") ?? "asc"
  const dir = dirParam === "desc" ? "desc" : "asc"

  const result = listFeatures({
    page,
    limit,
    status,
    priority,
    assignee,
    pointsMin: pointsMin !== undefined && !isNaN(pointsMin) ? pointsMin : undefined,
    pointsMax: pointsMax !== undefined && !isNaN(pointsMax) ? pointsMax : undefined,
    tags,
    sort,
    dir,
  })

  return c.json(result)
})

// PATCH /api/features/reorder — reorder features by slug array
router.patch("/reorder", async (c) => {
  const body = await c.req.json<{ slugs?: string[]; offset?: number }>()
  if (!Array.isArray(body.slugs)) {
    return c.json({ error: "slugs array is required" }, 400)
  }
  const offset = typeof body.offset === "number" ? body.offset : 0
  reorderFeatures(body.slugs, offset)
  return c.json({ ok: true })
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
      priority: body.priority as Priority | undefined,
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

// PUT /api/features/:slug
router.put("/:slug", async (c) => {
  const slug = c.req.param("slug")
  const body = await c.req.json<{
    title?: string
    status?: string
    priority?: string
    assignee?: string | null
    points?: number | null
    tags?: string[]
    body?: string
  }>()

  try {
    const feature = updateFeature(slug, {
      title: body.title,
      status: body.status as FeatureStatus | undefined,
      priority: body.priority as Priority | undefined,
      assignee: body.assignee,
      points: body.points,
      tags: body.tags,
      body: body.body,
    })

    if (!feature) {
      return c.json({ error: "Feature not found", slug }, 404)
    }

    return c.json(feature)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update feature"
    return c.json({ error: message }, 500)
  }
})

// DELETE /api/features/:slug
router.delete("/:slug", (c) => {
  const slug = c.req.param("slug")
  const deleted = deleteFeature(slug)
  if (!deleted) {
    return c.json({ error: "Feature not found", slug }, 404)
  }
  return c.json({ ok: true, slug })
})

// GET /api/features/:slug/artifacts
router.get("/:slug/artifacts", (c) => {
  const slug = c.req.param("slug")
  const artifacts = listFeatureArtifacts(slug)
  if (artifacts === null) {
    return c.json({ error: "Feature not found", slug }, 404)
  }
  return c.json(artifacts)
})

export default router
