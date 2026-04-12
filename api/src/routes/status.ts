import { Hono } from "hono"
import { listFeatures } from "../store/features.js"
import { listWikiDocs } from "../store/wiki.js"
import { listIssues } from "../store/issues.js"
import { listTeam } from "../store/team.js"
import { getRoadmap } from "../store/roadmap.js"

const router = new Hono()

const HEALTH_CHECKS = [
  { level: "pass", message: "Directory structure is valid" },
  { level: "pass", message: "forge.yaml schema is valid" },
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
  const issues = listIssues()
  const team = listTeam()
  const roadmap = getRoadmap()

  const byStatus = features.reduce<Record<string, number>>((acc, f) => {
    acc[f.status] = (acc[f.status] ?? 0) + 1
    return acc
  }, {})

  const activeSprint = features.find((f) => f.sprint)?.sprint ?? undefined

  return c.json({
    project: "forge-project",
    featureCount: features.length,
    byStatus,
    activeSprint,
    recentDocs: docs.slice(0, 6).map(({ slug, title, description, icon, updatedAt }) => ({ slug, title, description, icon, updatedAt })),
    topFeatures: features.slice(0, 10).map(({ slug, title, status, priority, assignees, points, tags }) => ({ slug, title, status, priority, assignees, points, tags })),
    openIssues: issues.filter(i => i.status === "open").map(({ slug, title, status, labels }) => ({ slug, title, status, labels })),
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
      lastRun: "Last run: Apr 10, 2026 at 2:32 PM",
      checks: HEALTH_CHECKS,
    },
    roadmap: {
      title: roadmap.title,
      totalCards: roadmap.cards.length,
      columns: roadmap.columns,
      byColumn: roadmap.columns.reduce<Record<string, number>>((acc, col) => {
        acc[col] = roadmap.cards.filter((card) => card.column === col).length
        return acc
      }, {}),
      rowCount: roadmap.rows.length,
    },
  })
})

export default router
