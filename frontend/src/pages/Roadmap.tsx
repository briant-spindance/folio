import { useState, useCallback, useRef, useEffect, type ReactNode } from "react"
import { createPortal } from "react-dom"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  useRoadmap,
  useCreateRoadmapCard,
  useUpdateRoadmapCard,
  useDeleteRoadmapCard,
  useMoveRoadmapCard,
  useAddRoadmapRow,
  useUpdateRoadmapRow,
  useDeleteRoadmapRow,
  useReorderRoadmapRows,
  useAddRoadmapColumn,
  useUpdateRoadmapColumn,
  useDeleteRoadmapColumn,
} from "@/hooks/useData"
import type { RoadmapCard, RoadmapRow } from "@/lib/types"

// ---------------------------------------------------------------------------
// ID helpers — distinguish cards, rows, and cells by prefix
// ---------------------------------------------------------------------------

const CARD_PREFIX = "card::"
const ROW_PREFIX = "row::"
const CELL_PREFIX = "cell::"

function cardDragId(cardId: string) {
  return `${CARD_PREFIX}${cardId}`
}
function rowDragId(label: string) {
  return `${ROW_PREFIX}${label}`
}
function cellDropId(column: string, row: string) {
  return `${CELL_PREFIX}${column}::${row}`
}
function parseCardDragId(id: string): string | null {
  return id.startsWith(CARD_PREFIX) ? id.slice(CARD_PREFIX.length) : null
}
function parseRowDragId(id: string): string | null {
  return id.startsWith(ROW_PREFIX) ? id.slice(ROW_PREFIX.length) : null
}
function parseCellDropId(id: string): { column: string; row: string } | null {
  if (!id.startsWith(CELL_PREFIX)) return null
  const rest = id.slice(CELL_PREFIX.length)
  const sep = rest.indexOf("::")
  if (sep === -1) return null
  return { column: rest.slice(0, sep), row: rest.slice(sep + 2) }
}

// ---------------------------------------------------------------------------
// Palette of light row colors (very subtle pastels)
// ---------------------------------------------------------------------------

const ROW_COLOR_PALETTE = [
  "#f0f8ff", // alice blue
  "#f0faf4", // mint cream
  "#fff8f0", // light peach
  "#f5f0ff", // lavender
  "#fff0f0", // misty rose
  "#fefce8", // light cream
  "#f0fdfa", // light cyan
  "#fef0f8", // light blush
  "#f0f0ff", // ghost white indigo
  "#f0f5ff", // light azure
]

function getDefaultColor(index: number): string {
  return ROW_COLOR_PALETTE[index % ROW_COLOR_PALETTE.length]
}

// ---------------------------------------------------------------------------
// Portal-based Dropdown
// ---------------------------------------------------------------------------

function Dropdown({
  anchorRef,
  children,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLElement | null>
  children: ReactNode
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.right })
  }, [anchorRef])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose, anchorRef])

  if (!pos) return null

  return createPortal(
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 250,
        transform: "translateX(-100%)",
      }}
    >
      {children}
    </div>,
    document.body
  )
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconPlus({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  )
}

function IconGripVertical() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
      <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
    </svg>
  )
}

function IconMoreVertical() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
    </svg>
  )
}

function IconEdit() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  )
}

function IconPalette() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="1.5" />
      <circle cx="17.5" cy="10.5" r="1.5" />
      <circle cx="8.5" cy="7.5" r="1.5" />
      <circle cx="6.5" cy="12.5" r="1.5" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2Z" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Card Detail Modal
// ---------------------------------------------------------------------------

interface CardModalProps {
  card: RoadmapCard
  onSave: (updates: { title: string; notes: string }) => void
  onDelete: () => void
  onClose: () => void
}

function CardModal({ card, onSave, onDelete, onClose }: CardModalProps) {
  const [title, setTitle] = useState(card.title)
  const [notes, setNotes] = useState(card.notes)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  const handleSave = () => {
    if (title.trim()) {
      onSave({ title: title.trim(), notes: notes.trim() })
    }
  }

  return (
    <div className="roadmap-modal-overlay" onClick={onClose}>
      <div className="roadmap-modal" onClick={(e) => e.stopPropagation()}>
        <div className="roadmap-modal-header">
          <span className="roadmap-modal-title">Edit Card</span>
          <button className="roadmap-icon-btn" onClick={onClose} title="Close">
            <IconX />
          </button>
        </div>
        <div className="roadmap-modal-body">
          <label className="roadmap-field-label">Title</label>
          <input
            ref={titleRef}
            className="roadmap-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="Card title"
          />
          <label className="roadmap-field-label" style={{ marginTop: 12 }}>Notes</label>
          <textarea
            className="roadmap-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes..."
            rows={4}
          />
        </div>
        <div className="roadmap-modal-footer">
          <button className="roadmap-btn roadmap-btn--danger" onClick={onDelete}>
            <IconTrash /> Delete
          </button>
          <div style={{ flex: 1 }} />
          <button className="roadmap-btn roadmap-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="roadmap-btn roadmap-btn--primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Quick Add Card (inline form in a cell)
// ---------------------------------------------------------------------------

function QuickAdd({ onAdd, onCancel }: { onAdd: (title: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    if (title.trim()) {
      onAdd(title.trim())
    }
    onCancel()
  }

  return (
    <div className="roadmap-quick-add">
      <input
        ref={inputRef}
        className="roadmap-quick-add-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Card title..."
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit()
          if (e.key === "Escape") onCancel()
        }}
        onBlur={handleSubmit}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sortable Card Component (draggable + drop target for reordering)
// ---------------------------------------------------------------------------

function SortableCard({ card, onEdit }: { card: RoadmapCard; onEdit: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cardDragId(card.id) })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`roadmap-card${isDragging ? " roadmap-card--dragging" : ""}`}
      onClick={isDragging ? undefined : onEdit}
      {...listeners}
      {...attributes}
    >
      <div className="roadmap-card-grip">
        <IconGripVertical />
      </div>
      <div className="roadmap-card-content">
        <span className="roadmap-card-title">{card.title}</span>
        {card.notes && <span className="roadmap-card-notes">{card.notes}</span>}
      </div>
    </div>
  )
}

function CardOverlay({ card }: { card: RoadmapCard }) {
  return (
    <div className="roadmap-card roadmap-card--overlay">
      <div className="roadmap-card-grip">
        <IconGripVertical />
      </div>
      <div className="roadmap-card-content">
        <span className="roadmap-card-title">{card.title}</span>
        {card.notes && <span className="roadmap-card-notes">{card.notes}</span>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Droppable Cell (with row color)
// ---------------------------------------------------------------------------

interface CellProps {
  column: string
  row: string
  rowColor: string | null
  cards: RoadmapCard[]
  isOver: boolean
  onEditCard: (card: RoadmapCard) => void
  onQuickAdd: (column: string, row: string) => void
  quickAddActive: boolean
  onQuickAddSubmit: (title: string) => void
  onQuickAddCancel: () => void
}

function RoadmapCell({
  column,
  row,
  rowColor,
  cards,
  isOver,
  onEditCard,
  onQuickAdd,
  quickAddActive,
  onQuickAddSubmit,
  onQuickAddCancel,
}: CellProps) {
  const { setNodeRef } = useDroppable({
    id: cellDropId(column, row),
  })
  const sorted = [...cards].sort((a, b) => a.order - b.order)
  const cardIds = sorted.map((c) => cardDragId(c.id))

  return (
    <div
      ref={setNodeRef}
      className={`roadmap-cell${isOver ? " roadmap-cell--drop-target" : ""}`}
      style={rowColor ? { backgroundColor: rowColor } : undefined}
    >
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div className="roadmap-cell-cards">
          {sorted.map((card) => (
            <SortableCard key={card.id} card={card} onEdit={() => onEditCard(card)} />
          ))}
          {quickAddActive && (
            <QuickAdd onAdd={onQuickAddSubmit} onCancel={onQuickAddCancel} />
          )}
        </div>
      </SortableContext>
      {!quickAddActive && (
        <button className="roadmap-cell-add" onClick={() => onQuickAdd(column, row)} title="Add card">
          <IconPlus size={12} />
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Color Picker (portal-based)
// ---------------------------------------------------------------------------

function ColorPicker({
  anchorRef,
  value,
  onChange,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLElement | null>
  value: string | null
  onChange: (color: string) => void
  onClose: () => void
}) {
  return (
    <Dropdown anchorRef={anchorRef} onClose={onClose}>
      <div className="roadmap-color-picker">
        <div className="roadmap-color-picker-grid">
          {ROW_COLOR_PALETTE.map((color) => (
            <button
              key={color}
              className={`roadmap-color-swatch${value === color ? " roadmap-color-swatch--active" : ""}`}
              style={{ backgroundColor: color }}
              onClick={() => {
                onChange(color)
                onClose()
              }}
              title={color}
            >
              {value === color && <IconCheck />}
            </button>
          ))}
        </div>
      </div>
    </Dropdown>
  )
}

// ---------------------------------------------------------------------------
// Row Header with dropdown menu (rename, color, delete)
// ---------------------------------------------------------------------------

function RowHeader({
  row,
  onDelete,
  onUpdate,
  dragHandleProps,
}: {
  row: RoadmapRow
  onDelete: () => void
  onUpdate: (updates: { label?: string; color?: string | null }) => void
  dragHandleProps?: Record<string, unknown>
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(row.label)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renaming) {
      renameRef.current?.focus()
      renameRef.current?.select()
    }
  }, [renaming])

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== row.label) {
      onUpdate({ label: trimmed })
    }
    setRenaming(false)
  }

  return (
    <div
      className="roadmap-row-header"
      style={row.color ? { backgroundColor: row.color } : undefined}
    >
      <div className="roadmap-row-drag-handle" {...dragHandleProps}>
        <IconGripVertical />
      </div>
      {renaming ? (
        <input
          ref={renameRef}
          className="roadmap-inline-input"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRenameSubmit()
            if (e.key === "Escape") setRenaming(false)
          }}
          onBlur={handleRenameSubmit}
        />
      ) : (
        <span className="roadmap-row-label">{row.label}</span>
      )}
      <div className="roadmap-row-menu-wrap">
        <button
          ref={menuBtnRef}
          className="roadmap-icon-btn roadmap-row-menu-btn"
          onClick={() => setMenuOpen((o) => !o)}
          title="Row options"
        >
          <IconMoreVertical />
        </button>
        {menuOpen && (
          <Dropdown anchorRef={menuBtnRef} onClose={() => setMenuOpen(false)}>
            <div className="roadmap-row-menu">
              <button
                className="roadmap-row-menu-item"
                onClick={() => {
                  setMenuOpen(false)
                  setRenameValue(row.label)
                  setRenaming(true)
                }}
              >
                <IconEdit /> Rename
              </button>
              <button
                className="roadmap-row-menu-item"
                onClick={() => {
                  setMenuOpen(false)
                  setShowColorPicker(true)
                }}
              >
                <IconPalette /> Color
              </button>
              <div className="roadmap-row-menu-divider" />
              <button
                className="roadmap-row-menu-item roadmap-row-menu-item--danger"
                onClick={() => {
                  setMenuOpen(false)
                  onDelete()
                }}
              >
                <IconTrash /> Delete row
              </button>
            </div>
          </Dropdown>
        )}
        {showColorPicker && (
          <ColorPicker
            anchorRef={menuBtnRef}
            value={row.color}
            onChange={(color) => onUpdate({ color })}
            onClose={() => setShowColorPicker(false)}
          />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sortable Row (wraps row header + cells)
// ---------------------------------------------------------------------------

function SortableRow({
  row,
  columns,
  cards,
  showAddColumn,
  overCellId,
  onDeleteRow,
  onUpdateRow,
  onEditCard,
  onQuickAdd,
  quickAdd,
  onQuickAddSubmit,
  onQuickAddCancel,
}: {
  row: RoadmapRow
  columns: string[]
  cards: RoadmapCard[]
  showAddColumn: boolean
  overCellId: string | null
  onDeleteRow: () => void
  onUpdateRow: (updates: { label?: string; color?: string | null }) => void
  onEditCard: (card: RoadmapCard) => void
  onQuickAdd: (column: string, row: string) => void
  quickAdd: { column: string; row: string } | null
  onQuickAddSubmit: (title: string) => void
  onQuickAddCancel: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rowDragId(row.label) })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: "contents" as const,
  }

  const getCardsForCell = (column: string) =>
    cards.filter((c) => c.column === column && c.row === row.label)

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <RowHeader
        row={row}
        onDelete={onDeleteRow}
        onUpdate={onUpdateRow}
        dragHandleProps={listeners}
      />
      {columns.map((col) => {
        const thisCellId = cellDropId(col, row.label)
        const isQuickAddActive =
          quickAdd?.column === col && quickAdd?.row === row.label
        return (
          <RoadmapCell
            key={thisCellId}
            column={col}
            row={row.label}
            rowColor={row.color}
            cards={getCardsForCell(col)}
            isOver={overCellId === thisCellId}
            onEditCard={onEditCard}
            onQuickAdd={onQuickAdd}
            quickAddActive={isQuickAddActive}
            onQuickAddSubmit={onQuickAddSubmit}
            onQuickAddCancel={onQuickAddCancel}
          />
        )
      })}
      {showAddColumn && <div className="roadmap-cell roadmap-cell--placeholder" />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Column Header (editable)
// ---------------------------------------------------------------------------

function ColumnHeader({
  name,
  onRename,
  onDelete,
  canDelete,
}: {
  name: string
  onRename: (newName: string) => void
  onDelete: () => void
  canDelete: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(name)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renaming) {
      renameRef.current?.focus()
      renameRef.current?.select()
    }
  }, [renaming])

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== name) {
      onRename(trimmed)
    }
    setRenaming(false)
  }

  return (
    <div className="roadmap-column-header">
      {renaming ? (
        <input
          ref={renameRef}
          className="roadmap-inline-input roadmap-inline-input--column"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRenameSubmit()
            if (e.key === "Escape") setRenaming(false)
          }}
          onBlur={handleRenameSubmit}
        />
      ) : (
        <span className="roadmap-column-label">{name}</span>
      )}
      <div className="roadmap-col-menu-wrap">
        <button
          ref={menuBtnRef}
          className="roadmap-icon-btn roadmap-col-menu-btn"
          onClick={() => setMenuOpen((o) => !o)}
          title="Column options"
        >
          <IconMoreVertical />
        </button>
        {menuOpen && (
          <Dropdown anchorRef={menuBtnRef} onClose={() => setMenuOpen(false)}>
            <div className="roadmap-col-menu">
              <button
                className="roadmap-row-menu-item"
                onClick={() => {
                  setMenuOpen(false)
                  setRenameValue(name)
                  setRenaming(true)
                }}
              >
                <IconEdit /> Rename
              </button>
              {canDelete && (
                <>
                  <div className="roadmap-row-menu-divider" />
                  <button
                    className="roadmap-row-menu-item roadmap-row-menu-item--danger"
                    onClick={() => {
                      setMenuOpen(false)
                      onDelete()
                    }}
                  >
                    <IconTrash /> Delete column
                  </button>
                </>
              )}
            </div>
          </Dropdown>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add Row Form (with optional color)
// ---------------------------------------------------------------------------

function AddRowForm({ onAdd, onCancel, rowCount }: { onAdd: (label: string, color: string) => void; onCancel: () => void; rowCount: number }) {
  const [label, setLabel] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const defaultColor = getDefaultColor(rowCount)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="roadmap-add-row-form">
      <span className="roadmap-color-swatch roadmap-color-swatch--preview" style={{ backgroundColor: defaultColor }} />
      <input
        ref={inputRef}
        className="roadmap-input"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Row name..."
        onKeyDown={(e) => {
          if (e.key === "Enter" && label.trim()) {
            onAdd(label.trim(), defaultColor)
          }
          if (e.key === "Escape") onCancel()
        }}
      />
      <button
        className="roadmap-btn roadmap-btn--primary roadmap-btn--sm"
        onClick={() => label.trim() && onAdd(label.trim(), defaultColor)}
      >
        Add
      </button>
      <button className="roadmap-btn roadmap-btn--ghost roadmap-btn--sm" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add Column Form (inline in the header row)
// ---------------------------------------------------------------------------

function AddColumnForm({ onAdd, onCancel }: { onAdd: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="roadmap-add-column-form">
      <input
        ref={inputRef}
        className="roadmap-inline-input roadmap-inline-input--column"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Column name..."
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) {
            onAdd(name.trim())
          }
          if (e.key === "Escape") onCancel()
        }}
        onBlur={() => {
          if (name.trim()) onAdd(name.trim())
          else onCancel()
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="roadmap-empty">
      <div className="roadmap-empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
          <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
          <rect x="7" y="7" width="10" height="10" rx="1" />
        </svg>
      </div>
      <h2 className="roadmap-empty-title">No roadmap yet</h2>
      <p className="roadmap-empty-desc">
        Create rows to organize your ideas by theme, then add cards to plan what's Now, Next, and Later.
      </p>
      <button className="roadmap-btn roadmap-btn--primary" onClick={onGetStarted}>
        <IconPlus size={14} /> Add your first row
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Roadmap Page
// ---------------------------------------------------------------------------

export function RoadmapPage() {
  const { data: roadmap, isLoading, error } = useRoadmap()
  const createCard = useCreateRoadmapCard()
  const updateCard = useUpdateRoadmapCard()
  const deleteCardMutation = useDeleteRoadmapCard()
  const moveCard = useMoveRoadmapCard()
  const addRow = useAddRoadmapRow()
  const updateRowMutation = useUpdateRoadmapRow()
  const deleteRowMutation = useDeleteRoadmapRow()
  const reorderRowsMutation = useReorderRoadmapRows()
  const addColumn = useAddRoadmapColumn()
  const updateColumnMutation = useUpdateRoadmapColumn()
  const deleteColumnMutation = useDeleteRoadmapColumn()

  const [editingCard, setEditingCard] = useState<RoadmapCard | null>(null)
  const [quickAdd, setQuickAdd] = useState<{ column: string; row: string } | null>(null)
  const [showAddRow, setShowAddRow] = useState(false)
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [activeCard, setActiveCard] = useState<RoadmapCard | null>(null)
  const [draggingRowLabel, setDraggingRowLabel] = useState<string | null>(null)
  const [overCellId, setOverCellId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id)
    const cardId = parseCardDragId(id)
    if (cardId) {
      const card = roadmap?.cards.find((c) => c.id === cardId)
      if (card) setActiveCard(card)
      return
    }
    const rowLabel = parseRowDragId(id)
    if (rowLabel) {
      setDraggingRowLabel(rowLabel)
    }
  }, [roadmap])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (!event.over || !activeCard) {
      setOverCellId(null)
      return
    }
    const overId = String(event.over.id)
    // Hovering over a cell directly
    if (overId.startsWith(CELL_PREFIX)) {
      setOverCellId(overId)
      return
    }
    // Hovering over a card — find which cell that card belongs to
    const overCardId = parseCardDragId(overId)
    if (overCardId && roadmap) {
      const overCard = roadmap.cards.find((c) => c.id === overCardId)
      if (overCard) {
        setOverCellId(cellDropId(overCard.column, overCard.row))
        return
      }
    }
    setOverCellId(null)
  }, [activeCard, roadmap])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const id = String(event.active.id)
    setOverCellId(null)

    // ── Card drop ──
    const cardId = parseCardDragId(id)
    if (cardId) {
      setActiveCard(null)
      if (!event.over || !roadmap) return
      const overId = String(event.over.id)

      const card = roadmap.cards.find((c) => c.id === cardId)
      if (!card) return

      // Dropped on another card
      const overCardId = parseCardDragId(overId)
      if (overCardId) {
        const overCard = roadmap.cards.find((c) => c.id === overCardId)
        if (!overCard) return

        if (card.column === overCard.column && card.row === overCard.row) {
          // Same cell — reorder
          const cellCards = roadmap.cards
            .filter((c) => c.column === card.column && c.row === card.row)
            .sort((a, b) => a.order - b.order)
          const oldIndex = cellCards.findIndex((c) => c.id === cardId)
          const newIndex = cellCards.findIndex((c) => c.id === overCardId)
          if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return
          const reordered = arrayMove(cellCards, oldIndex, newIndex)
          // Update each card's order
          reordered.forEach((c, i) => {
            if (c.order !== i) {
              moveCard.mutate({ id: c.id, target: { order: i } })
            }
          })
        } else {
          // Cross-cell — move to target card's cell at that position
          const targetCellCards = roadmap.cards
            .filter((c) => c.column === overCard.column && c.row === overCard.row)
            .sort((a, b) => a.order - b.order)
          const targetIndex = targetCellCards.findIndex((c) => c.id === overCardId)
          moveCard.mutate({
            id: cardId,
            target: { column: overCard.column, row: overCard.row, order: targetIndex >= 0 ? targetIndex : 0 },
          })
        }
        return
      }

      // Dropped on a cell
      const target = parseCellDropId(overId)
      if (!target) return
      if (card.column !== target.column || card.row !== target.row) {
        // Append to end of target cell
        const targetCellCards = roadmap.cards.filter(
          (c) => c.column === target.column && c.row === target.row
        )
        moveCard.mutate({
          id: cardId,
          target: { column: target.column, row: target.row, order: targetCellCards.length },
        })
      }
      return
    }

    // ── Row reorder ──
    const rowLabel = parseRowDragId(id)
    if (rowLabel) {
      setDraggingRowLabel(null)
      if (!event.over || !roadmap) return
      const overId = String(event.over.id)
      if (id === overId) return
      const overLabel = parseRowDragId(overId)
      if (!overLabel) return

      const oldIndex = roadmap.rows.findIndex((r) => r.label === rowLabel)
      const newIndex = roadmap.rows.findIndex((r) => r.label === overLabel)
      if (oldIndex === -1 || newIndex === -1) return

      const newOrder = arrayMove(roadmap.rows, oldIndex, newIndex)
      reorderRowsMutation.mutate(newOrder.map((r) => r.label))
    }
  }, [roadmap, moveCard, reorderRowsMutation])

  const handleDragCancel = useCallback(() => {
    setActiveCard(null)
    setDraggingRowLabel(null)
    setOverCellId(null)
  }, [])

  const handleQuickAdd = useCallback((column: string, row: string) => {
    setQuickAdd({ column, row })
  }, [])

  const handleQuickAddSubmit = useCallback(
    (title: string) => {
      if (!quickAdd) return
      createCard.mutate({ title, column: quickAdd.column, row: quickAdd.row })
      setQuickAdd(null)
    },
    [quickAdd, createCard]
  )

  const handleCardSave = useCallback(
    (updates: { title: string; notes: string }) => {
      if (!editingCard) return
      updateCard.mutate({ id: editingCard.id, updates })
      setEditingCard(null)
    },
    [editingCard, updateCard]
  )

  const handleCardDelete = useCallback(() => {
    if (!editingCard) return
    deleteCardMutation.mutate(editingCard.id)
    setEditingCard(null)
  }, [editingCard, deleteCardMutation])

  const handleAddRow = useCallback(
    (label: string, color: string) => {
      addRow.mutate({ label, color })
      setShowAddRow(false)
    },
    [addRow]
  )

  const handleUpdateRow = useCallback(
    (oldLabel: string, updates: { label?: string; color?: string | null }) => {
      updateRowMutation.mutate({ oldLabel, updates })
    },
    [updateRowMutation]
  )

  const handleDeleteRow = useCallback(
    (label: string) => {
      deleteRowMutation.mutate(label)
    },
    [deleteRowMutation]
  )

  const handleAddColumn = useCallback(
    (name: string) => {
      addColumn.mutate(name)
      setShowAddColumn(false)
    },
    [addColumn]
  )

  const handleRenameColumn = useCallback(
    (oldName: string, newName: string) => {
      updateColumnMutation.mutate({ oldName, newName })
    },
    [updateColumnMutation]
  )

  const handleDeleteColumn = useCallback(
    (name: string) => {
      deleteColumnMutation.mutate(name)
    },
    [deleteColumnMutation]
  )

  if (isLoading) {
    return <div style={{ color: "var(--foreground-muted)", padding: "40px", textAlign: "center" }}>Loading...</div>
  }
  if (error || !roadmap) {
    return <div style={{ color: "var(--status-error)", padding: "40px" }}>Failed to load roadmap.</div>
  }

  const columns = roadmap.columns
  const rows = roadmap.rows

  if (rows.length === 0 && roadmap.cards.length === 0) {
    return (
      <div className="roadmap-page">
        <div className="roadmap-header">
          <h1 className="roadmap-title">{roadmap.title}</h1>
        </div>
        <EmptyState onGetStarted={() => setShowAddRow(true)} />
        {showAddRow && (
          <div style={{ maxWidth: 400, margin: "0 auto", padding: "0 16px" }}>
            <AddRowForm onAdd={handleAddRow} onCancel={() => setShowAddRow(false)} rowCount={0} />
          </div>
        )}
      </div>
    )
  }

  // Total grid columns: row header + data columns + optional add-column button
  const gridCols = `180px repeat(${columns.length}, 260px)${showAddColumn ? " 120px" : ""}`
  const rowIds = rows.map((r) => rowDragId(r.label))
  const draggingRow = draggingRowLabel ? rows.find((r) => r.label === draggingRowLabel) : null

  return (
    <div className="roadmap-page">
      <div className="roadmap-header">
        <h1 className="roadmap-title">{roadmap.title}</h1>
        <div className="roadmap-header-actions">
          <button
            className="roadmap-btn roadmap-btn--ghost roadmap-btn--sm"
            onClick={() => setShowAddColumn(true)}
          >
            <IconPlus size={13} /> Add Column
          </button>
          <button
            className="roadmap-btn roadmap-btn--ghost roadmap-btn--sm"
            onClick={() => setShowAddRow(true)}
          >
            <IconPlus size={13} /> Add Row
          </button>
        </div>
      </div>

      {showAddRow && (
        <div style={{ marginBottom: 16 }}>
          <AddRowForm onAdd={handleAddRow} onCancel={() => setShowAddRow(false)} rowCount={rows.length} />
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="roadmap-grid-wrapper">
          <div className="roadmap-grid-scroll">
            <div
              className="roadmap-grid"
              style={{
                gridTemplateColumns: gridCols,
                gridTemplateRows: `auto repeat(${rows.length}, auto)`,
              }}
            >
              {/* Column headers row */}
              <div className="roadmap-corner" />
              {columns.map((col) => (
                <ColumnHeader
                  key={col}
                  name={col}
                  onRename={(newName) => handleRenameColumn(col, newName)}
                  onDelete={() => handleDeleteColumn(col)}
                  canDelete={columns.length > 1}
                />
              ))}
              {showAddColumn && (
                <div className="roadmap-column-header">
                  <AddColumnForm
                    onAdd={handleAddColumn}
                    onCancel={() => setShowAddColumn(false)}
                  />
                </div>
              )}

              {/* Data rows — sortable */}
              <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
                {rows.map((row) => (
                  <SortableRow
                    key={row.label}
                    row={row}
                    columns={columns}
                    cards={roadmap.cards}
                    showAddColumn={showAddColumn}
                    overCellId={overCellId}
                    onDeleteRow={() => handleDeleteRow(row.label)}
                    onUpdateRow={(updates) => handleUpdateRow(row.label, updates)}
                    onEditCard={setEditingCard}
                    onQuickAdd={handleQuickAdd}
                    quickAdd={quickAdd}
                    onQuickAddSubmit={handleQuickAddSubmit}
                    onQuickAddCancel={() => setQuickAdd(null)}
                  />
                ))}
              </SortableContext>
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeCard && <CardOverlay card={activeCard} />}
          {draggingRow && (
            <div className="roadmap-row-drag-preview">
              <span className="roadmap-row-color-dot" style={{ backgroundColor: draggingRow.color ?? "var(--border)" }} />
              <span className="roadmap-row-label">{draggingRow.label}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Card edit modal */}
      {editingCard && (
        <CardModal
          card={editingCard}
          onSave={handleCardSave}
          onDelete={handleCardDelete}
          onClose={() => setEditingCard(null)}
        />
      )}
    </div>
  )
}
