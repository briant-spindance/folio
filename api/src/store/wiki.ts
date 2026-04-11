import { readdirSync, existsSync } from "node:fs"
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
    // Track fenced code blocks and skip their contents entirely
    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    // Stop at a blank line once we've started collecting
    if (paragraphLines.length > 0 && trimmed === "") break
    // Skip headings, HTML, blank lines at the start
    if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith("<")) continue
    paragraphLines.push(trimmed)
  }

  if (paragraphLines.length === 0) return null

  const raw = paragraphLines.join(" ")
  // Strip inline Markdown: bold, italic, code, links, images
  const plain = raw
    .replace(/!\[.*?\]\(.*?\)/g, "")        // images
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1")  // links → text
    .replace(/`([^`]+)`/g, "$1")            // inline code
    .replace(/\*\*([^*]+)\*\*/g, "$1")      // bold
    .replace(/\*([^*]+)\*/g, "$1")          // italic
    .replace(/__([^_]+)__/g, "$1")          // bold alt
    .replace(/_([^_]+)_/g, "$1")            // italic alt
    .replace(/~~([^~]+)~~/g, "$1")          // strikethrough
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
