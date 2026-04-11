import { useRef, useCallback, useReducer, useState } from "react"
import { useLocation } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { useWikiDoc } from "@/hooks/useData"
import { saveWikiDoc } from "@/lib/api"
import { AIChatPanel, type ChatContext, type DocSnapshot, type WriteResult, type WriteToolFinishedCallback } from "./AIChatPanel"
import { DocDiffView } from "./DocDiffView"

const MODEL_STORAGE_KEY = "ai-sidebar-model"
const DEFAULT_MODEL = "anthropic/claude-sonnet-4-5"
const MAX_HISTORY = 10

interface AISidebarProps {
  open: boolean
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Shared model state hook
// ---------------------------------------------------------------------------
function useModelState(): [string, (m: string) => void] {
  const [model, setModel] = useReducer(
    (_: string, next: string) => next,
    localStorage.getItem(MODEL_STORAGE_KEY) ?? DEFAULT_MODEL
  )
  const handleSet = useCallback(
    (m: string) => {
      localStorage.setItem(MODEL_STORAGE_KEY, m)
      setModel(m)
    },
    []
  )
  return [model, handleSet]
}

// ---------------------------------------------------------------------------
// DocAISidebar — rendered when we're on a /docs/:slug page
// ---------------------------------------------------------------------------
interface DocSidebarState {
  lastWrite: WriteResult | null
  diffOld: string | null
  diffNew: string | null
  showDiff: boolean
}

function DocAISidebar({
  open,
  onClose,
  slug,
}: {
  open: boolean
  onClose: () => void
  slug: string
}) {
  const { data: doc } = useWikiDoc(slug)
  const qc = useQueryClient()
  const [selectedModel, setSelectedModel] = useModelState()

  const historyRef = useRef<DocSnapshot[]>([])
  const [state, setState] = useState<DocSidebarState>({
    lastWrite: null,
    diffOld: null,
    diffNew: null,
    showDiff: false,
  })

  const context: ChatContext = doc
    ? { type: "wiki_doc", slug: doc.slug, title: doc.title, body: doc.body }
    : null

  const handleWriteToolFinished: WriteToolFinishedCallback = useCallback(
    async (writeSlug: string, writeTitle: string) => {
      if (!doc) return

      // Snapshot taken BEFORE fetching fresh data (current in-memory value)
      const snapshot: DocSnapshot = {
        slug: doc.slug,
        title: doc.title,
        body: doc.body,
        icon: doc.icon ?? null,
      }

      if (historyRef.current.length >= MAX_HISTORY) {
        historyRef.current.shift()
      }
      historyRef.current.push(snapshot)

      // fetchQuery forces a fresh network fetch and updates the cache,
      // so the page re-renders AND we get the actual new body for the diff.
      let newBody = ""
      try {
        const fresh = await qc.fetchQuery<{ body: string }>({
          queryKey: ["wiki", writeSlug],
          queryFn: () => import("@/lib/api").then((m) => m.fetchWikiDoc(writeSlug)),
          staleTime: 0,
        })
        newBody = fresh?.body ?? ""
      } catch {
        // If the fetch fails, still show the undo banner (diff will be empty)
      }

      // Also invalidate the wiki list so the sidebar/nav refreshes
      await qc.invalidateQueries({ queryKey: ["wiki"] })

      setState({
        lastWrite: {
          ok: true,
          slug: writeSlug,
          title: writeTitle,
          previousSnapshot: snapshot,
        },
        diffOld: snapshot.body,
        diffNew: newBody,
        showDiff: true,
      })
    },
    [doc, qc]
  )

  const handleUndo = useCallback(async () => {
    const snap = historyRef.current.pop()
    if (!snap) return
    try {
      await saveWikiDoc(snap.slug, {
        title: snap.title,
        icon: snap.icon,
        body: snap.body,
      })
      await qc.invalidateQueries({ queryKey: ["wiki", snap.slug] })
      await qc.invalidateQueries({ queryKey: ["wiki"] })
    } catch (err) {
      console.error("Undo failed:", err)
    }
    setState({ lastWrite: null, diffOld: null, diffNew: null, showDiff: false })
  }, [qc])

  return (
    <aside className={`ai-sidebar${open ? " open" : ""}`}>
      {/* Header */}
      <div className="ai-sidebar-header">
        <div className="ai-sidebar-header-left">
          <span className="ai-sidebar-title">AI</span>
          {doc && (
            <span className="ai-sidebar-context-badge" title={doc.title}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14,2 14,8 20,8" />
              </svg>
              {doc.title}
            </span>
          )}
        </div>
        <div className="ai-sidebar-header-right">
          <button className="ai-sidebar-icon-btn" onClick={onClose} title="Close AI panel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat panel */}
      <AIChatPanel
        context={context}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onWriteToolFinished={handleWriteToolFinished}
        lastWrite={state.lastWrite}
        onUndo={handleUndo}
      />

      {/* Diff view */}
      {state.showDiff && state.diffOld !== null && state.diffNew !== null && (
        <DocDiffView
          oldBody={state.diffOld}
          newBody={state.diffNew}
          onClose={() => setState((s) => ({ ...s, showDiff: false }))}
        />
      )}
    </aside>
  )
}

// ---------------------------------------------------------------------------
// GenericAISidebar — for all other pages (read-only project context)
// ---------------------------------------------------------------------------
function GenericAISidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selectedModel, setSelectedModel] = useModelState()

  return (
    <aside className={`ai-sidebar${open ? " open" : ""}`}>
      <div className="ai-sidebar-header">
        <div className="ai-sidebar-header-left">
          <span className="ai-sidebar-title">AI</span>
        </div>
        <div className="ai-sidebar-header-right">
          <button className="ai-sidebar-icon-btn" onClick={onClose} title="Close AI panel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>

      <AIChatPanel
        context={{ type: "global" }}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onWriteToolFinished={async () => {}}
        lastWrite={null}
        onUndo={() => {}}
      />
    </aside>
  )
}

// ---------------------------------------------------------------------------
// AISidebar — root, routes to correct inner component based on current URL
// ---------------------------------------------------------------------------
export function AISidebar({ open, onClose }: AISidebarProps) {
  const location = useLocation()

  // Match /docs/:slug OR /docs/:slug/edit
  const docMatch = location.pathname.match(/^\/docs\/([^/]+?)(?:\/edit)?$/)
  const slug = docMatch?.[1]

  if (slug) {
    return <DocAISidebar open={open} onClose={onClose} slug={slug} />
  }

  return <GenericAISidebar open={open} onClose={onClose} />
}
