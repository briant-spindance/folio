import { useQuery } from "@tanstack/react-query"
import { fetchStatus } from "@/lib/api"
import type { StatusResponse } from "@/lib/types"

export function useStatus() {
  return useQuery<StatusResponse>({
    queryKey: ["status"],
    queryFn: fetchStatus,
    staleTime: 30_000,
  })
}
