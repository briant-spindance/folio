import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { useFeatures } from "@/hooks/useData"

/**
 * Single-select autocomplete picker for associating an issue with a feature.
 *
 * Two display modes:
 * - `inline` (default): collapsed button showing current value, opens dropdown on click.
 *   Suited for detail-page sidebar where the value saves immediately on selection.
 * - `field`: always-visible search input, for use in edit/new forms.
 *
 * The dropdown is rendered via a React portal to `document.body` so it is
 * never clipped by ancestor overflow or stacking-context issues.
 */
export function FeaturePicker({
  value,
  onChange,
  mode = "inline",
}: {
  /** Current feature slug, or null/undefined for "no feature" */
  value: string | null | undefined
  /** Called with the selected feature slug, or null to clear */
  onChange: (slug: string | null) => void
  mode?: "inline" | "field"
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const [highlightIdx, setHighlightIdx] = useState(-1)

  const { data: featuresData } = useFeatures({ limit: 200 })
  const features = featuresData?.features ?? []

  // Build filtered list
  const filtered = search
    ? features.filter(
        (f) =>
          f.title.toLowerCase().includes(search.toLowerCase()) ||
          f.slug.toLowerCase().includes(search.toLowerCase()),
      )
    : features

  // Find selected feature for display
  const selectedFeature = value
    ? features.find((f) => f.slug === value)
    : null

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIdx(-1)
  }, [search])

  // Recalculate dropdown position
  const updatePosition = useCallback(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setDropdownPos({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: Math.max(rect.width, 240),
    })
  }, [])

  useEffect(() => {
    if (!open) return
    updatePosition()
    window.addEventListener("scroll", updatePosition, true)
    window.addEventListener("resize", updatePosition)
    return () => {
      window.removeEventListener("scroll", updatePosition, true)
      window.removeEventListener("resize", updatePosition)
    }
  }, [open, updatePosition])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      const inTrigger = ref.current?.contains(target)
      const inDropdown = dropdownRef.current?.contains(target)
      if (!inTrigger && !inDropdown) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  function select(slug: string | null) {
    onChange(slug)
    setOpen(false)
    setSearch("")
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      // +1 to account for "None" option at index -1 conceptually
      // filtered items are 0..N-1, "None" is a special entry
      setHighlightIdx((prev) => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightIdx((prev) => Math.max(prev - 1, -1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (highlightIdx === -1) {
        // Select "None"
        select(null)
      } else if (filtered[highlightIdx]) {
        select(filtered[highlightIdx].slug)
      }
    } else if (e.key === "Escape") {
      setOpen(false)
      setSearch("")
    }
  }

  // Inline mode: collapsed button
  if (mode === "inline" && !open) {
    return (
      <button
        className="feature-meta-inline-btn feature-picker-trigger"
        onClick={() => {
          setOpen(true)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
      >
        {selectedFeature ? (
          <span className="feature-picker-selected">{selectedFeature.title}</span>
        ) : (
          <span className="text-muted">None</span>
        )}
      </button>
    )
  }

  const dropdownPortal =
    open && dropdownPos
      ? createPortal(
          <div
            ref={dropdownRef}
            className="feature-picker-options feature-picker-options-portal"
            style={{
              position: "absolute",
              top: dropdownPos.top + 2,
              left: dropdownPos.left,
              width: dropdownPos.width,
            }}
          >
            {/* "None" option to clear */}
            <button
              className={`feature-picker-option ${highlightIdx === -1 && search ? "feature-picker-option-highlight" : ""} ${!value ? "feature-picker-option-active" : ""}`}
              onClick={() => select(null)}
              onMouseEnter={() => setHighlightIdx(-1)}
            >
              <span className="feature-picker-option-title">None</span>
            </button>
            {filtered.map((f, i) => (
              <button
                key={f.slug}
                className={`feature-picker-option ${i === highlightIdx ? "feature-picker-option-highlight" : ""} ${f.slug === value ? "feature-picker-option-active" : ""}`}
                onClick={() => select(f.slug)}
                onMouseEnter={() => setHighlightIdx(i)}
              >
                <span className="feature-picker-option-title">{f.title}</span>
                <span className="feature-picker-option-slug">{f.slug}</span>
              </button>
            ))}
            {filtered.length === 0 && search.trim() && (
              <span className="feature-picker-empty">No matching features</span>
            )}
          </div>,
          document.body,
        )
      : null

  return (
    <div
      className={`feature-picker-dropdown ${mode === "field" ? "feature-picker-dropdown-field" : ""}`}
      ref={ref}
    >
      <input
        ref={inputRef}
        className={mode === "field" ? "feature-picker-field-input" : "feature-picker-search"}
        type="text"
        value={search}
        placeholder={selectedFeature ? selectedFeature.title : "Search features..."}
        onChange={(e) => {
          setSearch(e.target.value)
          if (!open) setOpen(true)
        }}
        onFocus={() => {
          if (!open) setOpen(true)
        }}
        onKeyDown={handleKeyDown}
      />
      {/* Show a clear button when a feature is selected (field mode) */}
      {mode === "field" && value && (
        <button
          className="feature-picker-clear"
          onClick={() => onChange(null)}
          title="Clear feature"
          type="button"
        >
          &times;
        </button>
      )}
      {dropdownPortal}
    </div>
  )
}
