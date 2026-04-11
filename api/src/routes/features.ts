import { Hono } from "hono"
import { listFeatures, getFeature } from "../store/features.js"

const router = new Hono()

// GET /api/features
router.get("/", (c) => {
  const features = listFeatures()
  return c.json(features)
})

// GET /api/features/:slug
router.get("/:slug", (c) => {
  const slug = c.req.param("slug")
  const feature = getFeature(slug)
  if (!feature) {
    return c.json({ error: "Feature not found", slug }, 404)
  }
  return c.json(feature)
})

export default router
