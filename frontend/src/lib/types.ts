// API response types matching api.md spec

export interface WikiDoc {
  slug: string
  title: string
  description?: string
  body: string
  updatedAt?: string
}

export interface WikiDocSummary {
  slug: string
  title: string
  description?: string
  updatedAt?: string
}

export type FeatureStatus = 'draft' | 'ready' | 'in-progress' | 'review' | 'done'
export type Priority = 'critical' | 'high' | 'medium' | 'low'

export interface Feature {
  slug: string
  title: string
  status: FeatureStatus
  priority: Priority
  assignee?: string
  points?: number
  body: string
  tags?: string[]
  sprint?: string
  createdAt?: string
  updatedAt?: string
}

export interface FeatureSummary {
  slug: string
  title: string
  status: FeatureStatus
  priority: Priority
  assignee?: string
  points?: number
  tags?: string[]
}

export interface StatusResponse {
  project: string
  featureCount: number
  byStatus: Record<string, number>
  teamSize: number
  openIssues: number
  activeSprint?: string
  recentDocs: WikiDocSummary[]
  topFeatures: FeatureSummary[]
}
