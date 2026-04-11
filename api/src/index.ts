import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"

import statusRouter from "./routes/status.js"
import featuresRouter from "./routes/features.js"
import wikiRouter from "./routes/wiki.js"

const app = new Hono()

app.use("*", logger())
app.use("*", cors({ origin: "http://localhost:5173" }))

app.route("/api/status", statusRouter)
app.route("/api/features", featuresRouter)
app.route("/api/wiki", wikiRouter)

// Catch-all 501 for unimplemented routes
app.all("/api/*", (c) => {
  return c.json(
    { error: "Not implemented", path: c.req.path },
    501
  )
})

const port = Number(process.env.PORT ?? 3001)

serve({ fetch: app.fetch, port }, () => {
  console.log(`  API server running at http://localhost:${port}`)
  console.log(
    `  Data directory: ${process.env.FORGE_DATA ?? "testdata/forge (default)"}`
  )
})
