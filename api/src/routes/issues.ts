import { readFileSync } from "node:fs"
import { Hono } from "hono"
import {
  listIssues,
  getIssue,
  createIssue,
  updateIssue,
  deleteIssue,
  listIssueArtifacts,
  reorderIssues,
  getArtifactContent,
  getArtifactFilePath,
  saveArtifactContent,
  saveArtifactBuffer,
  deleteArtifact,
  isTextArtifact,
} from "../store/issues.js"
import type { IssueStatus, IssueType, Priority } from "../store/issues.js"
import {
  CreateIssueSchema,
  UpdateIssueSchema,
  ReorderSchema,
  CreateArtifactSchema,
  SaveArtifactContentSchema,
  validateBody,
} from "../lib/validation.js"
import {
  serializeIssue,
  serializePaginatedIssues,
  serializeIssueArtifact,
  serializeIssueArtifactContent,
} from "../lib/serialize.js"

const router = new Hono()

// GET /api/issues — paginated listing with filters
router.get("/", (c) => {
  const url = new URL(c.req.url)

  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1)
  const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get("limit") ?? "25", 10) || 25))

  // Filters
  const statusParam = url.searchParams.get("status")
  const status = statusParam
    ? statusParam.split(",").filter((s): s is IssueStatus =>
        ["open", "in-progress", "closed"].includes(s))
    : undefined

  const typeParam = url.searchParams.get("type")
  const type = typeParam
    ? typeParam.split(",").filter((t): t is IssueType =>
        ["bug", "task", "improvement", "chore"].includes(t))
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

  const featureParam = url.searchParams.get("feature")
  let feature: string | null | undefined = undefined
  if (featureParam !== null) {
    feature = featureParam === "__unlinked__" ? null : featureParam
  }

  const pointsMinParam = url.searchParams.get("points_min")
  const pointsMin = pointsMinParam ? Number(pointsMinParam) : undefined

  const pointsMaxParam = url.searchParams.get("points_max")
  const pointsMax = pointsMaxParam ? Number(pointsMaxParam) : undefined

  const labelsParam = url.searchParams.get("labels")
  const labels = labelsParam ? labelsParam.split(",").filter(Boolean) : undefined

  // Sorting
  const sortParam = url.searchParams.get("sort") ?? "order"
  const sort = (["order", "title", "status", "type", "priority", "modified"].includes(sortParam)
    ? sortParam
    : "order") as "order" | "title" | "status" | "type" | "priority" | "modified"

  const dirParam = url.searchParams.get("dir") ?? "asc"
  const dir = dirParam === "desc" ? "desc" : "asc"

  const result = listIssues({
    page,
    limit,
    status,
    type,
    priority,
    assignee,
    feature,
    pointsMin: pointsMin !== undefined && !isNaN(pointsMin) ? pointsMin : undefined,
    pointsMax: pointsMax !== undefined && !isNaN(pointsMax) ? pointsMax : undefined,
    labels,
    sort,
    dir,
  })

  return c.json(serializePaginatedIssues(result))
})

// PATCH /api/issues/reorder — reorder issues by slug array
router.patch("/reorder", async (c) => {
  const body = await c.req.json()
  const parsed = validateBody(ReorderSchema, body)
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422)
  }
  const offset = parsed.data.offset ?? 0
  reorderIssues(parsed.data.slugs, offset)
  return c.json({ ok: true })
})

// GET /api/issues/:slug
router.get("/:slug", (c) => {
  const slug = c.req.param("slug")
  const issue = getIssue(slug)
  if (!issue) {
    return c.json({ error: "Issue not found", slug }, 404)
  }
  return c.json(serializeIssue(issue))
})

// POST /api/issues
router.post("/", async (c) => {
  const body = await c.req.json()
  const parsed = validateBody(CreateIssueSchema, body)
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422)
  }

  try {
    const issue = createIssue({
      title: parsed.data.title,
      body: parsed.data.body,
      type: parsed.data.type,
      priority: parsed.data.priority,
      feature: parsed.data.feature,
    })

    return c.json(serializeIssue(issue), 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create issue"
    if (message.includes("already exists")) {
      return c.json({ error: message }, 409)
    }
    return c.json({ error: message }, 500)
  }
})

// PUT /api/issues/:slug
router.put("/:slug", async (c) => {
  const slug = c.req.param("slug")
  const body = await c.req.json()
  const parsed = validateBody(UpdateIssueSchema, body)
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422)
  }

  try {
    const issue = updateIssue(slug, {
      title: parsed.data.title,
      status: parsed.data.status,
      type: parsed.data.type,
      priority: parsed.data.priority,
      assignees: parsed.data.assignees,
      points: parsed.data.points,
      sprint: parsed.data.sprint,
      feature: parsed.data.feature,
      labels: parsed.data.labels,
      body: parsed.data.body,
    })

    if (!issue) {
      return c.json({ error: "Issue not found", slug }, 404)
    }

    return c.json(serializeIssue(issue))
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update issue"
    return c.json({ error: message }, 500)
  }
})

// DELETE /api/issues/:slug
router.delete("/:slug", (c) => {
  const slug = c.req.param("slug")
  const deleted = deleteIssue(slug)
  if (!deleted) {
    return c.json({ error: "Issue not found", slug }, 404)
  }
  return c.json({ ok: true, slug })
})

// GET /api/issues/:slug/artifacts
router.get("/:slug/artifacts", (c) => {
  const slug = c.req.param("slug")
  const artifacts = listIssueArtifacts(slug)
  if (artifacts === null) {
    return c.json({ error: "Issue not found", slug }, 404)
  }
  return c.json(artifacts.map(serializeIssueArtifact))
})

// POST /api/issues/:slug/artifacts/upload — upload a file
router.post("/:slug/artifacts/upload", async (c) => {
  const slug = c.req.param("slug")
  const formData = await c.req.formData()
  const file = formData.get("file")

  if (!file || !(file instanceof File)) {
    return c.json({ error: "file is required" }, 400)
  }

  const filename = file.name
  if (!filename || filename === "ISSUE.md") {
    return c.json({ error: "Invalid filename" }, 400)
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const artifact = saveArtifactBuffer(slug, filename, buffer)
    if (!artifact) {
      return c.json({ error: "Issue not found", slug }, 404)
    }
    return c.json(serializeIssueArtifact(artifact), 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to upload file"
    return c.json({ error: message }, 500)
  }
})

// POST /api/issues/:slug/artifacts/create — create a new empty text file
router.post("/:slug/artifacts/create", async (c) => {
  const slug = c.req.param("slug")
  const body = await c.req.json()
  const parsed = validateBody(CreateArtifactSchema, body)
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422)
  }

  const filename = parsed.data.filename
  if (filename === "ISSUE.md") {
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
      return c.json({ error: "Issue not found", slug }, 404)
    }
    return c.json(serializeIssueArtifact(artifact), 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create file"
    return c.json({ error: message }, 500)
  }
})

// GET /api/issues/:slug/artifacts/:filename — get artifact content
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
  return c.json(serializeIssueArtifactContent(artifact))
})

// PUT /api/issues/:slug/artifacts/:filename — save artifact content
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
    return c.json({ error: "Issue not found or invalid filename", slug, filename }, 404)
  }
  return c.json(serializeIssueArtifact(artifact))
})

// DELETE /api/issues/:slug/artifacts/:filename — delete an artifact
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
