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

const PAGE_SIZES = [10, 25, 50, 100] as const

// ---------------------------------------------------------------------------
// Small components
// ---------------------------------------------------------------------------

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <circle cx="9" cy="5" r="1.5" />
      <circle cx="15" cy="5" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="15" cy="19" r="1.5" />
    </svg>
  )
}

function formatRelativeDate(dateStr?: string | null): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 14) return "1w ago"
  return `${Math.floor(diffDays / 7)}w ago`
}

// ---------------------------------------------------------------------------
// Sortable row
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
  }

  return (
    <Link
      ref={setNodeRef}
      style={style}
      className="docs-list-row-wrap"
      to={`/wiki/${doc.slug}`}
    >
      <div className="docs-list-row">
        <div
          className="docs-list-row-handle"
          {...attributes}
          {...listeners}
          onClick={(e) => e.preventDefault()}
        >
          <GripIcon />
        </div>
        <div className="docs-list-row-icon">
          <DocIcon name={doc.icon} size={18} />
        </div>
        <div className="docs-list-row-body">
          <span className="docs-list-row-title">{doc.title}</span>
          {doc.dirty && <span className="docs-list-row-dirty" title="Uncommitted changes" />}
          {doc.description && (
            <span className="docs-list-row-desc">{doc.description}</span>
          )}
        </div>
        <span className="docs-list-row-date">{formatRelativeDate(doc.updated_at)}</span>
      </div>
    </Link>
  )
}

function DocRowOverlay({ doc }: { doc: WikiDocDetail }) {
  return (
    <div className="docs-list-row-wrap docs-list-row-overlay">
      <div className="docs-list-row">
        <div className="docs-list-row-handle">
          <GripIcon />
        </div>
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
// Pagination
// ---------------------------------------------------------------------------
function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: {
  page: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (p: number) => void
  onLimitChange: (l: number) => void
}) {
  if (total === 0) return null

  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  const pages: (number | "...")[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push("...")
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i)
    }
    if (page < totalPages - 2) pages.push("...")
    pages.push(totalPages)
  }

  return (
    <div className="features-pagination">
      <div className="features-pagination-info">
        {start}–{end} of {total} page{total !== 1 ? "s" : ""}
      </div>
      <div className="features-pagination-controls">
        <button
          className="btn btn-sm btn-outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="features-pagination-ellipsis">...</span>
          ) : (
            <button
              key={p}
              className={`btn btn-sm ${p === page ? "btn-primary" : "btn-outline"}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}
        <button
          className="btn btn-sm btn-outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
      <div className="features-pagination-size">
        <label>
          Show
          <select value={limit} onChange={(e) => onLimitChange(Number(e.target.value))}>
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function WikiList() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)

  const { data, isLoading, error } = useWikiDocs({ page, limit })
  const reorderMutation = useReorderWikiDocs()

  const [localOrder, setLocalOrder] = useState<WikiDocDetail[] | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const docs = localOrder ?? data?.docs ?? []
  const total = data?.total ?? 0
  const totalPages = data?.total_pages ?? 1

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
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

    const slugs = reordered.map((d) => d.slug)
    reorderMutation.mutate(slugs, {
      onSettled: () => {
        setLocalOrder(null)
      },
    })
  }, [localOrder, data, reorderMutation])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setLocalOrder(null)
  }, [])

  const activeDoc = activeId ? docs.find((d) => d.slug === activeId) : null

  function handleLimitChange(newLimit: number) {
    setLimit(newLimit)
    setPage(1)
  }

  if (isLoading && !data) {
    return (
      <div style={{ color: "var(--foreground-muted)", padding: "40px", textAlign: "center" }}>
        Loading...
      </div>
    )
  }
  if (error) {
    return (
      <div style={{ color: "var(--status-error)", padding: "40px" }}>
        Failed to load wiki pages.
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="card">
        <div className="features-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--foreground-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            <line x1="10" x2="14" y1="9" y2="9" />
            <line x1="8" x2="16" y1="13" y2="13" />
            <line x1="8" x2="16" y1="17" y2="17" />
          </svg>
          <p>No wiki pages yet. Create your first page to start building your knowledge base.</p>
          <Link to="/wiki/new" className="btn btn-primary">New Page</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="docs-list-header">
        <span className="docs-list-title">Wiki</span>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="docs-list-count">
            {total} page{total !== 1 ? "s" : ""}
          </span>
          <Link to="/wiki/new" className="btn btn-primary btn-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Page
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
        <SortableContext
          items={docs.map((d) => d.slug)}
          strategy={verticalListSortingStrategy}
        >
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

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={handleLimitChange}
      />
    </div>
  )
}
