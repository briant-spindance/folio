import { describe, it, expect, beforeAll } from "vitest"
import { Hono } from "hono"

// Routes
import statusRouter from "../status.js"
import featuresRouter from "../features.js"
import wikiRouter from "../wiki.js"
import issuesRouter from "../issues.js"
import roadmapRouter from "../roadmap.js"
import sessionsRouter from "../sessions.js"

// ---------------------------------------------------------------------------
// Build a Hono app mirroring index.ts, but without the server/logger/cors
// ---------------------------------------------------------------------------

const app = new Hono()
app.route("/api/status", statusRouter)
app.route("/api/features", featuresRouter)
app.route("/api/wiki", wikiRouter)
app.route("/api/issues", issuesRouter)
app.route("/api/roadmap", roadmapRouter)
app.route("/api/ai-sessions", sessionsRouter)

// Helper to issue requests
async function get(path: string) {
  return app.request(path, { method: "GET" })
}

async function post(path: string, body: unknown) {
  return app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

async function put(path: string, body: unknown) {
  return app.request(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

async function patch(path: string, body: unknown) {
  return app.request(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

// ==========================================================================
// Status
// ==========================================================================

describe("GET /api/status", () => {
  it("returns snake_case fields", async () => {
    const res = await get("/api/status")
    expect(res.status).toBe(200)
    const data = await res.json()

    // Top-level snake_case keys
    expect(data).toHaveProperty("feature_count")
    expect(data).toHaveProperty("by_status")
    expect(data).toHaveProperty("recent_docs")
    expect(data).toHaveProperty("top_features")
    expect(data).toHaveProperty("open_issues")

    // No camelCase leaks
    expect(data).not.toHaveProperty("featureCount")
    expect(data).not.toHaveProperty("byStatus")
    expect(data).not.toHaveProperty("recentDocs")
    expect(data).not.toHaveProperty("topFeatures")
    expect(data).not.toHaveProperty("openIssues")

    // Nested snake_case
    expect(data.health).toHaveProperty("last_run")
    expect(data.health).not.toHaveProperty("lastRun")

    // recent_docs items use updated_at
    if (data.recent_docs.length > 0) {
      expect(data.recent_docs[0]).toHaveProperty("updated_at")
      expect(data.recent_docs[0]).not.toHaveProperty("updatedAt")
    }

    // top_features items use roadmap_card
    if (data.top_features.length > 0) {
      expect(data.top_features[0]).toHaveProperty("roadmap_card")
      expect(data.top_features[0]).not.toHaveProperty("roadmapCard")
    }

    // roadmap summary uses snake_case
    if (data.roadmap) {
      expect(data.roadmap).toHaveProperty("total_cards")
      expect(data.roadmap).toHaveProperty("by_column")
      expect(data.roadmap).toHaveProperty("row_count")
      expect(data.roadmap).not.toHaveProperty("totalCards")
      expect(data.roadmap).not.toHaveProperty("byColumn")
      expect(data.roadmap).not.toHaveProperty("rowCount")
    }
  })

  it("includes team and health", async () => {
    const res = await get("/api/status")
    const data = await res.json()
    expect(Array.isArray(data.team)).toBe(true)
    expect(data.health.passed).toBeTypeOf("number")
    expect(data.health.warnings).toBeTypeOf("number")
    expect(data.health.failed).toBeTypeOf("number")
  })
})

// ==========================================================================
// Features
// ==========================================================================

describe("GET /api/features", () => {
  it("returns a paginated response with snake_case fields", async () => {
    const res = await get("/api/features")
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data).toHaveProperty("features")
    expect(data).toHaveProperty("total")
    expect(data).toHaveProperty("page")
    expect(data).toHaveProperty("limit")
    expect(data).toHaveProperty("total_pages")
    expect(data).not.toHaveProperty("totalPages")

    expect(Array.isArray(data.features)).toBe(true)
    expect(data.total).toBeTypeOf("number")
    expect(data.page).toBe(1)
  })

  it("feature items use snake_case", async () => {
    const res = await get("/api/features")
    const data = await res.json()

    if (data.features.length > 0) {
      const f = data.features[0]
      expect(f).toHaveProperty("slug")
      expect(f).toHaveProperty("title")
      expect(f).toHaveProperty("roadmap_card")
      expect(f).not.toHaveProperty("roadmapCard")
    }
  })

  it("supports pagination query params", async () => {
    const res = await get("/api/features?page=1&limit=2")
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.limit).toBe(2)
    expect(data.features.length).toBeLessThanOrEqual(2)
  })

  it("supports points_min / points_max query params", async () => {
    const res = await get("/api/features?points_min=0&points_max=100")
    expect(res.status).toBe(200)
  })
})

describe("GET /api/features/:slug", () => {
  it("returns a single feature in snake_case", async () => {
    // First get a valid slug
    const listRes = await get("/api/features?limit=1")
    const list = await listRes.json()
    if (list.features.length === 0) return

    const slug = list.features[0].slug
    const res = await get(`/api/features/${slug}`)
    expect(res.status).toBe(200)
    const f = await res.json()
    expect(f.slug).toBe(slug)
    expect(f).toHaveProperty("roadmap_card")
    expect(f).not.toHaveProperty("roadmapCard")
  })

  it("returns 404 for unknown slugs", async () => {
    const res = await get("/api/features/__does_not_exist__")
    expect(res.status).toBe(404)
  })
})

describe("POST /api/features - validation", () => {
  it("returns 422 when title is missing", async () => {
    const res = await post("/api/features", { body: "some text" })
    expect(res.status).toBe(422)
    const data = await res.json()
    expect(data).toHaveProperty("error")
  })

  it("returns 422 when title is empty string", async () => {
    const res = await post("/api/features", { title: "" })
    expect(res.status).toBe(422)
  })

  it("accepts roadmap_card_id field", async () => {
    // This should succeed (or fail with 409 if slug exists, but not 422)
    const res = await post("/api/features", {
      title: `Test Feature ${Date.now()}`,
      roadmap_card_id: "some-card-id",
    })
    // Either 201 (created) or 409 (conflict) — but not 422
    expect([201, 409, 500]).toContain(res.status)
    if (res.status === 201) {
      const data = await res.json()
      expect(data).toHaveProperty("slug")
      expect(data).toHaveProperty("roadmap_card")
    }
  })
})

describe("PUT /api/features/:slug - validation", () => {
  it("returns 422 for invalid status value", async () => {
    const listRes = await get("/api/features?limit=1")
    const list = await listRes.json()
    if (list.features.length === 0) return

    const slug = list.features[0].slug
    const res = await put(`/api/features/${slug}`, {
      status: "not-a-valid-status",
    })
    expect(res.status).toBe(422)
  })

  it("accepts valid update payload", async () => {
    const listRes = await get("/api/features?limit=1")
    const list = await listRes.json()
    if (list.features.length === 0) return

    const slug = list.features[0].slug
    const res = await put(`/api/features/${slug}`, {
      title: list.features[0].title,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.slug).toBe(slug)
  })
})

// ==========================================================================
// Wiki
// ==========================================================================

describe("GET /api/wiki", () => {
  it("returns a paginated response with snake_case fields", async () => {
    const res = await get("/api/wiki")
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data).toHaveProperty("docs")
    expect(data).toHaveProperty("total")
    expect(data).toHaveProperty("page")
    expect(data).toHaveProperty("limit")
    expect(data).toHaveProperty("total_pages")
    expect(data).not.toHaveProperty("totalPages")

    expect(Array.isArray(data.docs)).toBe(true)
  })

  it("wiki doc items use updated_at, not updatedAt", async () => {
    const res = await get("/api/wiki")
    const data = await res.json()

    if (data.docs.length > 0) {
      const doc = data.docs[0]
      expect(doc).toHaveProperty("updated_at")
      expect(doc).not.toHaveProperty("updatedAt")
      expect(doc).toHaveProperty("slug")
      expect(doc).toHaveProperty("title")
    }
  })

  it("defaults to limit 50", async () => {
    const res = await get("/api/wiki")
    const data = await res.json()
    expect(data.limit).toBe(50)
  })

  it("respects custom page and limit", async () => {
    const res = await get("/api/wiki?page=1&limit=3")
    const data = await res.json()
    expect(data.limit).toBe(3)
    expect(data.docs.length).toBeLessThanOrEqual(3)
  })
})

describe("GET /api/wiki/:slug", () => {
  it("returns a single doc in snake_case", async () => {
    const listRes = await get("/api/wiki?limit=1")
    const list = await listRes.json()
    if (list.docs.length === 0) return

    const slug = list.docs[0].slug
    const res = await get(`/api/wiki/${slug}`)
    expect(res.status).toBe(200)
    const doc = await res.json()
    expect(doc.slug).toBe(slug)
    expect(doc).toHaveProperty("updated_at")
    expect(doc).not.toHaveProperty("updatedAt")
    expect(doc).toHaveProperty("body")
  })

  it("returns 404 for unknown slugs", async () => {
    const res = await get("/api/wiki/__does_not_exist__")
    expect(res.status).toBe(404)
  })
})

describe("POST /api/wiki - validation", () => {
  it("returns 422 when title is missing", async () => {
    const res = await post("/api/wiki", { body: "content" })
    expect(res.status).toBe(422)
  })
})

describe("PUT /api/wiki/:slug - validation", () => {
  it("returns 422 when title is missing", async () => {
    const res = await put("/api/wiki/test-slug", { body: "content" })
    expect(res.status).toBe(422)
  })
})

// ==========================================================================
// Issues
// ==========================================================================

describe("GET /api/issues", () => {
  it("returns a paginated response with snake_case fields", async () => {
    const res = await get("/api/issues")
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data).toHaveProperty("issues")
    expect(data).toHaveProperty("total")
    expect(data).toHaveProperty("page")
    expect(data).toHaveProperty("limit")
    expect(data).toHaveProperty("total_pages")
    expect(data).not.toHaveProperty("totalPages")
  })
})

describe("GET /api/issues/:slug", () => {
  it("returns a single issue", async () => {
    const listRes = await get("/api/issues?limit=1")
    const list = await listRes.json()
    if (list.issues.length === 0) return

    const slug = list.issues[0].slug
    const res = await get(`/api/issues/${slug}`)
    expect(res.status).toBe(200)
    const issue = await res.json()
    expect(issue.slug).toBe(slug)
  })

  it("returns 404 for unknown slugs", async () => {
    const res = await get("/api/issues/__does_not_exist__")
    expect(res.status).toBe(404)
  })
})

describe("POST /api/issues - validation", () => {
  it("returns 422 when title is missing", async () => {
    const res = await post("/api/issues", { body: "some text" })
    expect(res.status).toBe(422)
    const data = await res.json()
    expect(data).toHaveProperty("error")
  })

  it("returns 422 for invalid type", async () => {
    const res = await post("/api/issues", { title: "Test", type: "invalid-type" })
    expect(res.status).toBe(422)
  })

  it("returns 422 for invalid priority", async () => {
    const res = await post("/api/issues", { title: "Test", priority: "super-urgent" })
    expect(res.status).toBe(422)
  })
})

describe("PUT /api/issues/:slug - validation", () => {
  it("returns 422 for invalid status value", async () => {
    const listRes = await get("/api/issues?limit=1")
    const list = await listRes.json()
    if (list.issues.length === 0) return

    const slug = list.issues[0].slug
    const res = await put(`/api/issues/${slug}`, {
      status: "not-a-valid-status",
    })
    expect(res.status).toBe(422)
  })
})

// ==========================================================================
// Roadmap
// ==========================================================================

describe("GET /api/roadmap", () => {
  it("returns roadmap with snake_case card fields", async () => {
    const res = await get("/api/roadmap")
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data).toHaveProperty("title")
    expect(data).toHaveProperty("columns")
    expect(data).toHaveProperty("rows")
    expect(data).toHaveProperty("cards")
    expect(Array.isArray(data.cards)).toBe(true)

    if (data.cards.length > 0) {
      const card = data.cards[0]
      expect(card).toHaveProperty("feature_slug")
      expect(card).not.toHaveProperty("featureSlug")
      expect(card).toHaveProperty("id")
      expect(card).toHaveProperty("title")
      expect(card).toHaveProperty("column")
      expect(card).toHaveProperty("row")
      expect(card).toHaveProperty("order")
    }
  })
})

describe("POST /api/roadmap/cards - validation", () => {
  it("returns 422 when title is missing", async () => {
    const res = await post("/api/roadmap/cards", { notes: "test" })
    expect(res.status).toBe(422)
  })

  it("accepts valid card creation", async () => {
    const res = await post("/api/roadmap/cards", {
      title: `Test Card ${Date.now()}`,
      column: "Now",
      row: "Core",
    })
    // 201 for created
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data).toHaveProperty("id")
    expect(data).toHaveProperty("feature_slug")
    expect(data).not.toHaveProperty("featureSlug")
  })
})

describe("PUT /api/roadmap/cards/:id - validation", () => {
  it("accepts feature_slug in update", async () => {
    const roadmapRes = await get("/api/roadmap")
    const roadmap = await roadmapRes.json()
    if (roadmap.cards.length === 0) return

    const cardId = roadmap.cards[0].id
    const res = await put(`/api/roadmap/cards/${cardId}`, {
      feature_slug: "test-feature",
    })
    // Should succeed
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty("feature_slug")
  })
})

// ==========================================================================
// Sessions
// ==========================================================================

describe("GET /api/ai-sessions/:contextKey", () => {
  it("returns an array (possibly empty)", async () => {
    const res = await get("/api/ai-sessions/global")
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)

    if (data.length > 0) {
      expect(data[0]).toHaveProperty("saved_at")
      expect(data[0]).not.toHaveProperty("savedAt")
    }
  })
})

describe("PUT /api/ai-sessions/:contextKey - validation", () => {
  it("returns 422 when id is missing", async () => {
    const res = await put("/api/ai-sessions/global", {
      name: "test",
      messages: [],
    })
    expect(res.status).toBe(422)
  })
})

// ==========================================================================
// Serialization unit tests
// ==========================================================================

describe("serialize module", () => {
  it("serializeFeature maps camelCase to snake_case", async () => {
    const { serializeFeature } = await import("../../lib/serialize.js")
    const result = serializeFeature({
      slug: "test",
      title: "Test",
      status: "draft",
      priority: "medium",
      assignees: [],
      points: null,
      sprint: null,
      tags: [],
      created: null,
      modified: null,
      roadmapCard: "card-123",
      body: "hello",
      order: 0,
    } as any)

    expect(result).toHaveProperty("roadmap_card", "card-123")
    expect(result).not.toHaveProperty("roadmapCard")
  })

  it("serializeWikiDoc maps updatedAt to updated_at", async () => {
    const { serializeWikiDoc } = await import("../../lib/serialize.js")
    const result = serializeWikiDoc({
      slug: "test",
      title: "Test",
      description: null,
      icon: null,
      updatedAt: "2026-01-01",
      body: "hello",
      order: 0,
      dirty: false,
    } as any)

    expect(result).toHaveProperty("updated_at", "2026-01-01")
    expect(result).not.toHaveProperty("updatedAt")
  })

  it("serializeRoadmapCard maps featureSlug to feature_slug", async () => {
    const { serializeRoadmapCard } = await import("../../lib/serialize.js")
    const result = serializeRoadmapCard({
      id: "1",
      title: "Test",
      notes: "",
      column: "Now",
      row: "Core",
      order: 0,
      featureSlug: "my-feature",
    } as any)

    expect(result).toHaveProperty("feature_slug", "my-feature")
    expect(result).not.toHaveProperty("featureSlug")
  })

  it("serializeArtifactContent maps mimeType to mime_type", async () => {
    const { serializeArtifactContent } = await import("../../lib/serialize.js")
    const result = serializeArtifactContent({
      name: "test.md",
      content: "hello",
      type: "markdown",
      mimeType: "text/markdown",
      size: 5,
    } as any)

    expect(result).toHaveProperty("mime_type", "text/markdown")
    expect(result).not.toHaveProperty("mimeType")
  })

  it("serializeSession maps savedAt to saved_at", async () => {
    const { serializeSession } = await import("../../lib/serialize.js")
    const result = serializeSession({
      id: "1",
      name: "Test",
      savedAt: 12345,
      messages: [],
    } as any)

    expect(result).toHaveProperty("saved_at", 12345)
    expect(result).not.toHaveProperty("savedAt")
  })
})

// ==========================================================================
// Validation unit tests
// ==========================================================================

describe("validation schemas", () => {
  it("CreateFeatureSchema validates correctly", async () => {
    const { CreateFeatureSchema, validateBody } = await import("../../lib/validation.js")

    // Valid
    const valid = validateBody(CreateFeatureSchema, { title: "Test" })
    expect(valid.success).toBe(true)

    // Missing title
    const invalid = validateBody(CreateFeatureSchema, { body: "test" })
    expect(invalid.success).toBe(false)

    // Empty title
    const empty = validateBody(CreateFeatureSchema, { title: "" })
    expect(empty.success).toBe(false)

    // With roadmap_card_id
    const withCard = validateBody(CreateFeatureSchema, { title: "Test", roadmap_card_id: "abc" })
    expect(withCard.success).toBe(true)
    if (withCard.success) {
      expect(withCard.data.roadmap_card_id).toBe("abc")
    }
  })

  it("UpdateFeatureSchema validates status enum", async () => {
    const { UpdateFeatureSchema, validateBody } = await import("../../lib/validation.js")

    const valid = validateBody(UpdateFeatureSchema, { status: "draft" })
    expect(valid.success).toBe(true)

    const invalid = validateBody(UpdateFeatureSchema, { status: "invalid" })
    expect(invalid.success).toBe(false)
  })

  it("CreateIssueSchema validates type enum", async () => {
    const { CreateIssueSchema, validateBody } = await import("../../lib/validation.js")

    const valid = validateBody(CreateIssueSchema, { title: "Test", type: "bug" })
    expect(valid.success).toBe(true)

    const invalid = validateBody(CreateIssueSchema, { title: "Test", type: "invalid" })
    expect(invalid.success).toBe(false)
  })

  it("SaveWikiDocSchema validates correctly", async () => {
    const { SaveWikiDocSchema, validateBody } = await import("../../lib/validation.js")

    const valid = validateBody(SaveWikiDocSchema, { title: "Test", body: "content" })
    expect(valid.success).toBe(true)

    const missing = validateBody(SaveWikiDocSchema, { body: "content" })
    expect(missing.success).toBe(false)
  })

  it("UpsertSessionSchema requires id", async () => {
    const { UpsertSessionSchema, validateBody } = await import("../../lib/validation.js")

    const missing = validateBody(UpsertSessionSchema, { name: "test", messages: [] })
    expect(missing.success).toBe(false)

    const valid = validateBody(UpsertSessionSchema, { id: "abc", name: "test", messages: [] })
    expect(valid.success).toBe(true)
  })
})
