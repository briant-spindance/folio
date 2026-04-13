import { readdirSync, existsSync } from "node:fs"
import path from "node:path"
import { parseFrontmatter } from "../lib/frontmatter.js"
import { paths } from "../lib/paths.js"

export interface ProjectDoc {
  slug: string
  title: string
  icon: string | null
  body: string
  order?: number
}

function buildDoc(slug: string, data: Record<string, unknown>, content: string): ProjectDoc {
  return {
    slug,
    title: String(data.title ?? slug),
    icon: data.icon ? String(data.icon) : null,
    order: typeof data.order === "number" ? data.order : undefined,
    body: content,
  }
}

/** List all project docs (read-only). Sorted by order, then title. */
export function listProjectDocs(): ProjectDoc[] {
  if (!existsSync(paths.projectDocs)) return []

  return readdirSync(paths.projectDocs)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const slug = f.replace(/\.md$/, "")
      const filePath = path.join(paths.projectDocs, f)
      const { data, content } = parseFrontmatter(filePath)
      return buildDoc(slug, data, content)
    })
    .sort((a, b) => {
      const oa = a.order ?? Infinity
      const ob = b.order ?? Infinity
      if (oa !== ob) return oa - ob
      return a.title.localeCompare(b.title)
    })
}

/** Get a single project doc by slug (read-only). */
export function getProjectDoc(slug: string): ProjectDoc | null {
  const filePath = path.join(paths.projectDocs, `${slug}.md`)
  if (!existsSync(filePath)) return null
  const { data, content } = parseFrontmatter(filePath)
  return buildDoc(slug, data, content)
}
