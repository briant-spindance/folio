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
  fetchProjectDocs,
  fetchProjectDoc,
  fetchSearch,
  fetchRoadmap,
  saveRoadmap as apiSaveRoadmap,
  createRoadmapCard as apiCreateRoadmapCard,
  updateRoadmapCard as apiUpdateRoadmapCard,
  deleteRoadmapCard as apiDeleteRoadmapCard,
  moveRoadmapCard as apiMoveRoadmapCard,
  addRoadmapRow as apiAddRoadmapRow,
  updateRoadmapRow as apiUpdateRoadmapRow,
  deleteRoadmapRow as apiDeleteRoadmapRow,
  reorderRoadmapRows as apiReorderRoadmapRows,
  addRoadmapColumn as apiAddRoadmapColumn,
  updateRoadmapColumn as apiUpdateRoadmapColumn,
  deleteRoadmapColumn as apiDeleteRoadmapColumn,
  fetchFeatures,
  fetchFeature,
  createFeature as apiCreateFeature,
  updateFeature as apiUpdateFeature,
  deleteFeature as apiDeleteFeature,
  fetchFeatureArtifacts,
  reorderFeatures as apiReorderFeatures,
  fetchArtifactContent,
  saveArtifactContent as apiSaveArtifactContent,
  deleteArtifact as apiDeleteArtifact,
  uploadArtifact as apiUploadArtifact,
  createArtifact as apiCreateArtifact,
  fetchIssues,
  fetchIssue,
  createIssue as apiCreateIssue,
  updateIssue as apiUpdateIssue,
  deleteIssue as apiDeleteIssue,
  fetchIssueArtifacts,
  reorderIssues as apiReorderIssues,
  fetchIssueArtifactContent,
  saveIssueArtifactContent as apiSaveIssueArtifactContent,
  deleteIssueArtifact as apiDeleteIssueArtifact,
  uploadIssueArtifact as apiUploadIssueArtifact,
  createIssueArtifact as apiCreateIssueArtifact,
  fetchProjects,
  activateProject as apiActivateProject,
  getActiveProjectSlug,
  setActiveProjectSlug,
} from "@/lib/api"
import type { FetchFeaturesParams, FetchIssuesParams } from "@/lib/api"
import type { StatusResponse, WikiDocDetail, PaginatedDocs, SaveDocPayload, GitStatus, SearchResponse, Roadmap, RoadmapCard, FeatureDetail, SaveFeaturePayload, FeatureArtifact, PaginatedFeatures, ArtifactDetail, IssueDetail, SaveIssuePayload, PaginatedIssues, IssueArtifact, IssueArtifactDetail, ProjectDocList, ProjectDoc, ProjectListResponse } from "@/lib/types"

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export function useProjects() {
  return useQuery<ProjectListResponse>({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    staleTime: 30_000,
  })
}

export function useActivateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (slug: string) => {
      setActiveProjectSlug(slug)
      return apiActivateProject(slug)
    },
    onSuccess: () => {
      // Invalidate everything — the project context has changed.
      qc.invalidateQueries()
    },
  })
}

// Helper: returns the active project slug for use in query keys.
function projectKey(): string {
  return getActiveProjectSlug() ?? "unknown"
}

// ---------------------------------------------------------------------------
// Status & Git
// ---------------------------------------------------------------------------

export function useStatus() {
  return useQuery<StatusResponse>({
    queryKey: ["status", projectKey()],
    queryFn: fetchStatus,
    staleTime: 30_000,
  })
}

export function useGitStatus() {
  return useQuery<GitStatus>({
    queryKey: ["git", projectKey()],
    queryFn: fetchGitStatus,
    staleTime: 10_000,
    refetchInterval: 15_000,
  })
}

// ---------------------------------------------------------------------------
// Wiki
// ---------------------------------------------------------------------------

export function useWikiDocs(params: { page?: number; limit?: number } = {}) {
  return useQuery<PaginatedDocs>({
    queryKey: ["wiki", projectKey(), params],
    queryFn: () => fetchWikiDocs(params),
    staleTime: 30_000,
  })
}

export function useWikiDoc(slug: string) {
  return useQuery<WikiDocDetail>({
    queryKey: ["wiki", projectKey(), slug],
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
      qc.setQueryData(["wiki", projectKey(), slug], doc)
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
      qc.setQueryData(["wiki", projectKey(), doc.slug], doc)
      qc.invalidateQueries({ queryKey: ["wiki"] })
      qc.invalidateQueries({ queryKey: ["status"] })
      navigate(`/wiki/${doc.slug}`)
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
      navigate("/wiki")
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

// ---------------------------------------------------------------------------
// Project Docs (read-only reference documents)
// ---------------------------------------------------------------------------

export function useProjectDocs() {
  return useQuery<ProjectDocList>({
    queryKey: ["project-docs", projectKey()],
    queryFn: fetchProjectDocs,
    staleTime: 30_000,
  })
}

export function useProjectDoc(slug: string) {
  return useQuery<ProjectDoc>({
    queryKey: ["project-docs", projectKey(), slug],
    queryFn: () => fetchProjectDoc(slug),
    staleTime: 30_000,
    enabled: !!slug,
  })
}

export function useSearch(query: string) {
  return useQuery<SearchResponse>({
    queryKey: ["search", projectKey(), query],
    queryFn: () => fetchSearch(query),
    enabled: query.length >= 2,
    staleTime: 10_000,
  })
}

// ---------------------------------------------------------------------------
// Roadmap
// ---------------------------------------------------------------------------

export function useRoadmap() {
  return useQuery<Roadmap>({
    queryKey: ["roadmap", projectKey()],
    queryFn: fetchRoadmap,
    staleTime: 30_000,
  })
}

export function useSaveRoadmap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (roadmap: Roadmap) => apiSaveRoadmap(roadmap),
    onSuccess: (data) => {
      qc.setQueryData(["roadmap", projectKey()], data)
      qc.invalidateQueries({ queryKey: ["status"] })
    },
  })
}

export function useCreateRoadmapCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (card: { title: string; notes?: string; column: string; row: string; order?: number }) =>
      apiCreateRoadmapCard(card),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap"] })
      qc.invalidateQueries({ queryKey: ["status"] })
    },
  })
}

export function useUpdateRoadmapCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<RoadmapCard, "id">> }) =>
      apiUpdateRoadmapCard(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap"] })
      qc.invalidateQueries({ queryKey: ["status"] })
    },
  })
}

export function useDeleteRoadmapCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDeleteRoadmapCard(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap"] })
      qc.invalidateQueries({ queryKey: ["status"] })
    },
  })
}

export function useMoveRoadmapCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, target }: { id: string; target: { column?: string; row?: string; order?: number } }) =>
      apiMoveRoadmapCard(id, target),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap"] })
      qc.invalidateQueries({ queryKey: ["status"] })
    },
  })
}

export function useAddRoadmapRow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ label, color }: { label: string; color?: string | null }) =>
      apiAddRoadmapRow(label, color),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap"] })
      qc.invalidateQueries({ queryKey: ["status"] })
    },
  })
}

export function useUpdateRoadmapRow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ oldLabel, updates }: { oldLabel: string; updates: { label?: string; color?: string | null } }) =>
      apiUpdateRoadmapRow(oldLabel, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap"] })
      qc.invalidateQueries({ queryKey: ["status"] })
    },
  })
}

export function useDeleteRoadmapRow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (label: string) => apiDeleteRoadmapRow(label),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap"] })
      qc.invalidateQueries({ queryKey: ["status"] })
    },
  })
}

export function useReorderRoadmapRows() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (labels: string[]) => apiReorderRoadmapRows(labels),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap"] })
      qc.invalidateQueries({ queryKey: ["status"] })
    },
  })
}

export function useAddRoadmapColumn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => apiAddRoadmapColumn(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap"] })
      qc.invalidateQueries({ queryKey: ["status"] })
    },
  })
}

export function useUpdateRoadmapColumn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ oldName, newName }: { oldName: string; newName: string }) =>
      apiUpdateRoadmapColumn(oldName, newName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap"] })
      qc.invalidateQueries({ queryKey: ["status"] })
    },
  })
}

export function useDeleteRoadmapColumn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => apiDeleteRoadmapColumn(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roadmap"] })
      qc.invalidateQueries({ queryKey: ["status"] })
    },
  })
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

export function useFeatures(params: FetchFeaturesParams = {}) {
  return useQuery<PaginatedFeatures>({
    queryKey: ["features", projectKey(), params],
    queryFn: () => fetchFeatures(params),
    staleTime: 30_000,
  })
}

export function useFeature(slug: string) {
  return useQuery<FeatureDetail>({
    queryKey: ["features", projectKey(), slug],
    queryFn: () => fetchFeature(slug),
    staleTime: 30_000,
    enabled: !!slug,
  })
}

export function useCreateFeature() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (data: { title: string; body?: string; priority?: string; roadmap_card_id?: string }) =>
      apiCreateFeature(data),
    onSuccess: (feature) => {
      qc.setQueryData(["features", projectKey(), feature.slug], feature)
      qc.invalidateQueries({ queryKey: ["roadmap"] })
      qc.invalidateQueries({ queryKey: ["features"] })
      qc.invalidateQueries({ queryKey: ["status"] })
      navigate(`/features/${feature.slug}`)
    },
  })
}

export function useSaveFeature(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SaveFeaturePayload) => apiUpdateFeature(slug, payload),
    onSuccess: (feature) => {
      qc.setQueryData(["features", projectKey(), slug], feature)
      qc.invalidateQueries({ queryKey: ["features"] })
      qc.invalidateQueries({ queryKey: ["status"] })
    },
  })
}

export function useDeleteFeature() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (slug: string) => apiDeleteFeature(slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["features"] })
      qc.invalidateQueries({ queryKey: ["status"] })
      navigate("/features")
    },
  })
}

export function useFeatureArtifacts(slug: string) {
  return useQuery<FeatureArtifact[]>({
    queryKey: ["features", projectKey(), slug, "artifacts"],
    queryFn: () => fetchFeatureArtifacts(slug),
    staleTime: 30_000,
    enabled: !!slug,
  })
}

export function useReorderFeatures() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ slugs, offset }: { slugs: string[]; offset: number }) =>
      apiReorderFeatures(slugs, offset),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["features"] })
      qc.invalidateQueries({ queryKey: ["status"] })
    },
  })
}

export function useArtifactContent(slug: string, filename: string) {
  return useQuery<ArtifactDetail>({
    queryKey: ["features", projectKey(), slug, "artifacts", filename],
    queryFn: () => fetchArtifactContent(slug, filename),
    staleTime: 30_000,
    enabled: !!slug && !!filename,
  })
}

export function useSaveArtifact(slug: string, filename: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => apiSaveArtifactContent(slug, filename, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["features", projectKey(), slug, "artifacts", filename] })
      qc.invalidateQueries({ queryKey: ["features", projectKey(), slug, "artifacts"] })
    },
  })
}

export function useDeleteArtifact(slug: string) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (filename: string) => apiDeleteArtifact(slug, filename),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["features", projectKey(), slug, "artifacts"] })
      navigate(`/features/${slug}`)
    },
  })
}

export function useUploadArtifact(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => apiUploadArtifact(slug, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["features", projectKey(), slug, "artifacts"] })
    },
  })
}

export function useCreateArtifact(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (filename: string) => apiCreateArtifact(slug, filename),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["features", projectKey(), slug, "artifacts"] })
    },
  })
}

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

export function useIssues(params: FetchIssuesParams = {}) {
  return useQuery<PaginatedIssues>({
    queryKey: ["issues", projectKey(), params],
    queryFn: () => fetchIssues(params),
    staleTime: 30_000,
  })
}

export function useIssue(slug: string) {
  return useQuery<IssueDetail>({
    queryKey: ["issues", projectKey(), slug],
    queryFn: () => fetchIssue(slug),
    staleTime: 30_000,
    enabled: !!slug,
  })
}

export function useCreateIssue() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (data: { title: string; body?: string; type?: string; priority?: string; feature?: string }) =>
      apiCreateIssue(data),
    onSuccess: (issue) => {
      qc.setQueryData(["issues", projectKey(), issue.slug], issue)
      qc.invalidateQueries({ queryKey: ["issues"] })
      qc.invalidateQueries({ queryKey: ["status"] })
      navigate(`/issues/${issue.slug}`)
    },
  })
}

export function useSaveIssue(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SaveIssuePayload) => apiUpdateIssue(slug, payload),
    onSuccess: (issue) => {
      qc.setQueryData(["issues", projectKey(), slug], issue)
      qc.invalidateQueries({ queryKey: ["issues"] })
      qc.invalidateQueries({ queryKey: ["status"] })
    },
  })
}

export function useDeleteIssue() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (slug: string) => apiDeleteIssue(slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issues"] })
      qc.invalidateQueries({ queryKey: ["status"] })
      navigate("/issues")
    },
  })
}

export function useIssueArtifacts(slug: string) {
  return useQuery<IssueArtifact[]>({
    queryKey: ["issues", projectKey(), slug, "artifacts"],
    queryFn: () => fetchIssueArtifacts(slug),
    staleTime: 30_000,
    enabled: !!slug,
  })
}

export function useReorderIssues() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ slugs, offset }: { slugs: string[]; offset: number }) =>
      apiReorderIssues(slugs, offset),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issues"] })
      qc.invalidateQueries({ queryKey: ["status"] })
    },
  })
}

export function useIssueArtifactContent(slug: string, filename: string) {
  return useQuery<IssueArtifactDetail>({
    queryKey: ["issues", projectKey(), slug, "artifacts", filename],
    queryFn: () => fetchIssueArtifactContent(slug, filename),
    staleTime: 30_000,
    enabled: !!slug && !!filename,
  })
}

export function useSaveIssueArtifact(slug: string, filename: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => apiSaveIssueArtifactContent(slug, filename, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issues", projectKey(), slug, "artifacts", filename] })
      qc.invalidateQueries({ queryKey: ["issues", projectKey(), slug, "artifacts"] })
    },
  })
}

export function useDeleteIssueArtifact(slug: string) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (filename: string) => apiDeleteIssueArtifact(slug, filename),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issues", projectKey(), slug, "artifacts"] })
      navigate(`/issues/${slug}`)
    },
  })
}

export function useUploadIssueArtifact(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => apiUploadIssueArtifact(slug, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issues", projectKey(), slug, "artifacts"] })
    },
  })
}

export function useCreateIssueArtifact(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (filename: string) => apiCreateIssueArtifact(slug, filename),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issues", projectKey(), slug, "artifacts"] })
    },
  })
}
