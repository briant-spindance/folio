import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync, rmSync, statSync, unlinkSync } from "node:fs"
import path from "node:path"
import matter from "gray-matter"
import { parseFrontmatter } from "../lib/frontmatter.js"
import { paths } from "../lib/paths.js"

export type IssueStatus = "open" | "in-progress" | "closed"
export type IssueType = "bug" | "task" | "improvement" | "chore"
export type Priority = "critical" | "high" | "medium" | "low"

export interface Issue {
  slug: string
  title: string
  status: IssueStatus
  type: IssueType
  priority: Priority
  assignees: string[]
  points: number | null
  sprint: string | null
  feature: string | null
  labels: string[]
  created: string | null
  modified: string | null
  body: string
  order?: number
}

// Priority ordering for sorting (lower index = higher priority)
const PRIORITY_ORDER: Priority[] = ["critical", "high", "medium", "low"]
const STATUS_ORDER: IssueStatus[] = ["open", "in-progress", "closed"]
const TYPE_ORDER: IssueType[] = ["bug", "task", "improvement", "chore"]

function normalizePriority(raw: unknown): Priority {
  const s = String(raw ?? "").toLowerCase()
  if (PRIORITY_ORDER.includes(s as Priority)) return s as Priority
  const n = Number(raw)
  if (!isNaN(n)) {
    if (n <= 1) return "critical"
    if (n <= 3) return "high"
    if (n <= 6) return "medium"
    return "low"
  }
  return "medium"
}

function normalizeStatus(raw: unknown): IssueStatus {
  const s = String(raw ?? "").toLowerCase()
  if (STATUS_ORDER.includes(s as IssueStatus)) return s as IssueStatus
  return "open"
}

function normalizeType(raw: unknown): IssueType {
  const s = String(raw ?? "").toLowerCase()
  if (TYPE_ORDER.includes(s as IssueType)) return s as IssueType
  return "task"
}

function parseAssignees(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  if (raw && typeof raw === "string") return [raw]
  return []
}

function parseLabels(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  return []
}

function parseIssue(slug: string, data: Record<string, unknown>, content: string): Issue {
  return {
    slug,
    title: String(data.title ?? slug),
    status: normalizeStatus(data.status),
    type: normalizeType(data.type),
    priority: normalizePriority(data.priority),
    assignees: parseAssignees(data.assignee ?? data.assignees),
    points: data.points != null ? Number(data.points) : null,
    sprint: data.sprint ? String(data.sprint) : null,
    feature: data.feature ? String(data.feature) : null,
    labels: parseLabels(data.labels),
    created: data.created ? String(data.created) : null,
    modified: data.modified ? String(data.modified) : null,
    body: content,
    order: typeof data.order === "number" ? data.order : undefined,
  }
}

// ---------------------------------------------------------------------------
// Paginated listing
// ---------------------------------------------------------------------------

export interface ListIssuesParams {
  page?: number
  limit?: number
  status?: IssueStatus[]
  type?: IssueType[]
  priority?: Priority[]
  assignee?: string | null  // string = name, null = unassigned filter
  feature?: string | null   // string = feature slug, null = unlinked filter
  pointsMin?: number
  pointsMax?: number
  labels?: string[]
  sort?: "order" | "title" | "status" | "type" | "priority" | "modified"
  dir?: "asc" | "desc"
}

export interface PaginatedIssues {
  issues: Issue[]
  total: number
  page: number
  limit: number
  totalPages: number
}

function readAllIssues(): Issue[] {
  if (!existsSync(paths.issues)) return []

  return readdirSync(paths.issues, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const slug = d.name
      const issuePath = path.join(paths.issues, slug, "ISSUE.md")
      if (!existsSync(issuePath)) return null

      const { data, content } = parseFrontmatter(issuePath)
      return parseIssue(slug, data, content)
    })
    .filter((i): i is Issue => i !== null)
}

export function listIssues(params: ListIssuesParams = {}): PaginatedIssues {
  const {
    page = 1,
    limit = 25,
    status,
    type,
    priority,
    assignee,
    feature,
    pointsMin,
    pointsMax,
    labels,
    sort = "order",
    dir = "asc",
  } = params

  let issues = readAllIssues()

  // ── Filters ──
  if (status && status.length > 0) {
    issues = issues.filter((i) => status.includes(i.status))
  }
  if (type && type.length > 0) {
    issues = issues.filter((i) => type.includes(i.type))
  }
  if (priority && priority.length > 0) {
    issues = issues.filter((i) => priority.includes(i.priority))
  }
  if (assignee !== undefined) {
    if (assignee === null) {
      issues = issues.filter((i) => i.assignees.length === 0)
    } else {
      issues = issues.filter((i) => i.assignees.includes(assignee))
    }
  }
  if (feature !== undefined) {
    if (feature === null) {
      issues = issues.filter((i) => i.feature === null)
    } else {
      issues = issues.filter((i) => i.feature === feature)
    }
  }
  if (pointsMin !== undefined) {
    issues = issues.filter((i) => i.points != null && i.points >= pointsMin)
  }
  if (pointsMax !== undefined) {
    issues = issues.filter((i) => i.points != null && i.points <= pointsMax)
  }
  if (labels && labels.length > 0) {
    issues = issues.filter((i) =>
      labels.some((l) => i.labels.includes(l))
    )
  }

  // ── Sort ──
  issues.sort((a, b) => {
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
      case "type":
        cmp = TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)
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

  const total = issues.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * limit
  const paged = issues.slice(start, start + limit)

  return { issues: paged, total, page: safePage, limit, totalPages }
}

export function getIssue(slug: string): Issue | null {
  const issuePath = path.join(paths.issues, slug, "ISSUE.md")
  if (!existsSync(issuePath)) return null

  const { data, content } = parseFrontmatter(issuePath)
  return parseIssue(slug, data, content)
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

export interface CreateIssueInput {
  title: string
  body?: string
  type?: IssueType
  priority?: Priority
  feature?: string
}

export function createIssue(input: CreateIssueInput): Issue {
  const slug = slugify(input.title)
  if (!slug) throw new Error("Invalid issue title")

  const issueDir = path.join(paths.issues, slug)
  if (existsSync(issueDir)) {
    throw new Error(`Issue '${slug}' already exists`)
  }

  // Ensure parent issues directory exists
  if (!existsSync(paths.issues)) {
    mkdirSync(paths.issues, { recursive: true })
  }

  mkdirSync(issueDir, { recursive: true })

  const today = new Date().toISOString().slice(0, 10)
  const frontmatter: Record<string, unknown> = {
    title: input.title,
    status: "open",
    type: input.type ?? "task",
    priority: input.priority ?? "medium",
    created: today,
    modified: today,
  }
  if (input.feature) {
    frontmatter.feature = input.feature
  }

  const body = input.body ?? ""
  const content = matter.stringify(body ? `\n${body}\n` : "", frontmatter)
  const issuePath = path.join(issueDir, "ISSUE.md")
  writeFileSync(issuePath, content, "utf-8")

  return {
    slug,
    title: input.title,
    status: "open",
    type: input.type ?? "task",
    priority: input.priority ?? "medium",
    assignees: [],
    points: null,
    sprint: null,
    feature: input.feature ?? null,
    labels: [],
    created: today,
    modified: today,
    body: body ? `\n${body}\n` : "",
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export interface UpdateIssueInput {
  title?: string
  status?: IssueStatus
  type?: IssueType
  priority?: Priority
  assignees?: string[]
  points?: number | null
  sprint?: string | null
  feature?: string | null
  labels?: string[]
  body?: string
}

export function updateIssue(slug: string, input: UpdateIssueInput): Issue | null {
  const existing = getIssue(slug)
  if (!existing) return null

  const today = new Date().toISOString().slice(0, 10)

  const frontmatter: Record<string, unknown> = {
    title: input.title ?? existing.title,
    status: input.status ?? existing.status,
    type: input.type ?? existing.type,
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

  // Handle sprint
  const sprint = input.sprint !== undefined ? input.sprint : existing.sprint
  if (sprint) frontmatter.sprint = sprint

  // Handle feature (explicitly nullable)
  const feature = input.feature !== undefined ? input.feature : existing.feature
  if (feature) frontmatter.feature = feature

  // Handle labels
  const labels = input.labels !== undefined ? input.labels : existing.labels
  if (labels.length > 0) frontmatter.labels = labels

  const body = input.body !== undefined ? input.body : existing.body
  const content = matter.stringify(body ? `\n${body}\n` : "", frontmatter)
  const issuePath = path.join(paths.issues, slug, "ISSUE.md")
  writeFileSync(issuePath, content, "utf-8")

  return {
    slug,
    title: frontmatter.title as string,
    status: frontmatter.status as IssueStatus,
    type: frontmatter.type as IssueType,
    priority: frontmatter.priority as Priority,
    assignees,
    points: points ?? null,
    sprint: sprint ?? null,
    feature: feature ?? null,
    labels,
    created: existing.created,
    modified: today,
    body: body ? `\n${body}\n` : "",
    order: existing.order,
  }
}

// ---------------------------------------------------------------------------
// Reorder
// ---------------------------------------------------------------------------

export function reorderIssues(slugs: string[], offset: number = 0): void {
  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i]
    const issue = getIssue(slug)
    if (!issue) continue

    const newOrder = offset + i

    const frontmatter: Record<string, unknown> = {
      title: issue.title,
      status: issue.status,
      type: issue.type,
      priority: issue.priority,
      modified: issue.modified,
      order: newOrder,
    }
    if (issue.created) frontmatter.created = issue.created
    if (issue.assignees.length > 0) frontmatter.assignees = issue.assignees
    if (issue.points != null) frontmatter.points = issue.points
    if (issue.sprint) frontmatter.sprint = issue.sprint
    if (issue.feature) frontmatter.feature = issue.feature
    if (issue.labels.length > 0) frontmatter.labels = issue.labels

    const content = matter.stringify(issue.body ? `\n${issue.body}\n` : "", frontmatter)
    const issuePath = path.join(paths.issues, slug, "ISSUE.md")
    writeFileSync(issuePath, content, "utf-8")
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export function deleteIssue(slug: string): boolean {
  const issueDir = path.join(paths.issues, slug)
  if (!existsSync(issueDir)) return false
  rmSync(issueDir, { recursive: true, force: true })
  return true
}

// ---------------------------------------------------------------------------
// Artifacts (supporting files)
// ---------------------------------------------------------------------------

export interface IssueArtifact {
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

export function listIssueArtifacts(slug: string): IssueArtifact[] | null {
  const issueDir = path.join(paths.issues, slug)
  if (!existsSync(issueDir)) return null

  return readdirSync(issueDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name !== "ISSUE.md")
    .map((entry) => {
      const filePath = path.join(issueDir, entry.name)
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
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\") || filename.includes("\0")) {
    return null
  }
  if (filename === "ISSUE.md") return null

  const issueDir = path.join(paths.issues, slug)
  const filePath = path.join(issueDir, filename)

  const resolved = path.resolve(filePath)
  const resolvedDir = path.resolve(issueDir)
  if (!resolved.startsWith(resolvedDir + path.sep)) return null

  return filePath
}

export function isTextArtifact(filename: string): boolean {
  const type = guessFileType(filename)
  if (TEXT_TYPES.has(type)) return true
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

export function getArtifactFilePath(slug: string, filename: string): { filePath: string; mimeType: string } | null {
  const filePath = safeArtifactPath(slug, filename)
  if (!filePath || !existsSync(filePath)) return null
  return { filePath, mimeType: getMimeType(filename) }
}

export function saveArtifactContent(slug: string, filename: string, content: string): IssueArtifact | null {
  const issueDir = path.join(paths.issues, slug)
  if (!existsSync(issueDir)) return null

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

export function saveArtifactBuffer(slug: string, filename: string, buffer: Buffer): IssueArtifact | null {
  const issueDir = path.join(paths.issues, slug)
  if (!existsSync(issueDir)) return null

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

export function deleteArtifact(slug: string, filename: string): boolean {
  const filePath = safeArtifactPath(slug, filename)
  if (!filePath || !existsSync(filePath)) return false
  unlinkSync(filePath)
  return true
}
