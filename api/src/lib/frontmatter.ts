import matter from "gray-matter"
import { readFileSync } from "node:fs"

export interface ParsedDoc {
  data: Record<string, unknown>
  content: string
}

export function parseFrontmatter(filePath: string): ParsedDoc {
  const raw = readFileSync(filePath, "utf-8")
  const { data, content } = matter(raw)
  return { data, content }
}
