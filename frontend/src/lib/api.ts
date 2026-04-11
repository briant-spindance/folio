import type { StatusResponse, Feature, FeatureSummary, WikiDoc, WikiDocSummary } from './types'

const BASE = '/api'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} — ${path}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  getStatus: () => get<StatusResponse>('/status'),
  listFeatures: () => get<FeatureSummary[]>('/features'),
  getFeature: (slug: string) => get<Feature>(`/features/${slug}`),
  listWiki: () => get<WikiDocSummary[]>('/wiki'),
  getWikiDoc: (slug: string) => get<WikiDoc>(`/wiki/${slug}`),
}
