import { Hono } from "hono"
import { listFeatures } from "../store/features.js"
import { listWikiDocs } from "../store/wiki.js"
import { listIssues } from "../store/issues.js"
import { listTeam } from "../store/team.js"
import { getRoadmap } from "../store/roadmap.js"

const router = new Hono()

const HEALTH_CHECKS = [
  { level: "pass", message: "Directory structure is valid" },
  { level: "pass", message: "folio.yaml schema is valid" },
  { level: "pass", message: "All features have valid frontmatter" },
  { level: "pass", message: "All issues have valid frontmatter" },
  { level: "pass", message: "Backlog order is valid" },
  { level: "pass", message: "Sprint references are valid" },
  { level: "pass", message: "No duplicate slugs found" },
  { level: "warn", message: "2 features missing assignees" },
  { level: "warn", message: "Sprint 2 has unresolved items" },
  { level: "fail", message: 'Backlog contains orphaned reference: "deleted-feature"' },
] as const

router.get("/", (c) => {
  const features = listFeatures({ limit: 1000 }).features
  const docs = listWikiDocs()
  const issues = listIssues({ limit: 1000 }).issues
  const team = listTeam()
  const roadmap = getRoadmap()

  const byStatus = features.reduce<Record<string, number>>((acc, f) => {
    acc[f.status] = (acc[f.status] ?? 0) + 1
    return acc
  }, {})

  const activeSprint = features.find((f) => f.sprint)?.sprint ?? undefined

  return c.json({
    project: "folio-project",
    feature_count: features.length,
    by_status: byStatus,
    active_sprint: activeSprint,
    recent_docs: docs.slice(0, 6).map(({ slug, title, description, icon, updatedAt }) => ({
      slug, title, description, icon, updated_at: updatedAt,
    })),
    top_features: features.slice(0, 10).map(({ slug, title, status, priority, assignees, points, tags, roadmapCard }) => ({
      slug, title, status, priority, assignees, points, tags, roadmap_card: roadmapCard,
    })),
    open_issues: issues.filter(i => i.status !== "closed").map(({ slug, title, status, type, priority, labels, assignees, points }) => ({
      slug, title, status, type, priority, labels, assignees, points,
    })),
    team: team.map(({ name, role }) => ({
      name,
      role,
      initials: (() => {
        const words = name.trim().split(/\s+/)
        if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
        return name.slice(0, 2).toUpperCase()
      })(),
    })),
    health: {
      passed: HEALTH_CHECKS.filter(c => c.level === "pass").length,
      warnings: HEALTH_CHECKS.filter(c => c.level === "warn").length,
      failed: HEALTH_CHECKS.filter(c => c.level === "fail").length,
      last_run: "Last run: Apr 10, 2026 at 2:32 PM",
      checks: HEALTH_CHECKS,
    },
    roadmap: {
      title: roadmap.title,
      total_cards: roadmap.cards.length,
      columns: roadmap.columns,
      by_column: roadmap.columns.reduce<Record<string, number>>((acc, col) => {
        acc[col] = roadmap.cards.filter((card) => card.column === col).length
        return acc
      }, {}),
      row_count: roadmap.rows.length,
    },
  })
})

export default router
