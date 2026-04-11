import { Hono } from "hono"
import { listFeatures } from "../store/features.js"
import { listWikiDocs } from "../store/wiki.js"

const router = new Hono()

// GET /api/status — dashboard summary
router.get("/", (c) => {
  const features = listFeatures()
  const docs = listWikiDocs()

  const byStatus = features.reduce<Record<string, number>>((acc, f) => {
    acc[f.status] = (acc[f.status] ?? 0) + 1
    return acc
  }, {})

  const activeSprint = features.find((f) => f.sprint)?.sprint ?? undefined

  const recentDocs = docs.slice(0, 6).map(({ slug, title, description, updatedAt }) => ({
    slug, title, description, updatedAt,
  }))

  const topFeatures = features.slice(0, 10).map(({ slug, title, status, priority, assignee, points, tags }) => ({
    slug, title, status, priority, assignee, points, tags,
  }))

  return c.json({
    project: "forge-project",
    featureCount: features.length,
    byStatus,
    teamSize: 4,
    openIssues: 2,
    activeSprint,
    recentDocs,
    topFeatures,
  })
})

export default router
