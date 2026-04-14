export type FeatureStatus = "draft" | "deferred" | "ready" | "in-progress" | "review" | "done"
export type IssueStatus = "open" | "in-progress" | "closed"
export type IssueType = "bug" | "task" | "improvement" | "chore"

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

export interface ProjectDoc {
  slug: string
  title: string
  icon?: string | null
  body: string
  order: number
}

export interface ProjectDocList {
  docs: ProjectDoc[]
}

export interface DocSummary {
  slug: string
  title: string
  description?: string | null
  icon?: string | null
  updated_at?: string | null
  order?: number
  dirty?: boolean
}

export interface BacklinkRef {
  slug: string
  title: string
}

export interface WikiDocDetail {
  slug: string
  title: string
  description: string | null
  icon: string | null
  aliases: string[]
  updated_at: string | null
  body: string
  order?: number
  dirty?: boolean
  backlinks?: BacklinkRef[]
}

export interface PaginatedDocs {
  docs: WikiDocDetail[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface FeatureSummary {
  slug: string
  title: string
  status: FeatureStatus
  priority?: IssuePriority
  assignees?: string[]
  points?: number
  tags?: string[]
  roadmap_card?: string | null
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
  roadmap_card: string | null
  body: string
  order?: number
}

export interface PaginatedFeatures {
  features: FeatureDetail[]
  total: number
  page: number
  limit: number
  total_pages: number
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
  mime_type: string
  size: number
}

export interface IssueSummary {
  slug: string
  title: string
  status: IssueStatus
  type: IssueType
  priority: IssuePriority
  labels?: string[]
  assignees?: string[]
  points?: number | null
  feature?: string | null
}

export interface IssueDetail {
  slug: string
  title: string
  status: IssueStatus
  type: IssueType
  priority: IssuePriority
  assignees: string[]
  points: number | null
  sprint: string | null
  feature: string | null
  labels: string[]
  created: string | null
  modified: string | null
  body: string
  order?: number
}

export interface PaginatedIssues {
  issues: IssueDetail[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface SaveIssuePayload {
  title?: string
  status?: IssueStatus
  type?: IssueType
  priority?: IssuePriority
  assignees?: string[]
  points?: number | null
  sprint?: string | null
  feature?: string | null
  labels?: string[]
  body?: string
}

export interface IssueArtifact {
  name: string
  size: number
  type: string
}

export interface IssueArtifactDetail {
  name: string
  content: string
  type: string
  mime_type: string
  size: number
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
  last_run: string
  checks: HealthCheck[]
}

export interface StatusResponse {
  project: string
  feature_count: number
  by_status: Record<string, number>
  active_sprint?: string
  recent_docs: DocSummary[]
  recent_wiki: DocSummary[]
  top_features: FeatureSummary[]
  open_issues: IssueSummary[]
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
  feature_slug: string | null
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
  total_cards: number
  columns: string[]
  by_column: Record<string, number>
  row_count: number
}
