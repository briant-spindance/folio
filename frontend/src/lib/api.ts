import type { StatusResponse, WikiDocDetail, PaginatedDocs, SaveDocPayload, GitStatus, SearchResponse, Roadmap, RoadmapCard, RoadmapRow, FeatureDetail, SaveFeaturePayload, FeatureArtifact, PaginatedFeatures, ArtifactDetail, IssueDetail, PaginatedIssues, SaveIssuePayload, IssueArtifact, IssueArtifactDetail } from "./types"

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

async function apiMutate<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error ?? `API error: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export function fetchStatus(): Promise<StatusResponse> {
  return apiFetch<StatusResponse>("/api/status")
}

export function fetchGitStatus(): Promise<GitStatus> {
  return apiFetch<GitStatus>("/api/git")
}

export function fetchWikiDocs(params: { page?: number; limit?: number } = {}): Promise<PaginatedDocs> {
  const qs = new URLSearchParams()
  if (params.page) qs.set("page", String(params.page))
  if (params.limit) qs.set("limit", String(params.limit))
  const query = qs.toString()
  return apiFetch<PaginatedDocs>(`/api/wiki${query ? `?${query}` : ""}`)
}

export function fetchWikiDoc(slug: string): Promise<WikiDocDetail> {
  return apiFetch<WikiDocDetail>(`/api/wiki/${slug}`)
}

export function saveWikiDoc(slug: string, payload: SaveDocPayload): Promise<WikiDocDetail> {
  return apiMutate<WikiDocDetail>(`/api/wiki/${slug}`, "PUT", payload)
}

export function createWikiDoc(payload: SaveDocPayload): Promise<WikiDocDetail> {
  return apiMutate<WikiDocDetail>("/api/wiki", "POST", payload)
}

export function deleteWikiDoc(slug: string): Promise<{ ok: boolean; slug: string }> {
  return apiMutate(`/api/wiki/${slug}`, "DELETE")
}

export function fetchSearch(q: string, type?: string): Promise<SearchResponse> {
  const params = new URLSearchParams({ q })
  if (type) params.set("type", type)
  return apiFetch<SearchResponse>(`/api/search?${params.toString()}`)
}

export function reorderWikiDocs(slugs: string[]): Promise<{ ok: boolean }> {
  return apiMutate<{ ok: boolean }>("/api/wiki/reorder", "PATCH", { slugs })
}

// ---------------------------------------------------------------------------
// Roadmap
// ---------------------------------------------------------------------------

export function fetchRoadmap(): Promise<Roadmap> {
  return apiFetch<Roadmap>("/api/roadmap")
}

export function saveRoadmap(roadmap: Roadmap): Promise<Roadmap> {
  return apiMutate<Roadmap>("/api/roadmap", "PUT", roadmap)
}

export function createRoadmapCard(card: {
  title: string
  notes?: string
  column: string
  row: string
  order?: number
}): Promise<RoadmapCard> {
  return apiMutate<RoadmapCard>("/api/roadmap/cards", "POST", card)
}

export function updateRoadmapCard(
  id: string,
  updates: Partial<Omit<RoadmapCard, "id">>
): Promise<RoadmapCard> {
  return apiMutate<RoadmapCard>(`/api/roadmap/cards/${id}`, "PUT", updates)
}

export function deleteRoadmapCard(id: string): Promise<{ ok: boolean; id: string }> {
  return apiMutate(`/api/roadmap/cards/${id}`, "DELETE")
}

export function moveRoadmapCard(
  id: string,
  target: { column?: string; row?: string; order?: number }
): Promise<RoadmapCard> {
  return apiMutate<RoadmapCard>(`/api/roadmap/cards/${id}/move`, "PATCH", target)
}

export function addRoadmapRow(label: string, color?: string | null): Promise<RoadmapRow> {
  return apiMutate("/api/roadmap/rows", "POST", { label, color })
}

export function updateRoadmapRow(
  oldLabel: string,
  updates: { label?: string; color?: string | null }
): Promise<RoadmapRow> {
  return apiMutate<RoadmapRow>(`/api/roadmap/rows/${encodeURIComponent(oldLabel)}`, "PUT", updates)
}

export function deleteRoadmapRow(label: string): Promise<{ ok: boolean }> {
  return apiMutate(`/api/roadmap/rows/${encodeURIComponent(label)}`, "DELETE")
}

export function reorderRoadmapRows(labels: string[]): Promise<{ ok: boolean }> {
  return apiMutate("/api/roadmap/rows/reorder", "PATCH", { labels })
}

// Column operations

export function addRoadmapColumn(name: string): Promise<{ columns: string[] }> {
  return apiMutate("/api/roadmap/columns", "POST", { name })
}

export function updateRoadmapColumn(
  oldName: string,
  newName: string
): Promise<{ columns: string[] }> {
  return apiMutate(`/api/roadmap/columns/${encodeURIComponent(oldName)}`, "PUT", { name: newName })
}

export function deleteRoadmapColumn(name: string): Promise<{ ok: boolean }> {
  return apiMutate(`/api/roadmap/columns/${encodeURIComponent(name)}`, "DELETE")
}

export function reorderRoadmapColumns(names: string[]): Promise<{ ok: boolean }> {
  return apiMutate("/api/roadmap/columns/reorder", "PATCH", { names })
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

export interface FetchFeaturesParams {
  page?: number
  limit?: number
  status?: string[]
  priority?: string[]
  assignee?: string | null
  pointsMin?: number
  pointsMax?: number
  tags?: string[]
  sort?: string
  dir?: string
}

export function fetchFeatures(params: FetchFeaturesParams = {}): Promise<PaginatedFeatures> {
  const qs = new URLSearchParams()
  if (params.page) qs.set("page", String(params.page))
  if (params.limit) qs.set("limit", String(params.limit))
  if (params.status && params.status.length > 0) qs.set("status", params.status.join(","))
  if (params.priority && params.priority.length > 0) qs.set("priority", params.priority.join(","))
  if (params.assignee !== undefined) {
    qs.set("assignee", params.assignee === null ? "__unassigned__" : params.assignee)
  }
  if (params.pointsMin !== undefined) qs.set("points_min", String(params.pointsMin))
  if (params.pointsMax !== undefined) qs.set("points_max", String(params.pointsMax))
  if (params.tags && params.tags.length > 0) qs.set("tags", params.tags.join(","))
  if (params.sort) qs.set("sort", params.sort)
  if (params.dir) qs.set("dir", params.dir)
  const query = qs.toString()
  return apiFetch<PaginatedFeatures>(`/api/features${query ? `?${query}` : ""}`)
}

export function reorderFeatures(slugs: string[], offset: number = 0): Promise<{ ok: boolean }> {
  return apiMutate<{ ok: boolean }>("/api/features/reorder", "PATCH", { slugs, offset })
}

export function fetchFeature(slug: string): Promise<FeatureDetail> {
  return apiFetch<FeatureDetail>(`/api/features/${slug}`)
}

export function createFeature(data: {
  title: string
  body?: string
  priority?: string
  roadmap_card_id?: string
}): Promise<FeatureDetail> {
  return apiMutate<FeatureDetail>("/api/features", "POST", data)
}

export function updateFeature(slug: string, payload: SaveFeaturePayload): Promise<FeatureDetail> {
  return apiMutate<FeatureDetail>(`/api/features/${slug}`, "PUT", payload)
}

export function deleteFeature(slug: string): Promise<{ ok: boolean; slug: string }> {
  return apiMutate(`/api/features/${slug}`, "DELETE")
}

export function fetchFeatureArtifacts(slug: string): Promise<FeatureArtifact[]> {
  return apiFetch<FeatureArtifact[]>(`/api/features/${slug}/artifacts`)
}

export function fetchArtifactContent(slug: string, filename: string): Promise<ArtifactDetail> {
  return apiFetch<ArtifactDetail>(`/api/features/${slug}/artifacts/${encodeURIComponent(filename)}`)
}

export function saveArtifactContent(
  slug: string,
  filename: string,
  content: string
): Promise<FeatureArtifact> {
  return apiMutate<FeatureArtifact>(
    `/api/features/${slug}/artifacts/${encodeURIComponent(filename)}`,
    "PUT",
    { content }
  )
}

export function deleteArtifact(
  slug: string,
  filename: string
): Promise<{ ok: boolean; slug: string; filename: string }> {
  return apiMutate(`/api/features/${slug}/artifacts/${encodeURIComponent(filename)}`, "DELETE")
}

export async function uploadArtifact(slug: string, file: File): Promise<FeatureArtifact> {
  const formData = new FormData()
  formData.append("file", file)
  const res = await fetch(`/api/features/${slug}/artifacts/upload`, {
    method: "POST",
    body: formData,
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Upload failed: ${res.status}`)
  }
  return res.json() as Promise<FeatureArtifact>
}

export async function createArtifact(slug: string, filename: string): Promise<FeatureArtifact> {
  return apiMutate<FeatureArtifact>(`/api/features/${slug}/artifacts/create`, "POST", { filename })
}

export function getArtifactRawUrl(slug: string, filename: string): string {
  return `/api/features/${slug}/artifacts/${encodeURIComponent(filename)}?raw`
}

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

export interface FetchIssuesParams {
  page?: number
  limit?: number
  status?: string[]
  type?: string[]
  priority?: string[]
  assignee?: string | null
  feature?: string | null
  pointsMin?: number
  pointsMax?: number
  labels?: string[]
  sort?: string
  dir?: string
}

export function fetchIssues(params: FetchIssuesParams = {}): Promise<PaginatedIssues> {
  const qs = new URLSearchParams()
  if (params.page) qs.set("page", String(params.page))
  if (params.limit) qs.set("limit", String(params.limit))
  if (params.status && params.status.length > 0) qs.set("status", params.status.join(","))
  if (params.type && params.type.length > 0) qs.set("type", params.type.join(","))
  if (params.priority && params.priority.length > 0) qs.set("priority", params.priority.join(","))
  if (params.assignee !== undefined) {
    qs.set("assignee", params.assignee === null ? "__unassigned__" : params.assignee)
  }
  if (params.feature !== undefined) {
    qs.set("feature", params.feature === null ? "__unlinked__" : params.feature)
  }
  if (params.pointsMin !== undefined) qs.set("points_min", String(params.pointsMin))
  if (params.pointsMax !== undefined) qs.set("points_max", String(params.pointsMax))
  if (params.labels && params.labels.length > 0) qs.set("labels", params.labels.join(","))
  if (params.sort) qs.set("sort", params.sort)
  if (params.dir) qs.set("dir", params.dir)
  const query = qs.toString()
  return apiFetch<PaginatedIssues>(`/api/issues${query ? `?${query}` : ""}`)
}

export function reorderIssues(slugs: string[], offset: number = 0): Promise<{ ok: boolean }> {
  return apiMutate<{ ok: boolean }>("/api/issues/reorder", "PATCH", { slugs, offset })
}

export function fetchIssue(slug: string): Promise<IssueDetail> {
  return apiFetch<IssueDetail>(`/api/issues/${slug}`)
}

export function createIssue(data: {
  title: string
  body?: string
  type?: string
  priority?: string
  feature?: string
}): Promise<IssueDetail> {
  return apiMutate<IssueDetail>("/api/issues", "POST", data)
}

export function updateIssue(slug: string, payload: SaveIssuePayload): Promise<IssueDetail> {
  return apiMutate<IssueDetail>(`/api/issues/${slug}`, "PUT", payload)
}

export function deleteIssue(slug: string): Promise<{ ok: boolean; slug: string }> {
  return apiMutate(`/api/issues/${slug}`, "DELETE")
}

export function fetchIssueArtifacts(slug: string): Promise<IssueArtifact[]> {
  return apiFetch<IssueArtifact[]>(`/api/issues/${slug}/artifacts`)
}

export function fetchIssueArtifactContent(slug: string, filename: string): Promise<IssueArtifactDetail> {
  return apiFetch<IssueArtifactDetail>(`/api/issues/${slug}/artifacts/${encodeURIComponent(filename)}`)
}

export function saveIssueArtifactContent(
  slug: string,
  filename: string,
  content: string
): Promise<IssueArtifact> {
  return apiMutate<IssueArtifact>(
    `/api/issues/${slug}/artifacts/${encodeURIComponent(filename)}`,
    "PUT",
    { content }
  )
}

export function deleteIssueArtifact(
  slug: string,
  filename: string
): Promise<{ ok: boolean; slug: string; filename: string }> {
  return apiMutate(`/api/issues/${slug}/artifacts/${encodeURIComponent(filename)}`, "DELETE")
}

export async function uploadIssueArtifact(slug: string, file: File): Promise<IssueArtifact> {
  const formData = new FormData()
  formData.append("file", file)
  const res = await fetch(`/api/issues/${slug}/artifacts/upload`, {
    method: "POST",
    body: formData,
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Upload failed: ${res.status}`)
  }
  return res.json() as Promise<IssueArtifact>
}

export async function createIssueArtifact(slug: string, filename: string): Promise<IssueArtifact> {
  return apiMutate<IssueArtifact>(`/api/issues/${slug}/artifacts/create`, "POST", { filename })
}

export function getIssueArtifactRawUrl(slug: string, filename: string): string {
  return `/api/issues/${slug}/artifacts/${encodeURIComponent(filename)}?raw`
}
