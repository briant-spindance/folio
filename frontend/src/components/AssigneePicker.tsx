import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"

/**
 * Multi-select assignee picker with team autocomplete.
 *
 * Two display modes:
 * - `inline` (default): collapsed button showing chips, opens dropdown on click
 * - `field`: always-visible search input with dropdown, for use in edit forms
 *
 * The dropdown is rendered via a React portal to `document.body` so it is
 * never clipped by ancestor overflow or stacking-context issues.
 */
export function AssigneePicker({
  value,
  teamMembers,
  onChange,
  mode = "inline",
}: {
  value: string[]
  teamMembers: string[]
  onChange: (v: string[]) => void
  mode?: "inline" | "field"
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)       // wraps the trigger / token-input
  const dropdownRef = useRef<HTMLDivElement>(null) // the portal dropdown
  const inputRef = useRef<HTMLInputElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)

  // Recalculate dropdown position whenever it opens or the window scrolls/resizes
  const updatePosition = useCallback(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setDropdownPos({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
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

  // Close on outside click (must check both the trigger ref AND the portal dropdown ref)
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

  // Merge team + any existing assignees not in team
  const allOptions = Array.from(new Set([...teamMembers, ...value])).sort()
  const filtered = search
    ? allOptions.filter((n) => n.toLowerCase().includes(search.toLowerCase()))
    : allOptions

  function toggle(name: string) {
    const next = value.includes(name)
      ? value.filter((n) => n !== name)
      : [...value, name]
    onChange(next)
  }

  function addCustom() {
    const trimmed = search.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setSearch("")
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      const exact = filtered.find((n) => n.toLowerCase() === search.trim().toLowerCase())
      if (exact) {
        toggle(exact)
        setSearch("")
      } else if (search.trim()) {
        addCustom()
      }
    } else if (e.key === "Escape") {
      setOpen(false)
      setSearch("")
    }
  }

  // Inline mode: collapsed button that opens the dropdown
  if (mode === "inline" && !open) {
    return (
      <button
        className="feature-meta-inline-btn feature-assignee-trigger"
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) }}
      >
        {value.length > 0 ? (
          <span className="feature-assignee-chips">
            {value.map((name) => (
              <span key={name} className="feature-assignee-chip">{name}</span>
            ))}
          </span>
        ) : (
          <span className="text-muted">Unassigned</span>
        )}
      </button>
    )
  }

  // Field mode: always show chips + input
  // Inline mode when open: show search + dropdown
  const isFieldMode = mode === "field"

  // Dropdown rendered via portal so it escapes all stacking contexts
  const dropdownPortal = open && dropdownPos
    ? createPortal(
        <div
          ref={dropdownRef}
          className="feature-assignee-options feature-assignee-options-portal"
          style={{
            position: "absolute",
            top: dropdownPos.top + 2,
            left: dropdownPos.left,
            width: dropdownPos.width,
          }}
        >
          {filtered.map((name) => (
            <label key={name} className="feature-assignee-option">
              <input
                type="checkbox"
                checked={value.includes(name)}
                onChange={() => toggle(name)}
              />
              <span>{name}</span>
            </label>
          ))}
          {search.trim() && !filtered.some((n) => n.toLowerCase() === search.trim().toLowerCase()) && (
            <button
              className="feature-assignee-add"
              onClick={addCustom}
            >
              Add &ldquo;{search.trim()}&rdquo;
            </button>
          )}
          {filtered.length === 0 && !search.trim() && (
            <span className="feature-assignee-empty">No team members</span>
          )}
        </div>,
        document.body,
      )
    : null

  return (
    <div className={`feature-assignee-dropdown ${isFieldMode ? "feature-assignee-dropdown-field" : ""}`} ref={ref}>
      {isFieldMode ? (
        <div className="feature-assignee-token-input">
          {value.map((name) => (
            <span key={name} className="feature-assignee-chip">
              {name}
              <button
                className="feature-assignee-chip-remove"
                onClick={() => toggle(name)}
                aria-label={`Remove ${name}`}
              >
                &times;
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            className="feature-assignee-token-search"
            type="text"
            value={search}
            placeholder={value.length === 0 ? "Search or add..." : ""}
            onChange={(e) => {
              setSearch(e.target.value)
              if (!open) setOpen(true)
            }}
            onFocus={() => { if (!open) setOpen(true) }}
            onKeyDown={handleKeyDown}
          />
        </div>
      ) : (
        <input
          ref={inputRef}
          className="feature-assignee-search"
          type="text"
          value={search}
          placeholder="Search or add..."
          onChange={(e) => {
            setSearch(e.target.value)
            if (!open) setOpen(true)
          }}
          onFocus={() => { if (!open) setOpen(true) }}
          onKeyDown={handleKeyDown}
        />
      )}
      {dropdownPortal}
    </div>
  )
}
