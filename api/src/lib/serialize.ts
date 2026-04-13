import type { Feature, PaginatedFeatures, FeatureArtifact, ArtifactContent } from "../store/features.js"
import type { Issue, PaginatedIssues, IssueArtifact, ArtifactContent as IssueArtifactContent } from "../store/issues.js"
import type { WikiDoc } from "../store/wiki.js"
import type { Roadmap, RoadmapCard, RoadmapRow } from "../store/roadmap.js"
import type { ChatSession } from "../store/sessions.js"

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

export function serializeFeature(f: Feature) {
  return {
    slug: f.slug,
    title: f.title,
    status: f.status,
    priority: f.priority,
    assignees: f.assignees,
    points: f.points,
    sprint: f.sprint,
    tags: f.tags,
    created: f.created,
    modified: f.modified,
    roadmap_card: f.roadmapCard,
    body: f.body,
    order: f.order,
  }
}

export function serializePaginatedFeatures(p: PaginatedFeatures) {
  return {
    features: p.features.map(serializeFeature),
    total: p.total,
    page: p.page,
    limit: p.limit,
    total_pages: p.totalPages,
  }
}

export function serializeFeatureArtifact(a: FeatureArtifact) {
  return { name: a.name, size: a.size, type: a.type }
}

export function serializeArtifactContent(a: ArtifactContent) {
  return {
    name: a.name,
    content: a.content,
    type: a.type,
    mime_type: a.mimeType,
    size: a.size,
  }
}

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

export function serializeIssue(i: Issue) {
  return {
    slug: i.slug,
    title: i.title,
    status: i.status,
    type: i.type,
    priority: i.priority,
    assignees: i.assignees,
    points: i.points,
    sprint: i.sprint,
    feature: i.feature,
    labels: i.labels,
    created: i.created,
    modified: i.modified,
    body: i.body,
    order: i.order,
  }
}

export function serializePaginatedIssues(p: PaginatedIssues) {
  return {
    issues: p.issues.map(serializeIssue),
    total: p.total,
    page: p.page,
    limit: p.limit,
    total_pages: p.totalPages,
  }
}

export function serializeIssueArtifact(a: IssueArtifact) {
  return { name: a.name, size: a.size, type: a.type }
}

export function serializeIssueArtifactContent(a: IssueArtifactContent) {
  return {
    name: a.name,
    content: a.content,
    type: a.type,
    mime_type: a.mimeType,
    size: a.size,
  }
}

// ---------------------------------------------------------------------------
// Wiki
// ---------------------------------------------------------------------------

export function serializeWikiDoc(d: WikiDoc) {
  return {
    slug: d.slug,
    title: d.title,
    description: d.description,
    icon: d.icon,
    updated_at: d.updatedAt,
    body: d.body,
    order: d.order,
    dirty: d.dirty,
  }
}

export interface PaginatedWikiDocs {
  docs: ReturnType<typeof serializeWikiDoc>[]
  total: number
  page: number
  limit: number
  total_pages: number
}

// ---------------------------------------------------------------------------
// Roadmap
// ---------------------------------------------------------------------------

export function serializeRoadmapCard(c: RoadmapCard) {
  return {
    id: c.id,
    title: c.title,
    notes: c.notes,
    column: c.column,
    row: c.row,
    order: c.order,
    feature_slug: c.featureSlug,
  }
}

export function serializeRoadmap(r: Roadmap) {
  return {
    title: r.title,
    columns: r.columns,
    rows: r.rows,
    cards: r.cards.map(serializeRoadmapCard),
    modified: r.modified,
  }
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export function serializeSession(s: ChatSession) {
  return {
    id: s.id,
    name: s.name,
    saved_at: s.savedAt,
    messages: s.messages,
  }
}
