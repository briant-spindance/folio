import { readdirSync, existsSync, mkdirSync, writeFileSync, rmSync, statSync } from "node:fs"
import path from "node:path"
import matter from "gray-matter"
import { parseFrontmatter } from "../lib/frontmatter.js"
import { paths } from "../lib/paths.js"

export type FeatureStatus = "draft" | "ready" | "in-progress" | "review" | "done"
export type Priority = "critical" | "high" | "medium" | "low"

export interface Feature {
  slug: string
  title: string
  status: FeatureStatus
  priority: Priority
  assignee: string | null
  points: number | null
  sprint: string | null
  tags: string[]
  created: string | null
  modified: string | null
  roadmapCard: string | null
  body: string
  order?: number
}

// Priority ordering for sorting (lower index = higher priority)
const PRIORITY_ORDER: Priority[] = ["critical", "high", "medium", "low"]
const STATUS_ORDER: FeatureStatus[] = ["draft", "ready", "in-progress", "review", "done"]

function normalizePriority(raw: unknown): Priority {
  const s = String(raw ?? "").toLowerCase()
  if (PRIORITY_ORDER.includes(s as Priority)) return s as Priority
  // legacy numeric support
  const n = Number(raw)
  if (!isNaN(n)) {
    if (n <= 1) return "critical"
    if (n <= 3) return "high"
    if (n <= 6) return "medium"
    return "low"
  }
  return "medium"
}

function parseFeature(slug: string, data: Record<string, unknown>, content: string): Feature {
  return {
    slug,
    title: String(data.title ?? slug),
    status: (data.status as FeatureStatus) ?? "draft",
    priority: normalizePriority(data.priority),
    assignee: data.assignee ? String(data.assignee) : null,
    points: data.points != null ? Number(data.points) : null,
    sprint: data.sprint ? String(data.sprint) : null,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    created: data.created ? String(data.created) : null,
    modified: data.modified ? String(data.modified) : null,
    roadmapCard: data["roadmap-card"] ? String(data["roadmap-card"]) : null,
    body: content,
    order: typeof data.order === "number" ? data.order : undefined,
  }
}

// ---------------------------------------------------------------------------
// Paginated listing
// ---------------------------------------------------------------------------

export interface ListFeaturesParams {
  page?: number
  limit?: number
  status?: FeatureStatus[]
  priority?: Priority[]
  assignee?: string | null  // string = name, null = unassigned filter
  pointsMin?: number
  pointsMax?: number
  tags?: string[]
  sort?: "order" | "title" | "status" | "priority" | "modified"
  dir?: "asc" | "desc"
}

export interface PaginatedFeatures {
  features: Feature[]
  total: number
  page: number
  limit: number
  totalPages: number
}

function readAllFeatures(): Feature[] {
  if (!existsSync(paths.features)) return []

  return readdirSync(paths.features, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const slug = d.name
      const featurePath = path.join(paths.features, slug, "FEATURE.md")
      if (!existsSync(featurePath)) return null

      const { data, content } = parseFrontmatter(featurePath)
      return parseFeature(slug, data, content)
    })
    .filter((f): f is Feature => f !== null)
}

export function listFeatures(params: ListFeaturesParams = {}): PaginatedFeatures {
  const {
    page = 1,
    limit = 25,
    status,
    priority,
    assignee,
    pointsMin,
    pointsMax,
    tags,
    sort = "order",
    dir = "asc",
  } = params

  let features = readAllFeatures()

  // ── Filters ──
  if (status && status.length > 0) {
    features = features.filter((f) => status.includes(f.status))
  }
  if (priority && priority.length > 0) {
    features = features.filter((f) => priority.includes(f.priority))
  }
  if (assignee !== undefined) {
    if (assignee === null) {
      features = features.filter((f) => !f.assignee)
    } else {
      features = features.filter((f) => f.assignee === assignee)
    }
  }
  if (pointsMin !== undefined) {
    features = features.filter((f) => f.points != null && f.points >= pointsMin)
  }
  if (pointsMax !== undefined) {
    features = features.filter((f) => f.points != null && f.points <= pointsMax)
  }
  if (tags && tags.length > 0) {
    features = features.filter((f) =>
      tags.some((t) => f.tags.includes(t))
    )
  }

  // ── Sort ──
  features.sort((a, b) => {
    let cmp = 0
    switch (sort) {
      case "order": {
        const oa = a.order ?? Infinity
        const ob = b.order ?? Infinity
        if (oa !== ob) cmp = oa - ob
        else cmp = a.title.localeCompare(b.title)
        break
      }
      case "title":
        cmp = a.title.localeCompare(b.title)
        break
      case "status":
        cmp = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
        break
      case "priority":
        cmp = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
        break
      case "modified":
        cmp = (a.modified ?? "").localeCompare(b.modified ?? "")
        break
    }
    return dir === "asc" ? cmp : -cmp
  })

  const total = features.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * limit
  const paged = features.slice(start, start + limit)

  return { features: paged, total, page: safePage, limit, totalPages }
}

export function getFeature(slug: string): Feature | null {
  const featurePath = path.join(paths.features, slug, "FEATURE.md")
  if (!existsSync(featurePath)) return null

  const { data, content } = parseFrontmatter(featurePath)
  return parseFeature(slug, data, content)
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export interface CreateFeatureInput {
  title: string
  body?: string
  priority?: Priority
  roadmapCardId?: string
}

export function createFeature(input: CreateFeatureInput): Feature {
  const slug = slugify(input.title)
  if (!slug) throw new Error("Invalid feature title")

  const featureDir = path.join(paths.features, slug)
  if (existsSync(featureDir)) {
    throw new Error(`Feature '${slug}' already exists`)
  }

  // Ensure parent features directory exists
  if (!existsSync(paths.features)) {
    mkdirSync(paths.features, { recursive: true })
  }

  mkdirSync(featureDir, { recursive: true })

  const today = new Date().toISOString().slice(0, 10)
  const frontmatter: Record<string, unknown> = {
    title: input.title,
    status: "draft",
    priority: input.priority ?? "medium",
    created: today,
    modified: today,
  }
  if (input.roadmapCardId) {
    frontmatter["roadmap-card"] = input.roadmapCardId
  }

  const body = input.body ?? ""
  const content = matter.stringify(body ? `\n${body}\n` : "", frontmatter)
  const featurePath = path.join(featureDir, "FEATURE.md")
  writeFileSync(featurePath, content, "utf-8")

  return {
    slug,
    title: input.title,
    status: "draft",
    priority: input.priority ?? "medium",
    assignee: null,
    points: null,
    sprint: null,
    tags: [],
    created: today,
    modified: today,
    roadmapCard: input.roadmapCardId ?? null,
    body: body ? `\n${body}\n` : "",
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export interface UpdateFeatureInput {
  title?: string
  status?: FeatureStatus
  priority?: Priority
  assignee?: string | null
  points?: number | null
  tags?: string[]
  body?: string
}

export function updateFeature(slug: string, input: UpdateFeatureInput): Feature | null {
  const existing = getFeature(slug)
  if (!existing) return null

  const today = new Date().toISOString().slice(0, 10)

  const frontmatter: Record<string, unknown> = {
    title: input.title ?? existing.title,
    status: input.status ?? existing.status,
    priority: input.priority ?? existing.priority,
    modified: today,
  }

  // Preserve created date
  if (existing.created) frontmatter.created = existing.created

  // Preserve order
  if (existing.order !== undefined) frontmatter.order = existing.order

  // Handle assignee (explicitly nullable)
  const assignee = input.assignee !== undefined ? input.assignee : existing.assignee
  if (assignee) frontmatter.assignee = assignee

  // Handle points (explicitly nullable)
  const points = input.points !== undefined ? input.points : existing.points
  if (points != null) frontmatter.points = points

  // Handle sprint (preserve existing)
  if (existing.sprint) frontmatter.sprint = existing.sprint

  // Handle tags
  const tags = input.tags !== undefined ? input.tags : existing.tags
  if (tags.length > 0) frontmatter.tags = tags

  // Handle roadmap-card (preserve existing)
  if (existing.roadmapCard) frontmatter["roadmap-card"] = existing.roadmapCard

  const body = input.body !== undefined ? input.body : existing.body
  const content = matter.stringify(body ? `\n${body}\n` : "", frontmatter)
  const featurePath = path.join(paths.features, slug, "FEATURE.md")
  writeFileSync(featurePath, content, "utf-8")

  return {
    slug,
    title: frontmatter.title as string,
    status: frontmatter.status as FeatureStatus,
    priority: frontmatter.priority as Priority,
    assignee: assignee ?? null,
    points: points ?? null,
    sprint: existing.sprint,
    tags,
    created: existing.created,
    modified: today,
    roadmapCard: existing.roadmapCard,
    body: body ? `\n${body}\n` : "",
    order: existing.order,
  }
}

// ---------------------------------------------------------------------------
// Reorder
// ---------------------------------------------------------------------------

/**
 * Reorder features by assigning `order` values based on the provided slug array.
 * Each feature gets order = offset + index. Features not in the array keep their
 * existing order value.
 */
export function reorderFeatures(slugs: string[], offset: number = 0): void {
  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i]
    const feature = getFeature(slug)
    if (!feature) continue

    const newOrder = offset + i

    // Build frontmatter preserving all existing fields
    const frontmatter: Record<string, unknown> = {
      title: feature.title,
      status: feature.status,
      priority: feature.priority,
      modified: feature.modified,
      order: newOrder,
    }
    if (feature.created) frontmatter.created = feature.created
    if (feature.assignee) frontmatter.assignee = feature.assignee
    if (feature.points != null) frontmatter.points = feature.points
    if (feature.sprint) frontmatter.sprint = feature.sprint
    if (feature.tags.length > 0) frontmatter.tags = feature.tags
    if (feature.roadmapCard) frontmatter["roadmap-card"] = feature.roadmapCard

    const content = matter.stringify(feature.body ? `\n${feature.body}\n` : "", frontmatter)
    const featurePath = path.join(paths.features, slug, "FEATURE.md")
    writeFileSync(featurePath, content, "utf-8")
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export function deleteFeature(slug: string): boolean {
  const featureDir = path.join(paths.features, slug)
  if (!existsSync(featureDir)) return false
  rmSync(featureDir, { recursive: true, force: true })
  return true
}

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

export interface FeatureArtifact {
  name: string
  size: number
  type: string
}

function guessFileType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  const types: Record<string, string> = {
    ".md": "markdown",
    ".txt": "text",
    ".png": "image",
    ".jpg": "image",
    ".jpeg": "image",
    ".gif": "image",
    ".svg": "image",
    ".webp": "image",
    ".pdf": "document",
    ".json": "data",
    ".yaml": "data",
    ".yml": "data",
    ".csv": "data",
  }
  return types[ext] ?? "file"
}

export function listFeatureArtifacts(slug: string): FeatureArtifact[] | null {
  const featureDir = path.join(paths.features, slug)
  if (!existsSync(featureDir)) return null

  return readdirSync(featureDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name !== "FEATURE.md")
    .map((entry) => {
      const filePath = path.join(featureDir, entry.name)
      const stats = statSync(filePath)
      return {
        name: entry.name,
        size: stats.size,
        type: guessFileType(entry.name),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}
