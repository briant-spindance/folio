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
  dirty?: boolean
}

export interface WikiDocDetail {
  slug: string
  title: string
  description: string | null
  icon: string | null
  updatedAt: string | null
  body: string
  dirty?: boolean
}

export interface FeatureSummary {
  slug: string
  title: string
  status: FeatureStatus
  priority?: IssuePriority
  assignee?: string
  points?: number
  tags?: string[]
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
  type: "wiki" | "feature" | "issue"
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
}
