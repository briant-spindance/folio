import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"

import statusRouter from "./routes/status.js"
import featuresRouter from "./routes/features.js"
import wikiRouter from "./routes/wiki.js"
import projectDocsRouter from "./routes/project-docs.js"
import gitRouter from "./routes/git.js"
import searchRouter from "./routes/search.js"
import chatRouter from "./routes/chat.js"
import sessionsRouter from "./routes/sessions.js"
import roadmapRouter from "./routes/roadmap.js"
import issuesRouter from "./routes/issues.js"

// ---------------------------------------------------------------------------
// Load .env from api/.env (simple key=value parser, no dependency needed)
// ---------------------------------------------------------------------------
const envPath = resolve(process.cwd(), ".env")
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf-8").split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (key && val && !process.env[key]) {
      process.env[key] = val
    }
  }
}

const app = new Hono()

app.use("*", logger())
app.use("*", cors({ origin: "*" }))

app.route("/api/status", statusRouter)
app.route("/api/features", featuresRouter)
app.route("/api/wiki", wikiRouter)
app.route("/api/project-docs", projectDocsRouter)
app.route("/api/git", gitRouter)
app.route("/api/search", searchRouter)
app.route("/api/roadmap", roadmapRouter)
app.route("/api/issues", issuesRouter)
app.route("/api/chat", chatRouter)
app.route("/api/ai-sessions", sessionsRouter)

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
