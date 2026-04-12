export type FeatureStatus = "draft" | "ready" | "in-progress" | "review" | "done"

export interface GitStatus {
  branch: string | null
  commit: string | null
  dirty: boolean
}

export interface SaveDocPayload {
  title: string
  icon: string | null
  body: string
}


export type IssuePriority = "critical" | "high" | "medium" | "low"

export interface DocSummary {
  slug: string
  title: string
  description?: string | null
  icon?: string | null
  updatedAt?: string | null
  order?: number
  dirty?: boolean
}

export interface WikiDocDetail {
  slug: string
  title: string
  description: string | null
  icon: string | null
  updatedAt: string | null
  body: string
  order?: number
  dirty?: boolean
}

export interface FeatureSummary {
  slug: string
  title: string
  status: FeatureStatus
  priority?: IssuePriority
  assignees?: string[]
  points?: number
  tags?: string[]
  roadmapCard?: string | null
  order?: number
}

export interface FeatureDetail {
  slug: string
  title: string
  status: FeatureStatus
  priority: IssuePriority
  assignees: string[]
  points: number | null
  sprint: string | null
  tags: string[]
  created: string | null
  modified: string | null
  roadmapCard: string | null
  body: string
  order?: number
}

export interface PaginatedFeatures {
  features: FeatureDetail[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface SaveFeaturePayload {
  title?: string
  status?: FeatureStatus
  priority?: IssuePriority
  assignees?: string[]
  points?: number | null
  tags?: string[]
  body?: string
}

export interface FeatureArtifact {
  name: string
  size: number
  type: string
}

export interface ArtifactDetail {
  name: string
  content: string
  type: string
  mimeType: string
  size: number
}

export interface IssueSummary {
  slug: string
  title: string
  status: "open" | "closed"
  labels?: string[]
}

export interface TeamMember {
  name: string
  role: string
  initials: string
}

export interface SearchResult {
  type: "wiki" | "feature" | "issue" | "roadmap"
  slug: string
  title: string
  snippet: string
  status?: string
  assignee?: string
}

export interface SearchResponse {
  query: string
  total: number
  results: SearchResult[]
}

export type HealthLevel = "pass" | "warn" | "fail"

export interface HealthCheck {
  level: HealthLevel
  message: string
}

export interface HealthSummary {
  passed: number
  warnings: number
  failed: number
  lastRun: string
  checks: HealthCheck[]
}

export interface StatusResponse {
  project: string
  featureCount: number
  byStatus: Record<string, number>
  activeSprint?: string
  recentDocs: DocSummary[]
  topFeatures: FeatureSummary[]
  openIssues: IssueSummary[]
  team: TeamMember[]
  health: HealthSummary
  roadmap?: RoadmapStatusSummary
}

// ---------------------------------------------------------------------------
// Roadmap
// ---------------------------------------------------------------------------

export interface RoadmapCard {
  id: string
  title: string
  notes: string
  column: string
  row: string
  order: number
  featureSlug: string | null
}

export interface RoadmapRow {
  label: string
  color: string | null
}

export interface Roadmap {
  title: string
  columns: string[]
  rows: RoadmapRow[]
  cards: RoadmapCard[]
  modified: string | null
}

export interface RoadmapStatusSummary {
  title: string
  totalCards: number
  columns: string[]
  byColumn: Record<string, number>
  rowCount: number
}
