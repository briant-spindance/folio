import { Hono } from "hono"
import { streamText, tool, stepCountIs, convertToModelMessages } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import { z } from "zod"
import { listWikiDocs, getWikiDoc, saveWikiDoc } from "../store/wiki.js"
import { listFeatures } from "../store/features.js"

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
  type: "wiki_doc" | "global"
  slug?: string
  title?: string
  body?: string
}

function buildSystemPrompt(context: ChatContext | null): string {
  const wikis = listWikiDocs()
  const features = listFeatures()

  const wikiList = wikis
    .map((d) => `- **${d.title}** (\`${d.slug}\`)${d.description ? `: ${d.description}` : ""}`)
    .join("\n")

  const featureList = features
    .map((f) => `- **${f.title}** [${f.status}]${f.priority ? ` (${f.priority})` : ""}`)
    .join("\n")

  let systemPrompt = `You are an AI assistant embedded in Forge, a project management tool for software teams. You help users read, understand, and author project documentation and plan features.

## Project Knowledge Base

### Wiki Docs
${wikiList || "No wiki docs yet."}

### Features
${featureList || "No features yet."}

## Guidelines
- When asked to write or edit a document, use the available tools — do not just paste the content as a message.
- For targeted edits, prefer \`edit_section\` when only part of a document needs to change.
- For first-time authoring or complete rewrites, use \`replace_document\`.
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

  return systemPrompt
}

// ---------------------------------------------------------------------------
// Route: POST /api/chat
// ---------------------------------------------------------------------------
chatRouter.post("/", async (c) => {
  let body: {
    messages: Array<Record<string, unknown>>
    context?: ChatContext | null
    model?: string
  }

  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400)
  }

  const { messages: rawMessages, context = null, model = DEFAULT_MODEL } = body

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

  const result = streamText({
    model: languageModel,
    system: systemPrompt,
    messages: modelMessages,
    stopWhen: stepCountIs(5),
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

          return {
            ok: true,
            slug: saved.slug,
            heading,
            message: `Successfully updated the "${heading}" section of "${doc.title}".`,
          }
        },
      }),
    },
  })

  return result.toUIMessageStreamResponse()
})

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export default chatRouter
