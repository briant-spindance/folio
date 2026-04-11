import { useQuery } from "@tanstack/react-query"
import { fetchStatus, fetchWikiDocs, fetchWikiDoc } from "@/lib/api"
import type { StatusResponse, WikiDocDetail } from "@/lib/types"

export function useStatus() {
  return useQuery<StatusResponse>({
    queryKey: ["status"],
    queryFn: fetchStatus,
    staleTime: 30_000,
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
