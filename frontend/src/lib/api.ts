import type { StatusResponse, WikiDocDetail, SaveDocPayload, GitStatus } from "./types"

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
