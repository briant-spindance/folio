import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync, rmSync, statSync, unlinkSync } from "node:fs"
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
  assignees: string[]
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

function parseAssignees(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  if (raw && typeof raw === "string") return [raw]
  return []
}

function parseFeature(slug: string, data: Record<string, unknown>, content: string): Feature {
  return {
    slug,
    title: String(data.title ?? slug),
    status: (data.status as FeatureStatus) ?? "draft",
    priority: normalizePriority(data.priority),
    assignees: parseAssignees(data.assignee ?? data.assignees),
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
      features = features.filter((f) => f.assignees.length === 0)
    } else {
      features = features.filter((f) => f.assignees.includes(assignee))
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
    assignees: [],
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
  assignees?: string[]
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

  // Handle assignees (array)
  const assignees = input.assignees !== undefined ? input.assignees : existing.assignees
  if (assignees.length > 0) frontmatter.assignees = assignees

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
    assignees,
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
    if (feature.assignees.length > 0) frontmatter.assignees = feature.assignees
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

// ---------------------------------------------------------------------------
// Artifact content operations
// ---------------------------------------------------------------------------

const TEXT_TYPES = new Set(["markdown", "text", "data"])

const MIME_TYPES: Record<string, string> = {
  ".md": "text/markdown",
  ".txt": "text/plain",
  ".json": "application/json",
  ".yaml": "application/x-yaml",
  ".yml": "application/x-yaml",
  ".csv": "text/csv",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".ts": "text/plain",
  ".tsx": "text/plain",
  ".jsx": "text/plain",
  ".xml": "application/xml",
  ".sh": "text/x-shellscript",
  ".py": "text/x-python",
  ".rb": "text/x-ruby",
  ".go": "text/x-go",
  ".rs": "text/x-rust",
  ".sql": "text/x-sql",
  ".graphql": "text/plain",
  ".env": "text/plain",
  ".toml": "text/plain",
  ".ini": "text/plain",
  ".conf": "text/plain",
  ".log": "text/plain",
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  return MIME_TYPES[ext] ?? "application/octet-stream"
}

/**
 * Validate an artifact filename to prevent path traversal.
 * Returns the safe absolute path or null if invalid.
 */
function safeArtifactPath(slug: string, filename: string): string | null {
  // Reject obvious attacks
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\") || filename.includes("\0")) {
    return null
  }
  // Must not be FEATURE.md
  if (filename === "FEATURE.md") return null

  const featureDir = path.join(paths.features, slug)
  const filePath = path.join(featureDir, filename)

  // Verify the resolved path is inside the feature directory
  const resolved = path.resolve(filePath)
  const resolvedDir = path.resolve(featureDir)
  if (!resolved.startsWith(resolvedDir + path.sep)) return null

  return filePath
}

export function isTextArtifact(filename: string): boolean {
  const type = guessFileType(filename)
  if (TEXT_TYPES.has(type)) return true
  // Also treat code files as text
  const ext = path.extname(filename).toLowerCase()
  const codeExts = new Set([
    ".js", ".ts", ".tsx", ".jsx", ".html", ".css",
    ".sh", ".py", ".rb", ".go", ".rs", ".sql",
    ".graphql", ".env", ".toml", ".ini", ".conf", ".log",
    ".xml",
  ])
  return codeExts.has(ext)
}

export interface ArtifactContent {
  name: string
  content: string
  type: string
  mimeType: string
  size: number
}

/**
 * Read the content of a text artifact. Returns null if the feature or file
 * doesn't exist, or if the filename is invalid.
 */
export function getArtifactContent(slug: string, filename: string): ArtifactContent | null {
  const filePath = safeArtifactPath(slug, filename)
  if (!filePath || !existsSync(filePath)) return null

  const stats = statSync(filePath)
  const content = readFileSync(filePath, "utf-8")
  return {
    name: filename,
    content,
    type: guessFileType(filename),
    mimeType: getMimeType(filename),
    size: stats.size,
  }
}

/**
 * Get the absolute file path and MIME type of an artifact for raw serving.
 * Returns null if the feature or file doesn't exist, or if the filename is invalid.
 */
export function getArtifactFilePath(slug: string, filename: string): { filePath: string; mimeType: string } | null {
  const filePath = safeArtifactPath(slug, filename)
  if (!filePath || !existsSync(filePath)) return null
  return { filePath, mimeType: getMimeType(filename) }
}

/**
 * Save text content to an artifact file. Creates the file if it doesn't exist.
 */
export function saveArtifactContent(slug: string, filename: string, content: string): FeatureArtifact | null {
  const featureDir = path.join(paths.features, slug)
  if (!existsSync(featureDir)) return null

  const filePath = safeArtifactPath(slug, filename)
  if (!filePath) return null

  writeFileSync(filePath, content, "utf-8")
  const stats = statSync(filePath)
  return {
    name: filename,
    size: stats.size,
    type: guessFileType(filename),
  }
}

/**
 * Save a binary buffer to an artifact file (for uploads).
 */
export function saveArtifactBuffer(slug: string, filename: string, buffer: Buffer): FeatureArtifact | null {
  const featureDir = path.join(paths.features, slug)
  if (!existsSync(featureDir)) return null

  const filePath = safeArtifactPath(slug, filename)
  if (!filePath) return null

  writeFileSync(filePath, buffer)
  const stats = statSync(filePath)
  return {
    name: filename,
    size: stats.size,
    type: guessFileType(filename),
  }
}

/**
 * Delete a single artifact file. Returns false if the file doesn't exist or
 * the filename is invalid.
 */
export function deleteArtifact(slug: string, filename: string): boolean {
  const filePath = safeArtifactPath(slug, filename)
  if (!filePath || !existsSync(filePath)) return false
  unlinkSync(filePath)
  return true
}
