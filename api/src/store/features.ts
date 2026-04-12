import { readdirSync, existsSync, mkdirSync, writeFileSync } from "node:fs"
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
}

// Priority ordering for sorting (lower index = higher priority)
const PRIORITY_ORDER: Priority[] = ["critical", "high", "medium", "low"]

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

export function listFeatures(): Feature[] {
  if (!existsSync(paths.features)) return []

  return readdirSync(paths.features, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const slug = d.name
      const featurePath = path.join(paths.features, slug, "FEATURE.md")
      if (!existsSync(featurePath)) return null

      const { data, content } = parseFrontmatter(featurePath)
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
      } satisfies Feature
    })
    .filter((f): f is Feature => f !== null)
    .sort((a, b) => {
      return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
    })
}

export function getFeature(slug: string): Feature | null {
  const featurePath = path.join(paths.features, slug, "FEATURE.md")
  if (!existsSync(featurePath)) return null

  const { data, content } = parseFrontmatter(featurePath)
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
  }
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
