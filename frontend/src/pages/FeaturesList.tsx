import { useState, useMemo, useCallback, useRef, useEffect } from "react"
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
import { useFeatures, useReorderFeatures } from "@/hooks/useData"
import { StatusBadge } from "@/components/Badges"
import type { FeatureDetail, FeatureStatus, IssuePriority } from "@/lib/types"

type SortField = "order" | "title" | "status" | "priority" | "modified"
type SortDir = "asc" | "desc"

const STATUS_OPTIONS: FeatureStatus[] = ["draft", "deferred", "ready", "in-progress", "review", "done"]
const PRIORITY_OPTIONS: IssuePriority[] = ["critical", "high", "medium", "low"]
const PAGE_SIZES = [10, 25, 50, 100] as const

// ---------------------------------------------------------------------------
// Filter state
// ---------------------------------------------------------------------------
interface Filters {
  status: FeatureStatus[]
  priority: IssuePriority[]
  assignee: string | null | undefined // undefined=all, null=unassigned, string=name
  pointsMin: number | undefined
  pointsMax: number | undefined
  tags: string[]
}

const EMPTY_FILTERS: Filters = {
  status: [],
  priority: [],
  assignee: undefined,
  pointsMin: undefined,
  pointsMax: undefined,
  tags: [],
}

function countActiveFilters(f: Filters): number {
  let n = 0
  if (f.status.length > 0) n++
  if (f.priority.length > 0) n++
  if (f.assignee !== undefined) n++
  if (f.pointsMin !== undefined || f.pointsMax !== undefined) n++
  if (f.tags.length > 0) n++
  return n
}

function filtersAreEmpty(f: Filters): boolean {
  return countActiveFilters(f) === 0
}

// ---------------------------------------------------------------------------
// Small components
// ---------------------------------------------------------------------------

function PriorityBadge({ priority }: { priority?: IssuePriority }) {
  if (!priority) return <span className="text-muted">—</span>
  return <span className={`badge badge-priority-${priority}`}>{priority}</span>
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

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: active ? 1 : 0.3, transition: "opacity 100ms" }}
    >
      {dir === "asc" ? (
        <path d="M12 19V5M5 12l7-7 7 7" />
      ) : (
        <path d="M12 5v14M5 12l7 7 7-7" />
      )}
    </svg>
  )
}

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

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}

function CloseIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Mega menu filter popover
// ---------------------------------------------------------------------------
function FilterPopover({
  filters,
  onChange,
  allAssignees,
  allTags,
  onClose,
}: {
  filters: Filters
  onChange: (f: Filters) => void
  allAssignees: string[]
  allTags: string[]
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [assigneeSearch, setAssigneeSearch] = useState("")

  // Close on click-outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [onClose])

  const filteredAssignees = assigneeSearch
    ? allAssignees.filter((a) => a.toLowerCase().includes(assigneeSearch.toLowerCase()))
    : allAssignees

  function toggleStatus(s: FeatureStatus) {
    const next = filters.status.includes(s)
      ? filters.status.filter((x) => x !== s)
      : [...filters.status, s]
    onChange({ ...filters, status: next })
  }

  function togglePriority(p: IssuePriority) {
    const next = filters.priority.includes(p)
      ? filters.priority.filter((x) => x !== p)
      : [...filters.priority, p]
    onChange({ ...filters, priority: next })
  }

  function setAssignee(val: string | null | undefined) {
    onChange({ ...filters, assignee: val })
  }

  function toggleTag(t: string) {
    const next = filters.tags.includes(t)
      ? filters.tags.filter((x) => x !== t)
      : [...filters.tags, t]
    onChange({ ...filters, tags: next })
  }

  return (
    <div ref={ref} className="mega-menu-popover">
      <div className="mega-menu-header">
        <span className="mega-menu-title">Filters</span>
        <button className="mega-menu-close" onClick={onClose} aria-label="Close filters">
          <CloseIcon size={14} />
        </button>
      </div>

      <div className="mega-menu-body">
        {/* Left column: Status */}
        <div className="mega-menu-section">
          <span className="mega-menu-section-label">Status</span>
          <div className="mega-menu-checkboxes">
            {STATUS_OPTIONS.map((s) => (
              <label key={s} className="mega-menu-checkbox">
                <input
                  type="checkbox"
                  checked={filters.status.includes(s)}
                  onChange={() => toggleStatus(s)}
                />
                <span>{s}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Right column: Assignee */}
        <div className="mega-menu-section">
          <span className="mega-menu-section-label">Assignee</span>
          <input
            type="text"
            className="mega-menu-search"
            placeholder="Search assignees..."
            value={assigneeSearch}
            onChange={(e) => setAssigneeSearch(e.target.value)}
          />
          <div className="mega-menu-assignee-list">
            <label className="mega-menu-radio">
              <input
                type="radio"
                name="assignee"
                checked={filters.assignee === undefined}
                onChange={() => setAssignee(undefined)}
              />
              <span>All</span>
            </label>
            <label className="mega-menu-radio">
              <input
                type="radio"
                name="assignee"
                checked={filters.assignee === null}
                onChange={() => setAssignee(null)}
              />
              <span>Unassigned</span>
            </label>
            {filteredAssignees.map((a) => (
              <label key={a} className="mega-menu-radio">
                <input
                  type="radio"
                  name="assignee"
                  checked={filters.assignee === a}
                  onChange={() => setAssignee(a)}
                />
                <span>{a}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Left column: Priority */}
        <div className="mega-menu-section">
          <span className="mega-menu-section-label">Priority</span>
          <div className="mega-menu-checkboxes">
            {PRIORITY_OPTIONS.map((p) => (
              <label key={p} className="mega-menu-checkbox">
                <input
                  type="checkbox"
                  checked={filters.priority.includes(p)}
                  onChange={() => togglePriority(p)}
                />
                <span>{p}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Right column: Points range */}
        <div className="mega-menu-section">
          <span className="mega-menu-section-label">Points</span>
          <div className="mega-menu-range">
            <input
              type="number"
              className="mega-menu-range-input"
              placeholder="Min"
              value={filters.pointsMin ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  pointsMin: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              min={0}
            />
            <span className="mega-menu-range-sep">—</span>
            <input
              type="number"
              className="mega-menu-range-input"
              placeholder="Max"
              value={filters.pointsMax ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  pointsMax: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              min={0}
            />
          </div>
        </div>

        {/* Full width: Tags */}
        {allTags.length > 0 && (
          <div className="mega-menu-section mega-menu-section-wide">
            <span className="mega-menu-section-label">Tags</span>
            <div className="mega-menu-checkboxes mega-menu-tags-grid">
              {allTags.map((t) => (
                <label key={t} className="mega-menu-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.tags.includes(t)}
                    onChange={() => toggleTag(t)}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mega-menu-footer">
        <button
          className="btn btn-sm btn-outline"
          onClick={() => onChange({ ...EMPTY_FILTERS })}
          disabled={filtersAreEmpty(filters)}
        >
          Clear all
        </button>
        <button className="btn btn-sm btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Active filter chips
// ---------------------------------------------------------------------------
function FilterChips({
  filters,
  onChange,
}: {
  filters: Filters
  onChange: (f: Filters) => void
}) {
  if (filtersAreEmpty(filters)) return null

  return (
    <div className="features-filter-chips-bar">
      {filters.status.length > 0 && (
        <span className="features-applied-chip">
          Status: {filters.status.join(", ")}
          <button onClick={() => onChange({ ...filters, status: [] })} aria-label="Remove status filter">
            <CloseIcon />
          </button>
        </span>
      )}
      {filters.priority.length > 0 && (
        <span className="features-applied-chip">
          Priority: {filters.priority.join(", ")}
          <button onClick={() => onChange({ ...filters, priority: [] })} aria-label="Remove priority filter">
            <CloseIcon />
          </button>
        </span>
      )}
      {filters.assignee !== undefined && (
        <span className="features-applied-chip">
          Assignee: {filters.assignee === null ? "Unassigned" : filters.assignee}
          <button onClick={() => onChange({ ...filters, assignee: undefined })} aria-label="Remove assignee filter">
            <CloseIcon />
          </button>
        </span>
      )}
      {(filters.pointsMin !== undefined || filters.pointsMax !== undefined) && (
        <span className="features-applied-chip">
          Points: {filters.pointsMin ?? "0"} — {filters.pointsMax ?? "any"}
          <button onClick={() => onChange({ ...filters, pointsMin: undefined, pointsMax: undefined })} aria-label="Remove points filter">
            <CloseIcon />
          </button>
        </span>
      )}
      {filters.tags.length > 0 && (
        <span className="features-applied-chip">
          Tags: {filters.tags.join(", ")}
          <button onClick={() => onChange({ ...filters, tags: [] })} aria-label="Remove tags filter">
            <CloseIcon />
          </button>
        </span>
      )}
      <button
        className="features-filter-clear"
        onClick={() => onChange({ ...EMPTY_FILTERS })}
      >
        Clear all
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sortable table row (for DnD mode)
// ---------------------------------------------------------------------------
function SortableFeatureRow({
  feature,
  dndEnabled,
}: {
  feature: FeatureDetail
  dndEnabled: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: feature.slug, disabled: !dndEnabled })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    position: "relative" as const,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <tr ref={setNodeRef} style={style} className="features-table-row">
      {dndEnabled && (
        <td className="features-table-grip">
          <button
            className="features-dnd-handle"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripIcon />
          </button>
        </td>
      )}
      <td>
        <Link to={`/features/${feature.slug}`} className="features-table-name">
          {feature.title}
        </Link>
      </td>
      <td><StatusBadge status={feature.status} /></td>
      <td><PriorityBadge priority={feature.priority} /></td>
      <td className="features-table-assignee">
        {feature.assignees.length > 0 ? feature.assignees.join(", ") : <span className="text-muted">Unassigned</span>}
      </td>
      <td className="features-table-points">
        {feature.points ?? <span className="text-muted">—</span>}
      </td>
      <td className="features-table-date">{formatRelativeDate(feature.modified)}</td>
    </tr>
  )
}

function FeatureRowOverlay({ feature }: { feature: FeatureDetail }) {
  return (
    <table className="features-table features-table-full features-drag-overlay">
      <tbody>
        <tr className="features-table-row">
          <td className="features-table-grip">
            <button className="features-dnd-handle" aria-hidden>
              <GripIcon />
            </button>
          </td>
          <td>
            <span className="features-table-name">{feature.title}</span>
          </td>
          <td><StatusBadge status={feature.status} /></td>
          <td><PriorityBadge priority={feature.priority} /></td>
          <td className="features-table-assignee">
            {feature.assignees.length > 0 ? feature.assignees.join(", ") : <span className="text-muted">Unassigned</span>}
          </td>
          <td className="features-table-points">
            {feature.points ?? <span className="text-muted">—</span>}
          </td>
          <td className="features-table-date">{formatRelativeDate(feature.modified)}</td>
        </tr>
      </tbody>
    </table>
  )
}

// ---------------------------------------------------------------------------
// Pagination controls
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

  // Generate page numbers to show
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
        {start}–{end} of {total} feature{total !== 1 ? "s" : ""}
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
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
          >
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
export function FeaturesList() {
  // Filters
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS })
  const [showFilters, setShowFilters] = useState(false)

  // Sorting
  const [sortField, setSortField] = useState<SortField>("order")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  // Pagination
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)

  // Build query params
  const queryParams = useMemo(() => ({
    page,
    limit,
    status: filters.status.length > 0 ? filters.status : undefined,
    priority: filters.priority.length > 0 ? filters.priority : undefined,
    assignee: filters.assignee,
    pointsMin: filters.pointsMin,
    pointsMax: filters.pointsMax,
    tags: filters.tags.length > 0 ? filters.tags : undefined,
    sort: sortField,
    dir: sortDir,
  }), [page, limit, filters, sortField, sortDir])

  const { data, isLoading, error } = useFeatures(queryParams)
  const reorderMutation = useReorderFeatures()

  // We also need an unfiltered query to get all assignees/tags for the filter popover
  const allDataQuery = useFeatures({ page: 1, limit: 1000 })
  const allFeatures = allDataQuery.data?.features ?? []

  const allAssignees = useMemo(() => {
    const names = new Set<string>()
    for (const f of allFeatures) {
      for (const a of f.assignees) names.add(a)
    }
    return Array.from(names).sort()
  }, [allFeatures])

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    for (const f of allFeatures) {
      for (const t of f.tags ?? []) tags.add(t)
    }
    return Array.from(tags).sort()
  }, [allFeatures])

  // DnD is only enabled when unfiltered + sort by order
  const dndEnabled = filtersAreEmpty(filters) && sortField === "order" && sortDir === "asc"

  // Local state for DnD reordering
  const [localOrder, setLocalOrder] = useState<FeatureDetail[] | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const features = localOrder ?? data?.features ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
    if (!localOrder && data?.features) {
      setLocalOrder([...data.features])
    }
  }, [localOrder, data])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) {
      setLocalOrder(null)
      return
    }

    const currentFeatures = localOrder ?? data?.features ?? []
    const oldIndex = currentFeatures.findIndex((f) => f.slug === active.id)
    const newIndex = currentFeatures.findIndex((f) => f.slug === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      setLocalOrder(null)
      return
    }

    const reordered = arrayMove(currentFeatures, oldIndex, newIndex)
    setLocalOrder(reordered)

    // Persist — offset so server assigns correct absolute order values
    const offset = (page - 1) * limit
    const slugs = reordered.map((f) => f.slug)
    reorderMutation.mutate(
      { slugs, offset },
      {
        onSettled: () => {
          setLocalOrder(null)
        },
      }
    )
  }, [localOrder, data, page, limit, reorderMutation])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setLocalOrder(null)
  }, [])

  const activeFeature = activeId ? features.find((f) => f.slug === activeId) : null

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
    }
    setPage(1) // reset to first page on sort change
  }

  function handleFilterChange(f: Filters) {
    setFilters(f)
    setPage(1) // reset to first page on filter change
  }

  function handleLimitChange(newLimit: number) {
    setLimit(newLimit)
    setPage(1)
  }

  const filterCount = countActiveFilters(filters)

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
        Failed to load features.
      </div>
    )
  }

  if (total === 0 && filtersAreEmpty(filters)) {
    return (
      <div className="card">
        <div className="features-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--foreground-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.27 12.27a2.5 2.5 0 0 0-3.54 3.54l-9 9a2.5 2.5 0 0 1-3.54-3.54l9-9a2.5 2.5 0 0 0 3.54-3.54" />
            <path d="m8 18-4-4" />
            <path d="m6 6 2-2 6 6" />
            <path d="m16 2 6 6" />
            <path d="M17 2h5v5" />
          </svg>
          <p>No features yet. Create your first feature to get started.</p>
          <Link to="/features/new" className="btn btn-primary">New Feature</Link>
        </div>
      </div>
    )
  }

  const tableContent = (
    <div className="features-table-wrap">
      <table className="features-table features-table-full">
        <thead>
          <tr>
            {dndEnabled && <th style={{ width: 32 }} />}
            <th className="features-th-sortable" onClick={() => toggleSort("title")}>
              Feature <SortIcon active={sortField === "title"} dir={sortField === "title" ? sortDir : "asc"} />
            </th>
            <th className="features-th-sortable" onClick={() => toggleSort("status")}>
              Status <SortIcon active={sortField === "status"} dir={sortField === "status" ? sortDir : "asc"} />
            </th>
            <th className="features-th-sortable" onClick={() => toggleSort("priority")}>
              Priority <SortIcon active={sortField === "priority"} dir={sortField === "priority" ? sortDir : "asc"} />
            </th>
            <th>Assignee</th>
            <th>Points</th>
            <th className="features-th-sortable" onClick={() => toggleSort("modified")}>
              Modified <SortIcon active={sortField === "modified"} dir={sortField === "modified" ? sortDir : "asc"} />
            </th>
          </tr>
        </thead>
        <tbody>
          {features.map((f) => (
            <SortableFeatureRow key={f.slug} feature={f} dndEnabled={dndEnabled} />
          ))}
          {features.length === 0 && (
            <tr>
              <td
                colSpan={dndEnabled ? 8 : 7}
                style={{ textAlign: "center", color: "var(--foreground-muted)", padding: "24px" }}
              >
                No features match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="card">
      <div className="features-list-header">
        <span className="features-list-title">Features</span>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="features-list-count">
            {total} feature{total !== 1 ? "s" : ""}
          </span>

          {/* Filters button */}
          <div style={{ position: "relative" }}>
            <button
              className={`btn btn-sm btn-outline features-filter-btn${showFilters ? " active" : ""}`}
              onClick={() => setShowFilters((v) => !v)}
            >
              <FilterIcon />
              Filters
              {filterCount > 0 && (
                <span className="features-filter-badge">{filterCount}</span>
              )}
            </button>
            {showFilters && (
              <FilterPopover
                filters={filters}
                onChange={handleFilterChange}
                allAssignees={allAssignees}
                allTags={allTags}
                onClose={() => setShowFilters(false)}
              />
            )}
          </div>

          <Link to="/features/new" className="btn btn-primary btn-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Feature
          </Link>
        </div>
      </div>

      {/* Applied filter chips */}
      <FilterChips filters={filters} onChange={handleFilterChange} />

      {/* Table with optional DnD */}
      {dndEnabled ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={features.map((f) => f.slug)}
            strategy={verticalListSortingStrategy}
          >
            {tableContent}
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeFeature ? <FeatureRowOverlay feature={activeFeature} /> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        tableContent
      )}

      {/* Pagination */}
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
