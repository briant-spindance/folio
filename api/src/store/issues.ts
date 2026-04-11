import { readdirSync, existsSync } from "node:fs"
import path from "node:path"
import { parseFrontmatter } from "../lib/frontmatter.js"
import { paths } from "../lib/paths.js"

export interface Issue {
  slug: string
  title: string
  status: string
  labels: string[]
  assignee: string | null
  created: string | null
  modified: string | null
  body: string
}

export function listIssues(): Issue[] {
  if (!existsSync(paths.issues)) return []

  return readdirSync(paths.issues, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const slug = d.name
      const filePath = path.join(paths.issues, slug, "ISSUE.md")
      if (!existsSync(filePath)) return null
      const { data, content } = parseFrontmatter(filePath)
      return {
        slug,
        title: String(data.title ?? slug),
        status: String(data.status ?? "open"),
        labels: Array.isArray(data.labels) ? data.labels.map(String) : [],
        assignee: data.assignee ? String(data.assignee) : null,
        created: data.created ? String(data.created) : null,
        modified: data.modified ? String(data.modified) : null,
        body: content,
      } satisfies Issue
    })
    .filter((i): i is Issue => i !== null)
}
