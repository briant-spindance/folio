import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useStatus() {
  return useQuery({
    queryKey: ['status'],
    queryFn: api.getStatus,
  })
}

export function useFeatures() {
  return useQuery({
    queryKey: ['features'],
    queryFn: api.listFeatures,
  })
}

export function useFeature(slug: string) {
  return useQuery({
    queryKey: ['features', slug],
    queryFn: () => api.getFeature(slug),
    enabled: !!slug,
  })
}

export function useWiki() {
  return useQuery({
    queryKey: ['wiki'],
    queryFn: api.listWiki,
  })
}

export function useWikiDoc(slug: string) {
  return useQuery({
    queryKey: ['wiki', slug],
    queryFn: () => api.getWikiDoc(slug),
    enabled: !!slug,
  })
}
