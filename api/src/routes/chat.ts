import { Hono } from "hono"
import {
  streamText,
  tool,
  stepCountIs,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import { z } from "zod"
import { listWikiDocs, getWikiDoc, saveWikiDoc } from "../store/wiki.js"
import { listFeatures } from "../store/features.js"
import { getRoadmap, saveRoadmap } from "../store/roadmap.js"
import { mkdirSync, existsSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { paths } from "../lib/paths.js"

const chatRouter = new Hono()

// ---------------------------------------------------------------------------
// Model registry
// ---------------------------------------------------------------------------
export const MODELS = {
  "anthropic/claude-sonnet-4-5": { provider: "anthropic", modelId: "claude-sonnet-4-5" },
  "anthropic/claude-haiku-3-5": { provider: "anthropic", modelId: "claude-haiku-3-5" },
  "openai/gpt-4o": { provider: "openai", modelId: "gpt-4o" },
  "openai/gpt-4o-mini": { provider: "openai", modelId: "gpt-4o-mini" },
} as const

type ModelKey = keyof typeof MODELS
const DEFAULT_MODEL: ModelKey = "anthropic/claude-sonnet-4-5"

function resolveModel(modelKey: string) {
  const entry = MODELS[modelKey as ModelKey] ?? MODELS[DEFAULT_MODEL]
  if (entry.provider === "anthropic") {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    return anthropic(entry.modelId)
  }
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return openai(entry.modelId)
}

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------
interface ChatContext {
  type: "wiki_doc" | "roadmap" | "global"
  slug?: string
  title?: string
  body?: string
}

function buildSystemPrompt(context: ChatContext | null): string {
  const wikis = listWikiDocs()
  const features = listFeatures({ limit: 1000 }).features
  const roadmap = getRoadmap()

  const wikiList = wikis
    .map((d) => `- **${d.title}** (\`${d.slug}\`)${d.description ? `: ${d.description}` : ""}`)
    .join("\n")

  const featureList = features
    .map((f) => `- **${f.title}** [${f.status}]${f.priority ? ` (${f.priority})` : ""}`)
    .join("\n")

  let systemPrompt = `You are an AI assistant embedded in Forge, a project management tool for software teams. You help users read, understand, and author project documentation, plan features, and build roadmaps.

## Project Knowledge Base

### Wiki Docs
${wikiList || "No wiki docs yet."}

### Features
${featureList || "No features yet."}

### Roadmap
${roadmap.rows.length > 0
    ? `Columns: ${roadmap.columns.join(", ")}\nRows: ${roadmap.rows.map((r) => r.label).join(", ")}\nTotal cards: ${roadmap.cards.length}`
    : "No roadmap configured yet."}

## Guidelines
- When asked to write or edit a document, use the available tools — do not just paste the content as a message.
- For targeted edits, prefer \`edit_section\` when only part of a document needs to change.
- For first-time authoring or complete rewrites, use \`replace_document\`.
- When asked to generate a roadmap, use the \`generate_roadmap\` tool.
- When asked to convert a roadmap card to a feature, use the \`convert_to_feature\` tool.
- Always confirm what you did after using a tool.
- Keep your prose concise and professional.
- When writing documentation, match the style and voice of existing docs where possible.`

  if (context?.type === "wiki_doc" && context.slug && context.body) {
    systemPrompt += `

## Current Document Context
You are currently viewing the wiki document **"${context.title ?? context.slug}"** (\`${context.slug}\`).
You have full access to read and write this document.

### Current Content
\`\`\`markdown
${context.body}
\`\`\``
  }

  if (context?.type === "roadmap") {
    systemPrompt += `

## Roadmap Context
You are currently viewing the project roadmap. The roadmap has columns (time horizons): ${roadmap.columns.join(", ")}.
${roadmap.rows.length > 0 ? `Rows (themes/categories): ${roadmap.rows.map((r) => r.label).join(", ")}` : "No rows defined yet."}
${roadmap.cards.length > 0 ? `\nCurrent cards:\n${roadmap.cards.map((c) => `- "${c.title}" [${c.column} / ${c.row}]${c.notes ? ` — ${c.notes}` : ""}`).join("\n")}` : "\nNo cards yet."}

You can generate a full roadmap using the \`generate_roadmap\` tool, or convert individual cards to features using \`convert_to_feature\`.`
  }

  return systemPrompt
}

// ---------------------------------------------------------------------------
// Custom data types sent to the client via the UIMessageStream
// ---------------------------------------------------------------------------
// "doc-preview" — fired during streaming as the AI generates the new body
//   slug:  the doc being written
//   body:  partial body text extracted from the streaming tool input JSON
// "doc-write" — fired after the tool execute saves to disk
//   slug:  the doc that was saved
//   title: the saved doc title
//   body:  the full, final saved body

type DocStreamDataTypes = {
  "doc-preview": { slug: string; body: string }
  "doc-write": { slug: string; title: string; body: string }
}

// ---------------------------------------------------------------------------
// Route: POST /api/chat
// ---------------------------------------------------------------------------
chatRouter.post("/", async (c) => {
  let reqBody: {
    messages: Array<Record<string, unknown>>
    context?: ChatContext | null
    model?: string
  }

  try {
    reqBody = await c.req.json()
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400)
  }

  const { messages: rawMessages, context = null, model = DEFAULT_MODEL } = reqBody

  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return c.json({ error: "messages is required and must be a non-empty array" }, 400)
  }

  // Validate that required API key is present
  const entry = MODELS[model as ModelKey] ?? MODELS[DEFAULT_MODEL]
  if (entry.provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
    return c.json({ error: "ANTHROPIC_API_KEY is not set. Add it to api/.env." }, 500)
  }
  if (entry.provider === "openai" && !process.env.OPENAI_API_KEY) {
    return c.json({ error: "OPENAI_API_KEY is not set. Add it to api/.env." }, 500)
  }

  const languageModel = resolveModel(model)
  const systemPrompt = buildSystemPrompt(context ?? null)

  // AI SDK v6: client sends UIMessage[], convert to ModelMessage[] for streamText
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelMessages = await convertToModelMessages(rawMessages as any[])

  // We use createUIMessageStream so we can write custom data chunks to the
  // stream from within tool execute functions.
  // writerRef is set synchronously before streamText starts so it's always available.
  let writerRef: {
    write: (chunk: {
      type: `data-doc-preview` | `data-doc-write`
      data: DocStreamDataTypes["doc-preview"] | DocStreamDataTypes["doc-write"]
    }) => void
  } | null = null

  // Track accumulated tool-input JSON per tool call id for streaming preview
  const toolInputAccum: Record<string, { toolName: string; accumulated: string }> = {}

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Expose writer to tool execute closures
      writerRef = writer as typeof writerRef

      const result = streamText({
        model: languageModel,
        system: systemPrompt,
        messages: modelMessages,
        stopWhen: stepCountIs(5),

        // Intercept tool-input-delta chunks to stream a live body preview
        onChunk: ({ chunk }) => {
          if (chunk.type === "tool-input-start") {
            const writeTool = chunk.toolName === "replace_document" || chunk.toolName === "edit_section"
            if (writeTool) {
              toolInputAccum[chunk.id] = { toolName: chunk.toolName, accumulated: "" }
            }
          } else if (chunk.type === "tool-input-delta") {
            const acc = toolInputAccum[chunk.id]
            if (!acc) return
            acc.accumulated += chunk.delta

            // Try to extract the relevant streaming field from partial JSON:
            // - replace_document: "body"
            // - edit_section: "newSectionContent"
            const fieldName = acc.toolName === "replace_document" ? "body" : "newSectionContent"
            // Synchronous extraction: scan for the field in the raw JSON text
            const previewBody = extractFieldFast(acc.accumulated, fieldName)
            if (previewBody !== null && writerRef) {
              const slugValue = extractFieldFast(acc.accumulated, "slug") ?? ""
              writerRef.write({
                type: "data-doc-preview",
                data: { slug: slugValue, body: previewBody },
              })
            }
          }
        },

        tools: {
          // ------------------------------------------------------------------
          // replace_document: full doc replacement
          // ------------------------------------------------------------------
          replace_document: tool({
            description:
              "Replace the entire body of a wiki document. Use this for first-time authoring or complete rewrites.",
            inputSchema: z.object({
              slug: z.string().describe("The slug of the wiki doc to replace (e.g. 'project-brief')."),
              title: z.string().describe("The document title."),
              icon: z.string().nullable().optional().describe("Optional lucide icon name (kebab-case)."),
              body: z
                .string()
                .describe(
                  "The full new markdown body for the document. Do NOT include the frontmatter or a leading '# Title' line — that is managed automatically."
                ),
            }),
            execute: async ({ slug, title, icon, body: newBody }: { slug: string; title: string; icon?: string | null; body: string }) => {
              const existing = getWikiDoc(slug)
              if (!existing) {
                return { ok: false, error: `No wiki doc with slug '${slug}' found.` }
              }
              const saved = saveWikiDoc(slug, {
                title,
                icon: icon ?? existing.icon,
                body: newBody,
              })
              // Emit the final saved body so the client can update immediately
              writerRef?.write({
                type: "data-doc-write",
                data: { slug: saved.slug, title: saved.title, body: saved.body },
              })
              return {
                ok: true,
                slug: saved.slug,
                title: saved.title,
                message: `Successfully replaced the document "${title}".`,
              }
            },
          }),

          // ------------------------------------------------------------------
          // edit_section: targeted section edit
          // ------------------------------------------------------------------
          edit_section: tool({
            description:
              "Edit a specific section of a wiki document by heading. Replaces the content between the target heading and the next heading of the same or higher level.",
            inputSchema: z.object({
              slug: z.string().describe("The slug of the wiki doc to edit."),
              heading: z
                .string()
                .describe(
                  "The exact heading text of the section to replace (without the leading # characters, e.g. 'Getting Started')."
                ),
              newSectionContent: z
                .string()
                .describe(
                  "The new markdown content for this section. Include the heading line itself (e.g. '## Getting Started\\n\\nNew content here...')."
                ),
            }),
            execute: async ({ slug, heading, newSectionContent }: { slug: string; heading: string; newSectionContent: string }) => {
              const doc = getWikiDoc(slug)
              if (!doc) {
                return { ok: false, error: `No wiki doc with slug '${slug}' found.` }
              }

              const docBody = doc.body
              const lines = docBody.split("\n")

              // Find the target heading line
              const headingPattern = new RegExp(`^(#{1,6})\\s+${escapeRegex(heading)}\\s*$`)
              let targetLineIdx = -1
              let targetLevel = 0
              for (let i = 0; i < lines.length; i++) {
                const m = lines[i].match(headingPattern)
                if (m) {
                  targetLineIdx = i
                  targetLevel = m[1].length
                  break
                }
              }

              if (targetLineIdx === -1) {
                return {
                  ok: false,
                  error: `Could not find a heading matching "${heading}" in "${slug}".`,
                }
              }

              // Find where the section ends (next heading of same or higher level)
              let endLineIdx = lines.length
              for (let i = targetLineIdx + 1; i < lines.length; i++) {
                const m = lines[i].match(/^(#{1,6})\s/)
                if (m && m[1].length <= targetLevel) {
                  endLineIdx = i
                  break
                }
              }

              const before = lines.slice(0, targetLineIdx).join("\n")
              const after = lines.slice(endLineIdx).join("\n")
              const newBody =
                (before ? before + "\n" : "") +
                newSectionContent.trimEnd() +
                (after ? "\n\n" + after : "")

              const saved = saveWikiDoc(slug, {
                title: doc.title,
                icon: doc.icon,
                body: newBody,
              })

              // Emit the final saved body so the client can update immediately
              writerRef?.write({
                type: "data-doc-write",
                data: { slug: saved.slug, title: saved.title, body: saved.body },
              })

              return {
                ok: true,
                slug: saved.slug,
                heading,
                message: `Successfully updated the "${heading}" section of "${doc.title}".`,
              }
            },
          }),

          // ------------------------------------------------------------------
          // generate_roadmap: AI generates a full roadmap from project docs
          // ------------------------------------------------------------------
          generate_roadmap: tool({
            description:
              "Generate a roadmap by reading existing project docs and features. Creates rows (themes/categories) and cards organized into time-frame columns (now, next, later). Use this when the user asks to create, generate, or build a roadmap.",
            inputSchema: z.object({
              rows: z
                .array(z.object({ label: z.string() }))
                .describe("The rows/themes/categories for the roadmap."),
              cards: z
                .array(
                  z.object({
                    title: z.string().describe("Short title for the idea/initiative."),
                    notes: z.string().describe("Brief description or notes."),
                    column: z.enum(["now", "next", "later"]).describe("Time horizon column."),
                    row: z.string().describe("Which row/theme this card belongs to."),
                    order: z.number().describe("Sort order within the cell (0-based)."),
                  })
                )
                .describe("The roadmap cards to create."),
            }),
            execute: async ({ rows, cards }: { rows: { label: string }[]; cards: { title: string; notes: string; column: string; row: string; order: number }[] }) => {
              const roadmapData = getRoadmap()
              roadmapData.rows = rows.map((r) => ({ ...r, color: null }))
              roadmapData.cards = cards.map((c, i) => ({
                ...c,
                id: Math.random().toString(36).slice(2, 10),
                featureSlug: null,
              }))
              const saved = saveRoadmap(roadmapData)
              return {
                ok: true,
                message: `Generated roadmap with ${rows.length} rows and ${cards.length} cards.`,
                row_count: saved.rows.length,
                card_count: saved.cards.length,
              }
            },
          }),

          // ------------------------------------------------------------------
          // convert_to_feature: create a Feature from a roadmap card
          // ------------------------------------------------------------------
          convert_to_feature: tool({
            description:
              "Convert a roadmap card into a concrete Feature by creating a feature directory with FEATURE.md. Use this when the user asks to turn a roadmap idea into a feature.",
            inputSchema: z.object({
              cardId: z.string().describe("The ID of the roadmap card to convert."),
              status: z
                .enum(["draft", "deferred", "ready", "in-progress", "review", "done"])
                .optional()
                .describe("Initial status for the feature. Defaults to 'draft'."),
              priority: z
                .enum(["critical", "high", "medium", "low"])
                .optional()
                .describe("Priority for the feature. Defaults to 'medium'."),
            }),
            execute: async ({ cardId, status, priority }: { cardId: string; status?: string; priority?: string }) => {
              const roadmapData = getRoadmap()
              const card = roadmapData.cards.find((c) => c.id === cardId)
              if (!card) {
                return { ok: false, error: `No roadmap card with id '${cardId}' found.` }
              }

              // Create a slug from the card title
              const slug = card.title
                .toLowerCase()
                .replace(/[^\w\s-]/g, "")
                .replace(/\s+/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "") || "untitled"

              const featureDir = join(paths.features, slug)
              if (existsSync(featureDir)) {
                return { ok: false, error: `Feature directory '${slug}' already exists.` }
              }

              const today = new Date().toISOString().slice(0, 10)
              const featureContent = `---
title: ${card.title}
status: ${status ?? "draft"}
priority: ${priority ?? "medium"}
created: "${today}"
modified: "${today}"
tags: []
---

${card.notes || "No description yet."}
`
              mkdirSync(featureDir, { recursive: true })
              writeFileSync(join(featureDir, "FEATURE.md"), featureContent, "utf-8")

              return {
                ok: true,
                slug,
                title: card.title,
                message: `Created feature "${card.title}" from roadmap card.`,
              }
            },
          }),
        },
      })

      // Merge the streamText output into our custom UIMessageStream
      writer.merge(result.toUIMessageStream())
    },
  })

  return createUIMessageStreamResponse({ stream })
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Fast synchronous extraction of a JSON string field value from partial JSON text.
 * Looks for `"fieldName": "value` (where value may be incomplete) in the raw text.
 * Returns the decoded string value extracted so far, or null if the field hasn't appeared yet.
 */
function extractFieldFast(partialJson: string, fieldName: string): string | null {
  // Match: "fieldName"  :  " ... (opening of the string value)
  const keyPattern = new RegExp(`"${fieldName}"\\s*:\\s*"`)
  const keyMatch = keyPattern.exec(partialJson)
  if (!keyMatch) return null

  // Everything after the opening quote of the value
  const after = partialJson.slice(keyMatch.index + keyMatch[0].length)

  // Decode JSON string content, stopping at an unescaped closing quote
  let result = ""
  let i = 0
  while (i < after.length) {
    const ch = after[i]
    if (ch === '"') break // end of string
    if (ch === "\\") {
      i++
      if (i >= after.length) break
      const escaped = after[i]
      switch (escaped) {
        case '"': result += '"'; break
        case "\\": result += "\\"; break
        case "/": result += "/"; break
        case "n": result += "\n"; break
        case "r": result += "\r"; break
        case "t": result += "\t"; break
        case "b": result += "\b"; break
        case "f": result += "\f"; break
        case "u": {
          const hex = after.slice(i + 1, i + 5)
          if (hex.length === 4) {
            result += String.fromCharCode(parseInt(hex, 16))
            i += 4
          }
          break
        }
        default: result += escaped
      }
    } else {
      result += ch
    }
    i++
  }
  return result || null
}

export default chatRouter
