import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import {
  fetchStatus,
  fetchGitStatus,
  fetchWikiDocs,
  fetchWikiDoc,
  saveWikiDoc as apiSaveWikiDoc,
  createWikiDoc as apiCreateWikiDoc,
  deleteWikiDoc as apiDeleteWikiDoc,
  reorderWikiDocs as apiReorderWikiDocs,
  fetchSearch,
} from "@/lib/api"
import type { StatusResponse, WikiDocDetail, SaveDocPayload, GitStatus, SearchResponse } from "@/lib/types"

export function useStatus() {
  return useQuery<StatusResponse>({
    queryKey: ["status"],
    queryFn: fetchStatus,
    staleTime: 30_000,
  })
}

export function useGitStatus() {
  return useQuery<GitStatus>({
    queryKey: ["git"],
    queryFn: fetchGitStatus,
    staleTime: 10_000,
    refetchInterval: 15_000,
  })
}

export function useWikiDocs() {
  return useQuery<WikiDocDetail[]>({
    queryKey: ["wiki"],
    queryFn: fetchWikiDocs,
    staleTime: 30_000,
  })
}

export function useWikiDoc(slug: string) {
  return useQuery<WikiDocDetail>({
    queryKey: ["wiki", slug],
    queryFn: () => fetchWikiDoc(slug),
    staleTime: 30_000,
    enabled: !!slug,
  })
}

export function useSaveWikiDoc(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SaveDocPayload) => apiSaveWikiDoc(slug, payload),
    onSuccess: (doc) => {
      qc.setQueryData(["wiki", slug], doc)
      qc.invalidateQueries({ queryKey: ["wiki"] })
      qc.invalidateQueries({ queryKey: ["status"] })
    },
  })
}

export function useCreateWikiDoc() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (payload: SaveDocPayload) => apiCreateWikiDoc(payload),
    onSuccess: (doc) => {
      qc.setQueryData(["wiki", doc.slug], doc)
      qc.invalidateQueries({ queryKey: ["wiki"] })
      qc.invalidateQueries({ queryKey: ["status"] })
      navigate(`/docs/${doc.slug}`)
    },
  })
}

export function useDeleteWikiDoc() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (slug: string) => apiDeleteWikiDoc(slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wiki"] })
      qc.invalidateQueries({ queryKey: ["status"] })
      navigate("/docs")
    },
  })
}

export function useReorderWikiDocs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (slugs: string[]) => apiReorderWikiDocs(slugs),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wiki"] })
      qc.invalidateQueries({ queryKey: ["status"] })
    },
  })
}

export function useSearch(query: string) {
  return useQuery<SearchResponse>({
    queryKey: ["search", query],
    queryFn: () => fetchSearch(query),
    enabled: query.length >= 2,
    staleTime: 10_000,
  })
}
