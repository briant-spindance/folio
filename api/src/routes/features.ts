import { readFileSync } from "node:fs"
import { Hono } from "hono"
import {
  listFeatures,
  getFeature,
  createFeature,
  updateFeature,
  deleteFeature,
  listFeatureArtifacts,
  reorderFeatures,
  getArtifactContent,
  getArtifactFilePath,
  saveArtifactContent,
  saveArtifactBuffer,
  deleteArtifact,
  isTextArtifact,
} from "../store/features.js"
import type { FeatureStatus, Priority } from "../store/features.js"
import { updateCard } from "../store/roadmap.js"
import {
  CreateFeatureSchema,
  UpdateFeatureSchema,
  ReorderSchema,
  CreateArtifactSchema,
  SaveArtifactContentSchema,
  validateBody,
} from "../lib/validation.js"
import {
  serializeFeature,
  serializePaginatedFeatures,
  serializeFeatureArtifact,
  serializeArtifactContent,
} from "../lib/serialize.js"

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
        ["draft", "deferred", "ready", "in-progress", "review", "done"].includes(s))
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

  const pointsMinParam = url.searchParams.get("points_min")
  const pointsMin = pointsMinParam ? Number(pointsMinParam) : undefined

  const pointsMaxParam = url.searchParams.get("points_max")
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

  return c.json(serializePaginatedFeatures(result))
})

// PATCH /api/features/reorder — reorder features by slug array
router.patch("/reorder", async (c) => {
  const body = await c.req.json()
  const parsed = validateBody(ReorderSchema, body)
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422)
  }
  const offset = parsed.data.offset ?? 0
  reorderFeatures(parsed.data.slugs, offset)
  return c.json({ ok: true })
})

// GET /api/features/:slug
router.get("/:slug", (c) => {
  const slug = c.req.param("slug")
  const feature = getFeature(slug)
  if (!feature) {
    return c.json({ error: "Feature not found", slug }, 404)
  }
  return c.json(serializeFeature(feature))
})

// POST /api/features
router.post("/", async (c) => {
  const body = await c.req.json()
  const parsed = validateBody(CreateFeatureSchema, body)
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422)
  }

  try {
    const feature = createFeature({
      title: parsed.data.title,
      body: parsed.data.body,
      priority: parsed.data.priority,
      roadmapCardId: parsed.data.roadmap_card_id,
    })

    // If created from a roadmap card, link the card back to this feature
    if (parsed.data.roadmap_card_id) {
      updateCard(parsed.data.roadmap_card_id, { featureSlug: feature.slug })
    }

    return c.json(serializeFeature(feature), 201)
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
  const body = await c.req.json()
  const parsed = validateBody(UpdateFeatureSchema, body)
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422)
  }

  try {
    const feature = updateFeature(slug, {
      title: parsed.data.title,
      status: parsed.data.status,
      priority: parsed.data.priority,
      assignees: parsed.data.assignees,
      points: parsed.data.points,
      tags: parsed.data.tags,
      body: parsed.data.body,
    })

    if (!feature) {
      return c.json({ error: "Feature not found", slug }, 404)
    }

    return c.json(serializeFeature(feature))
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
  return c.json(artifacts.map(serializeFeatureArtifact))
})

// POST /api/features/:slug/artifacts/upload — upload a file
router.post("/:slug/artifacts/upload", async (c) => {
  const slug = c.req.param("slug")
  const formData = await c.req.formData()
  const file = formData.get("file")

  if (!file || !(file instanceof File)) {
    return c.json({ error: "file is required" }, 400)
  }

  const filename = file.name
  if (!filename || filename === "FEATURE.md") {
    return c.json({ error: "Invalid filename" }, 400)
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const artifact = saveArtifactBuffer(slug, filename, buffer)
    if (!artifact) {
      return c.json({ error: "Feature not found", slug }, 404)
    }
    return c.json(serializeFeatureArtifact(artifact), 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to upload file"
    return c.json({ error: message }, 500)
  }
})

// POST /api/features/:slug/artifacts/create — create a new empty text file
router.post("/:slug/artifacts/create", async (c) => {
  const slug = c.req.param("slug")
  const body = await c.req.json()
  const parsed = validateBody(CreateArtifactSchema, body)
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422)
  }

  const filename = parsed.data.filename
  if (filename === "FEATURE.md") {
    return c.json({ error: "Invalid filename" }, 400)
  }

  // Check if file already exists
  const existing = getArtifactFilePath(slug, filename)
  if (existing) {
    return c.json({ error: "File already exists", filename }, 409)
  }

  try {
    const artifact = saveArtifactContent(slug, filename, "")
    if (!artifact) {
      return c.json({ error: "Feature not found", slug }, 404)
    }
    return c.json(serializeFeatureArtifact(artifact), 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create file"
    return c.json({ error: message }, 500)
  }
})

// GET /api/features/:slug/artifacts/:filename — get artifact content
router.get("/:slug/artifacts/:filename", (c) => {
  const slug = c.req.param("slug")
  const filename = c.req.param("filename")
  const url = new URL(c.req.url)
  const raw = url.searchParams.has("raw")

  // If ?raw or binary file, serve the raw file
  if (raw || !isTextArtifact(filename)) {
    const result = getArtifactFilePath(slug, filename)
    if (!result) {
      return c.json({ error: "Artifact not found", slug, filename }, 404)
    }
    const content = readFileSync(result.filePath)
    return new Response(content, {
      headers: {
        "Content-Type": result.mimeType,
        "Content-Length": String(content.length),
        "Cache-Control": "no-cache",
      },
    })
  }

  // Text file — return as JSON
  const artifact = getArtifactContent(slug, filename)
  if (!artifact) {
    return c.json({ error: "Artifact not found", slug, filename }, 404)
  }
  return c.json(serializeArtifactContent(artifact))
})

// PUT /api/features/:slug/artifacts/:filename — save artifact content
router.put("/:slug/artifacts/:filename", async (c) => {
  const slug = c.req.param("slug")
  const filename = c.req.param("filename")
  const body = await c.req.json()
  const parsed = validateBody(SaveArtifactContentSchema, body)
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422)
  }

  const artifact = saveArtifactContent(slug, filename, parsed.data.content)
  if (!artifact) {
    return c.json({ error: "Feature not found or invalid filename", slug, filename }, 404)
  }
  return c.json(serializeFeatureArtifact(artifact))
})

// DELETE /api/features/:slug/artifacts/:filename — delete an artifact
router.delete("/:slug/artifacts/:filename", (c) => {
  const slug = c.req.param("slug")
  const filename = c.req.param("filename")
  const deleted = deleteArtifact(slug, filename)
  if (!deleted) {
    return c.json({ error: "Artifact not found", slug, filename }, 404)
  }
  return c.json({ ok: true, slug, filename })
})

export default router
