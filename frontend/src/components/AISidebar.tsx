import { useRef, useCallback, useReducer, useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { useWikiDoc } from "@/hooks/useData"
import { saveWikiDoc } from "@/lib/api"
import type { WikiDocDetail } from "@/lib/types"
import {
  AIChatPanel,
  type ChatContext,
  type DocSnapshot,
  type WriteResult,
  type WriteToolFinishedCallback,
  type DocDataCallback,
} from "./AIChatPanel"
import { DocDiffView } from "./DocDiffView"

const MODEL_STORAGE_KEY = "ai-sidebar-model"
const DEFAULT_MODEL = "anthropic/claude-sonnet-4-5"
const MAX_HISTORY = 10
const SIDEBAR_WIDTH_KEY = "ai-sidebar-width"
const MIN_WIDTH = 280
const MAX_WIDTH = 700
const DEFAULT_WIDTH = 380

// ---------------------------------------------------------------------------
// useSidebarResize — drag-to-resize the AI sidebar
// ---------------------------------------------------------------------------
function useSidebarResize(): {
  width: number
  resizerProps: {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
  }
  sidebarStyle: React.CSSProperties
} {
  const [width, setWidth] = useState<number>(() => {
    const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY)
    return stored ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Number(stored))) : DEFAULT_WIDTH
  })
  const draggingRef = useRef(false)
  const resizerRef = useRef<HTMLDivElement | null>(null)

  // Keep the CSS variable in sync with width so .main margin tracks it
  useEffect(() => {
    document.documentElement.style.setProperty("--ai-sidebar-width", `${width}px`)
  }, [width])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    draggingRef.current = true
    document.body.classList.add("ai-resizing")
    const el = e.currentTarget
    el.classList.add("dragging")
    resizerRef.current = el as HTMLDivElement

    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return
      // sidebar is on the right; wider = more left = smaller clientX for left edge
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - ev.clientX))
      setWidth(newWidth)
    }

    const onUp = () => {
      draggingRef.current = false
      document.body.classList.remove("ai-resizing")
      resizerRef.current?.classList.remove("dragging")
      resizerRef.current = null
      setWidth((w) => {
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w))
        return w
      })
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }, [])

  return {
    width,
    resizerProps: { onPointerDown },
    sidebarStyle: { width },
  }
}

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
  const { resizerProps, sidebarStyle } = useSidebarResize()

  const historyRef = useRef<DocSnapshot[]>([])
  // Snapshot taken at the start of a write turn, before any preview patches
  const turnSnapshotRef = useRef<DocSnapshot | null>(null)
  const [state, setState] = useState<DocSidebarState>({
    lastWrite: null,
    diffOld: null,
    diffNew: null,
    showDiff: false,
  })

  // Stable ref to current doc so callbacks always see latest value
  const docRef = useRef(doc)
  useEffect(() => { docRef.current = doc }, [doc])

  const context: ChatContext = doc
    ? { type: "wiki_doc", slug: doc.slug, title: doc.title, body: doc.body }
    : null

  // Called for each doc-preview or doc-write data chunk from the server
  const handleDocData: DocDataCallback = useCallback((event) => {
    const currentDoc = docRef.current
    if (!currentDoc) return

    if (event.type === "doc-preview" && event.slug === currentDoc.slug && event.body) {
      // Take a snapshot of the pre-write state exactly once per turn
      if (!turnSnapshotRef.current) {
        turnSnapshotRef.current = {
          slug: currentDoc.slug,
          title: currentDoc.title,
          body: currentDoc.body,
          icon: currentDoc.icon ?? null,
        }
      }
      // Optimistically patch the cache with the streaming partial body
      qc.setQueryData<WikiDocDetail>(["wiki", currentDoc.slug], (old) =>
        old ? { ...old, body: event.body } : old
      )
    } else if (event.type === "doc-write" && event.slug === currentDoc.slug) {
      // Patch cache with the final saved body (no network round-trip)
      qc.setQueryData<WikiDocDetail>(["wiki", currentDoc.slug], (old) =>
        old ? { ...old, title: event.title, body: event.body } : old
      )

      // Capture snapshot for undo (may have been set by doc-preview already)
      const snapshot: DocSnapshot = turnSnapshotRef.current ?? {
        slug: currentDoc.slug,
        title: currentDoc.title,
        body: currentDoc.body,
        icon: currentDoc.icon ?? null,
      }
      turnSnapshotRef.current = null // reset for next turn

      if (historyRef.current.length >= MAX_HISTORY) {
        historyRef.current.shift()
      }
      historyRef.current.push(snapshot)

      setState({
        lastWrite: {
          ok: true,
          slug: event.slug,
          title: event.title,
          previousSnapshot: snapshot,
        },
        diffOld: snapshot.body,
        diffNew: event.body,
        showDiff: true,
      })
    }
  }, [qc])

  // Called after the full turn finishes — just refresh the wiki list for nav
  const handleWriteToolFinished: WriteToolFinishedCallback = useCallback(
    async (_writeSlug: string, _writeTitle: string) => {
      // Cache is already patched by doc-write data chunk; just refresh the list
      await qc.invalidateQueries({ queryKey: ["wiki"] })
      // Reset the turn snapshot in case doc-write never fired (e.g. tool error)
      turnSnapshotRef.current = null
    },
    [qc]
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
      // Patch cache immediately with undo content
      qc.setQueryData<WikiDocDetail>(["wiki", snap.slug], (old) =>
        old ? { ...old, title: snap.title, body: snap.body } : old
      )
      await qc.invalidateQueries({ queryKey: ["wiki"] })
    } catch (err) {
      console.error("Undo failed:", err)
    }
    setState({ lastWrite: null, diffOld: null, diffNew: null, showDiff: false })
  }, [qc])

  return (
    <aside className={`ai-sidebar${open ? " open" : ""}`} style={sidebarStyle}>
      <div className="ai-sidebar-resizer" {...resizerProps} />
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
        onDocData={handleDocData}
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
  const { resizerProps, sidebarStyle } = useSidebarResize()

  return (
    <aside className={`ai-sidebar${open ? " open" : ""}`} style={sidebarStyle}>
      <div className="ai-sidebar-resizer" {...resizerProps} />
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
        onDocData={() => {}}
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
