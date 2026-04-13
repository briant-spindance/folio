import { z } from "zod"

// ---------------------------------------------------------------------------
// Shared enum schemas
// ---------------------------------------------------------------------------

export const FeatureStatusSchema = z.enum(["draft", "deferred", "ready", "in-progress", "review", "done"])
export const IssueStatusSchema = z.enum(["open", "in-progress", "closed"])
export const IssueTypeSchema = z.enum(["bug", "task", "improvement", "chore"])
export const PrioritySchema = z.enum(["critical", "high", "medium", "low"])

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

export const CreateFeatureSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().optional(),
  priority: PrioritySchema.optional(),
  roadmap_card_id: z.string().optional(),
})

export const UpdateFeatureSchema = z.object({
  title: z.string().min(1).optional(),
  status: FeatureStatusSchema.optional(),
  priority: PrioritySchema.optional(),
  assignees: z.array(z.string()).optional(),
  points: z.number().nullable().optional(),
  tags: z.array(z.string()).optional(),
  body: z.string().optional(),
})

export const ReorderSchema = z.object({
  slugs: z.array(z.string()),
  offset: z.number().optional(),
})

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

export const CreateIssueSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().optional(),
  type: IssueTypeSchema.optional(),
  priority: PrioritySchema.optional(),
  feature: z.string().optional(),
})

export const UpdateIssueSchema = z.object({
  title: z.string().min(1).optional(),
  status: IssueStatusSchema.optional(),
  type: IssueTypeSchema.optional(),
  priority: PrioritySchema.optional(),
  assignees: z.array(z.string()).optional(),
  points: z.number().nullable().optional(),
  sprint: z.string().nullable().optional(),
  feature: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
  body: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Wiki
// ---------------------------------------------------------------------------

export const SaveWikiDocSchema = z.object({
  title: z.string().min(1, "Title is required"),
  icon: z.string().nullable().optional(),
  body: z.string().default(""),
})

export const ReorderSlugsSchema = z.object({
  slugs: z.array(z.string()),
})

// ---------------------------------------------------------------------------
// Roadmap
// ---------------------------------------------------------------------------

export const CreateCardSchema = z.object({
  title: z.string().min(1, "Title is required"),
  notes: z.string().optional(),
  column: z.string().optional(),
  row: z.string().optional(),
  order: z.number().optional(),
})

export const UpdateCardSchema = z.object({
  title: z.string().optional(),
  notes: z.string().optional(),
  column: z.string().optional(),
  row: z.string().optional(),
  order: z.number().optional(),
  feature_slug: z.string().nullable().optional(),
})

export const MoveCardSchema = z.object({
  column: z.string().optional(),
  row: z.string().optional(),
  order: z.number().optional(),
})

export const CreateRowSchema = z.object({
  label: z.string().min(1, "Label is required"),
  color: z.string().nullable().optional(),
})

export const UpdateRowSchema = z.object({
  label: z.string().optional(),
  color: z.string().nullable().optional(),
})

export const ReorderLabelsSchema = z.object({
  labels: z.array(z.string()),
})

export const CreateColumnSchema = z.object({
  name: z.string().min(1, "Name is required"),
})

export const ReorderNamesSchema = z.object({
  names: z.array(z.string()),
})

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export const UpsertSessionSchema = z.object({
  id: z.string().min(1, "ID is required"),
  name: z.string().optional(),
  saved_at: z.number().optional(),
  messages: z.array(z.unknown()),
})

// ---------------------------------------------------------------------------
// Artifact
// ---------------------------------------------------------------------------

export const CreateArtifactSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
})

export const SaveArtifactContentSchema = z.object({
  content: z.string(),
})

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

/**
 * Parse and validate a request body against a Zod schema.
 * Returns { success: true, data } or { success: false, error } with a formatted message.
 */
export function validateBody<T extends z.ZodType>(
  schema: T,
  body: unknown,
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(body)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const messages = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
  return { success: false, error: messages }
}
