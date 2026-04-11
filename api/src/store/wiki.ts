import { readdirSync, existsSync, writeFileSync, unlinkSync } from "node:fs"
import path from "node:path"
import { parseFrontmatter } from "../lib/frontmatter.js"
import { paths } from "../lib/paths.js"

export interface WikiDoc {
  slug: string
  title: string
  description: string | null
  icon: string | null
  updatedAt: string | null
  body: string
}

export interface SaveWikiDocInput {
  title: string
  icon: string | null
  body: string
}

/**
 * Extract a plain-text excerpt from a Markdown body.
 * Skips the leading # Title line, then returns the first non-empty paragraph
 * stripped of inline Markdown syntax, truncated to 160 chars.
 */
function getExcerpt(body: string): string | null {
  const lines = body.trimStart().replace(/^#\s+.+\n?/, "").split("\n")
  const paragraphLines: string[] = []
  let inFence = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    if (paragraphLines.length > 0 && trimmed === "") break
    if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith("<")) continue
    paragraphLines.push(trimmed)
  }

  if (paragraphLines.length === 0) return null

  const raw = paragraphLines.join(" ")
  const plain = raw
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .trim()

  if (plain.length <= 160) return plain
  return plain.slice(0, 157).replace(/\s+\S*$/, "") + "…"
}

function buildDoc(slug: string, data: Record<string, unknown>, content: string): WikiDoc {
  return {
    slug,
    title: String(data.title ?? slug),
    description: data.description ? String(data.description) : getExcerpt(content),
    icon: data.icon ? String(data.icon) : null,
    updatedAt: data.modified ? String(data.modified) : null,
    body: content,
  }
}

export function listWikiDocs(): WikiDoc[] {
  if (!existsSync(paths.wiki)) return []

  return readdirSync(paths.wiki)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const slug = f.replace(/\.md$/, "")
      const filePath = path.join(paths.wiki, f)
      const { data, content } = parseFrontmatter(filePath)
      return buildDoc(slug, data, content)
    })
    .sort((a, b) => a.title.localeCompare(b.title))
}

export function getWikiDoc(slug: string): WikiDoc | null {
  const filePath = path.join(paths.wiki, `${slug}.md`)
  if (!existsSync(filePath)) return null
  const { data, content } = parseFrontmatter(filePath)
  return buildDoc(slug, data, content)
}

/** Derive a URL-safe slug from a title. */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "untitled"
}

/** Find a unique slug, appending -2, -3, … if already taken. */
export function uniqueSlug(base: string, excludeSlug?: string): string {
  const taken = existsSync(paths.wiki)
    ? readdirSync(paths.wiki)
        .filter((f) => f.endsWith(".md"))
        .map((f) => f.replace(/\.md$/, ""))
        .filter((s) => s !== excludeSlug)
    : []

  if (!taken.includes(base)) return base
  let n = 2
  while (taken.includes(`${base}-${n}`)) n++
  return `${base}-${n}`
}

/** Write (create or overwrite) a wiki doc. Sets `modified` to today. */
export function saveWikiDoc(slug: string, input: SaveWikiDocInput): WikiDoc {
  const today = new Date().toISOString().slice(0, 10)
  const icon = input.icon ? `\nicon: ${input.icon}` : ""
  const fileContent = `---\ntitle: ${input.title}\nmodified: "${today}"${icon}\n---\n\n${input.body.trimStart()}\n`
  writeFileSync(path.join(paths.wiki, `${slug}.md`), fileContent, "utf-8")
  return buildDoc(slug, { title: input.title, modified: today, icon: input.icon ?? undefined }, input.body)
}

/** Delete a wiki doc. Returns false if it didn't exist. */
export function deleteWikiDoc(slug: string): boolean {
  const filePath = path.join(paths.wiki, `${slug}.md`)
  if (!existsSync(filePath)) return false
  unlinkSync(filePath)
  return true
}
