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

export function listWikiDocs(): WikiDoc[] {
  if (!existsSync(paths.wiki)) return []

  return readdirSync(paths.wiki)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const slug = f.replace(/\.md$/, "")
      const filePath = path.join(paths.wiki, f)
      const { data, content } = parseFrontmatter(filePath)
      return {
        slug,
        title: String(data.title ?? slug),
        description: data.description ? String(data.description) : null,
        icon: data.icon ? String(data.icon) : null,
        updatedAt: data.modified ? String(data.modified) : null,
        body: content,
      } satisfies WikiDoc
    })
    .sort((a, b) => a.title.localeCompare(b.title))
}

export function getWikiDoc(slug: string): WikiDoc | null {
  const filePath = path.join(paths.wiki, `${slug}.md`)
  if (!existsSync(filePath)) return null

  const { data, content } = parseFrontmatter(filePath)
  return {
    slug,
    title: String(data.title ?? slug),
    description: data.description ? String(data.description) : null,
    icon: data.icon ? String(data.icon) : null,
    updatedAt: data.modified ? String(data.modified) : null,
    body: content,
  }
}
