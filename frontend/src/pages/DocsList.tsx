import { useState, useCallback } from "react"
import { Link } from "react-router-dom"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useWikiDocs, useReorderWikiDocs } from "@/hooks/useData"
import { DocIcon } from "@/lib/docIcons"
import type { WikiDocDetail } from "@/lib/types"

function formatRelativeDate(dateStr?: string | null): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "Updated today"
  if (diffDays === 1) return "Updated yesterday"
  if (diffDays < 7) return `Updated ${diffDays} days ago`
  if (diffDays < 14) return "Updated 1 week ago"
  return `Updated ${Math.floor(diffDays / 7)} weeks ago`
}

// ---------------------------------------------------------------------------
// Grip icon SVG for drag handle
// ---------------------------------------------------------------------------
function GripIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <circle cx="9" cy="5" r="1.5" />
      <circle cx="15" cy="5" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="15" cy="19" r="1.5" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// SortableDocRow — a single draggable doc list item
// ---------------------------------------------------------------------------
function SortableDocRow({ doc }: { doc: WikiDocDetail }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: doc.slug })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    position: "relative" as const,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="docs-list-row-wrap">
      <button
        className="docs-list-row-handle"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripIcon />
      </button>
      <Link className="docs-list-row" to={`/docs/${doc.slug}`}>
        <div className="docs-list-row-icon">
          <DocIcon name={doc.icon} size={18} />
        </div>
        <div className="docs-list-row-body">
          <span className="docs-list-row-title">
            {doc.title}
            {doc.dirty && <span className="docs-list-row-dirty" title="Uncommitted changes" />}
          </span>
          {doc.description && (
            <span className="docs-list-row-desc">{doc.description}</span>
          )}
        </div>
        <span className="docs-list-row-date">{formatRelativeDate(doc.updated_at)}</span>
      </Link>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Static overlay row shown while dragging
// ---------------------------------------------------------------------------
function DocRowOverlay({ doc }: { doc: WikiDocDetail }) {
  return (
    <div className="docs-list-row-wrap docs-list-row-overlay">
      <button className="docs-list-row-handle" aria-hidden>
        <GripIcon />
      </button>
      <div className="docs-list-row">
        <div className="docs-list-row-icon">
          <DocIcon name={doc.icon} size={18} />
        </div>
        <div className="docs-list-row-body">
          <span className="docs-list-row-title">{doc.title}</span>
          {doc.description && (
            <span className="docs-list-row-desc">{doc.description}</span>
          )}
        </div>
        <span className="docs-list-row-date">{formatRelativeDate(doc.updated_at)}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DocsList page
// ---------------------------------------------------------------------------
export function DocsList() {
  const { data, isLoading, error } = useWikiDocs()
  const reorderMutation = useReorderWikiDocs()
  const [localOrder, setLocalOrder] = useState<WikiDocDetail[] | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Use localOrder while dragging, otherwise server data
  const docs = localOrder ?? data?.docs ?? []

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
    // Snapshot the current order so drag reorders are local-only until drop
    if (!localOrder && data?.docs) {
      setLocalOrder([...data.docs])
    }
  }, [localOrder, data])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) {
      setLocalOrder(null)
      return
    }

    const currentDocs = localOrder ?? data?.docs ?? []
    const oldIndex = currentDocs.findIndex((d) => d.slug === active.id)
    const newIndex = currentDocs.findIndex((d) => d.slug === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      setLocalOrder(null)
      return
    }

    const reordered = arrayMove(currentDocs, oldIndex, newIndex)
    setLocalOrder(reordered)

    // Persist to server
    const slugs = reordered.map((d) => d.slug)
    reorderMutation.mutate(slugs, {
      onSettled: () => {
        // Clear local override once the server responds — fresh data comes via query invalidation
        setLocalOrder(null)
      },
    })
  }, [localOrder, data, reorderMutation])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setLocalOrder(null)
  }, [])

  const activeDoc = activeId ? docs.find((d) => d.slug === activeId) : null

  if (isLoading) {
    return <div style={{ color: "var(--foreground-muted)", padding: "40px", textAlign: "center" }}>Loading…</div>
  }
  if (error || !data) {
    return <div style={{ color: "var(--status-error)", padding: "40px" }}>Failed to load docs.</div>
  }

  return (
    <div className="card">
      <div className="docs-list-header">
        <span className="docs-list-title">Project Docs</span>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="docs-list-count">{docs.length} document{docs.length !== 1 ? "s" : ""}</span>
          <Link
            to="/docs/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "var(--primary-foreground)",
              background: "var(--primary)",
              textDecoration: "none",
              padding: "5px 12px",
              borderRadius: "6px",
              transition: "background 100ms",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Doc
          </Link>
        </div>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={docs.map((d) => d.slug)} strategy={verticalListSortingStrategy}>
          <div className="docs-list">
            {docs.map((doc) => (
              <SortableDocRow key={doc.slug} doc={doc} />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeDoc ? <DocRowOverlay doc={activeDoc} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
