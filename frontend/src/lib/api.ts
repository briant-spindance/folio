import type { StatusResponse, WikiDocDetail, SaveDocPayload, GitStatus, SearchResponse, Roadmap, RoadmapCard, RoadmapRow } from "./types"

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

export function fetchWikiDocs(): Promise<WikiDocDetail[]> {
  return apiFetch<WikiDocDetail[]>("/api/wiki")
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
