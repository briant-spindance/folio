import { useState, useRef, useEffect, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useSearch } from "@/hooks/useData"
import { useDebounce } from "@/hooks/useDebounce"
import type { SearchResult } from "@/lib/types"

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  wiki: "Doc",
  feature: "Feature",
  issue: "Issue",
}

function resultPath(r: SearchResult, query: string): string {
  const q = encodeURIComponent(query)
  if (r.type === "wiki") return `/docs/${r.slug}?q=${q}`
  if (r.type === "feature") return `/features/${r.slug}?q=${q}`
  return `/issues/${r.slug}?q=${q}`
}

/** Render a snippet with **bold** markers as actual <strong> elements */
function SnippetText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

export function SearchBar() {
  const [inputValue, setInputValue] = useState("")
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Active highlight query from the current page's URL
  const activeHighlight = searchParams.get("q") ?? ""

  function clearHighlight() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete("q")
      return next
    }, { replace: true })
  }

  const debouncedQuery = useDebounce(inputValue.trim(), 300)
  const { data, isFetching } = useSearch(debouncedQuery)

  const results = data?.results ?? []

  // Open dropdown when there are results or we're fetching
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setOpen(true)
      setActiveIndex(-1)
    } else {
      setOpen(false)
    }
  }, [debouncedQuery])

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [])

  // Global keyboard shortcut: "/" or Cmd+K to focus
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      const isEditable =
        tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable
      if ((e.key === "/" && !isEditable) || (e.key === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleClear = useCallback(() => {
    setInputValue("")
    setOpen(false)
    setActiveIndex(-1)
    inputRef.current?.blur()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return

    if (e.key === "Escape") {
      handleClear()
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
      return
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
      return
    }

    if (e.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
      e.preventDefault()
      navigate(resultPath(results[activeIndex], debouncedQuery))
      handleClear()
    }
  }

  function handleResultClick(r: SearchResult) {
    navigate(resultPath(r, debouncedQuery))
    handleClear()
  }

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})
  const groupOrder: SearchResult["type"][] = ["wiki", "feature", "issue"]

  let flatIndex = 0

  return (
    <div className="header-search" ref={containerRef}>
      <div className="header-search-input-wrap">
        {/* Search icon */}
        <svg
          className="header-search-icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          ref={inputRef}
          className="header-search-input"
          type="text"
          placeholder="Search…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => {
            if (debouncedQuery.length >= 2) setOpen(true)
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />

        {/* Keyboard hint / spinner */}
        <span className="header-search-hint">
          {isFetching ? (
            <svg
              className="header-search-spinner"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          ) : inputValue.length === 0 ? (
            <kbd>/</kbd>
          ) : null}
        </span>
      </div>

      {activeHighlight && (
        <button type="button" className="header-search-active-tag" onClick={clearHighlight}>
          {activeHighlight}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      {open && (
        <div className="search-dropdown">
          {results.length === 0 && !isFetching ? (
            <div className="search-empty">No results for &ldquo;{debouncedQuery}&rdquo;</div>
          ) : (
            groupOrder.map((type) => {
              const group = grouped[type]
              if (!group || group.length === 0) return null
              return (
                <div key={type} className="search-group">
                  <div className="search-group-label">{TYPE_LABELS[type]}s</div>
                  {group.map((r) => {
                    const idx = flatIndex++
                    return (
                      <button
                        key={`${r.type}-${r.slug}`}
                        className={`search-result-item${activeIndex === idx ? " is-active" : ""}`}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => handleResultClick(r)}
                        type="button"
                      >
                        <span className={`search-result-type search-result-type--${r.type}`}>
                          {TYPE_LABELS[r.type]}
                        </span>
                        <span className="search-result-body">
                          <span className="search-result-title">{r.title}</span>
                          <span className="search-result-snippet">
                            <SnippetText text={r.snippet} />
                          </span>
                        </span>
                        {r.status && (
                          <span className={`search-result-status search-result-status--${r.status.replace(/\s+/g, "-")}`}>
                            {r.status}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
