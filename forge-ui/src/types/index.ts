export type WorkflowState = 'draft' | 'ready' | 'in-progress' | 'review' | 'done'
export type IssueStatus = 'open' | 'closed'
export type SprintStatus = 'planning' | 'active' | 'completed'

export interface Feature {
  name: string
  slug: string
  status: WorkflowState
  assignee: string | null
  points: number | null
  backlogPosition: number | null
  sprint: string | null
  body: string
  artifacts: Artifact[]
  createdAt: string
  modifiedAt: string
}

export interface Issue {
  name: string
  slug: string
  status: IssueStatus
  assignee: string | null
  labels: string[]
  linkedFeature: string | null
  sprint: string | null
  body: string
  artifacts: Artifact[]
  createdAt: string
  modifiedAt: string
}

export interface Sprint {
  name: string
  slug: string
  status: SprintStatus
  startDate: string
  endDate: string
  goal: string
  capacity: number | null
  features: string[]
  issues: string[]
  body: string
}

export interface ProjectDoc {
  name: string
  slug: string
  body: string
  modifiedAt: string
}

export interface Review {
  type: string
  slug: string
  description: string
  body: string
}

export interface Artifact {
  name: string
  size: number
}

export interface HealthCheck {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
}

export interface VCSStatus {
  branch: string
  dirty: boolean
  lastCommit: {
    hash: string
    message: string
    author: string
    timestamp: string
  }
}

export interface ForgeConfig {
  workflow: {
    states: WorkflowState[]
  }
  template: {
    source: string
  }
  reviews: {
    types: string[]
  }
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}
