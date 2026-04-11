import { existsSync } from "node:fs"
import { parseFrontmatter } from "../lib/frontmatter.js"
import { paths } from "../lib/paths.js"

export interface TeamMember {
  name: string
  role: string
  github: string | null
}

export function listTeam(): TeamMember[] {
  if (!existsSync(paths.team)) return []
  const { data } = parseFrontmatter(paths.team)
  const members = data.members
  if (!Array.isArray(members)) return []
  return members.map((m: Record<string, unknown>) => ({
    name: String(m.name ?? ""),
    role: String(m.role ?? ""),
    github: m.github ? String(m.github) : null,
  }))
}
