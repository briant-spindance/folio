import { listWikiDocs } from "../store/wiki.js"
import { listFeatures } from "../store/features.js"
import { listIssues } from "../store/issues.js"
import { getRoadmap } from "../store/roadmap.js"

export interface SearchResult {
  type: "wiki" | "feature" | "issue" | "roadmap"
  slug: string
  title: string
  snippet: string
  status?: string
  assignee?: string
}

export interface SearchResponse {
  query: string
  total: number
  results: SearchResult[]
}

export interface SearchOptions {
  types?: string[]
  limit?: number
}

/**
 * Build a ~80-char snippet around the first occurrence of `query` in `text`.
 * The matched term is wrapped in **bold** markers.
 */
function makeSnippet(text: string, query: string): string {
  const lower = text.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())
  if (idx === -1) return text.slice(0, 80).trimEnd() + (text.length > 80 ? "…" : "")

  const half = 40
  const start = Math.max(0, idx - half)
  const end = Math.min(text.length, idx + query.length + half)
  const before = text.slice(start, idx)
  const match = text.slice(idx, idx + query.length)
  const after = text.slice(idx + query.length, end)

  return (
    (start > 0 ? "…" : "") +
    before +
    `**${match}**` +
    after +
    (end < text.length ? "…" : "")
  )
}

function matchesQuery(values: string[], query: string): string | null {
  const lq = query.toLowerCase()
  for (const v of values) {
    if (v.toLowerCase().includes(lq)) return v
  }
  return null
}

function matchesBodyLine(body: string, query: string): string | null {
  const lq = query.toLowerCase()
  for (const line of body.split("\n")) {
    if (line.toLowerCase().includes(lq)) return line
  }
  return null
}

export function search(query: string, opts: SearchOptions = {}): SearchResponse {
  const types = opts.types && opts.types.length > 0 ? opts.types : ["wiki", "feature", "issue", "roadmap"]
  const limit = opts.limit ?? 20
  const results: SearchResult[] = []

  // --- Wiki docs ---
  if (types.includes("wiki")) {
    for (const doc of listWikiDocs()) {
      if (results.length >= limit) break

      const metaMatch = matchesQuery(
        [doc.slug, doc.title, doc.description ?? ""].filter(Boolean),
        query
      )
      if (metaMatch) {
        results.push({
          type: "wiki",
          slug: doc.slug,
          title: doc.title,
          snippet: makeSnippet(metaMatch, query),
        })
        continue
      }

      const bodyLine = matchesBodyLine(doc.body, query)
      if (bodyLine) {
        results.push({
          type: "wiki",
          slug: doc.slug,
          title: doc.title,
          snippet: makeSnippet(bodyLine.trim(), query),
        })
      }
    }
  }

  // --- Features ---
  if (types.includes("feature")) {
    for (const feat of listFeatures({ limit: 1000 }).features) {
      if (results.length >= limit) break

      const metaValues = [
        feat.slug,
        feat.title,
        feat.status,
        feat.assignee ?? "",
        feat.sprint ?? "",
        ...feat.tags,
      ].filter(Boolean)

      const metaMatch = matchesQuery(metaValues, query)
      if (metaMatch) {
        results.push({
          type: "feature",
          slug: feat.slug,
          title: feat.title,
          snippet: makeSnippet(metaMatch, query),
          status: feat.status,
          assignee: feat.assignee ?? undefined,
        })
        continue
      }

      const bodyLine = matchesBodyLine(feat.body, query)
      if (bodyLine) {
        results.push({
          type: "feature",
          slug: feat.slug,
          title: feat.title,
          snippet: makeSnippet(bodyLine.trim(), query),
          status: feat.status,
          assignee: feat.assignee ?? undefined,
        })
      }
    }
  }

  // --- Issues ---
  if (types.includes("issue")) {
    for (const issue of listIssues()) {
      if (results.length >= limit) break

      const metaValues = [
        issue.slug,
        issue.title,
        issue.status,
        issue.assignee ?? "",
        ...issue.labels,
      ].filter(Boolean)

      const metaMatch = matchesQuery(metaValues, query)
      if (metaMatch) {
        results.push({
          type: "issue",
          slug: issue.slug,
          title: issue.title,
          snippet: makeSnippet(metaMatch, query),
          status: issue.status,
          assignee: issue.assignee ?? undefined,
        })
        continue
      }

      const bodyLine = matchesBodyLine(issue.body, query)
      if (bodyLine) {
        results.push({
          type: "issue",
          slug: issue.slug,
          title: issue.title,
          snippet: makeSnippet(bodyLine.trim(), query),
          status: issue.status,
          assignee: issue.assignee ?? undefined,
        })
      }
    }
  }

  // --- Roadmap cards ---
  if (types.includes("roadmap")) {
    const roadmap = getRoadmap()
    for (const card of roadmap.cards) {
      if (results.length >= limit) break

      const metaMatch = matchesQuery(
        [card.title, card.notes, card.column, card.row].filter(Boolean),
        query
      )
      if (metaMatch) {
        results.push({
          type: "roadmap",
          slug: card.id,
          title: card.title,
          snippet: makeSnippet(metaMatch, query),
        })
      }
    }
  }

  return { query, total: results.length, results }
}
