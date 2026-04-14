import { useState, useRef, useEffect } from "react"
import type { Project } from "@/lib/types"

interface ProjectSwitcherProps {
  projects: Project[]
  activeSlug: string
  onSwitch: (slug: string) => void
}

export function ProjectSwitcher({ projects, activeSlug, onSwitch }: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const active = projects.find((p) => p.slug === activeSlug)
  const displayName = active?.name ?? activeSlug

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open])

  return (
    <div className="project-switcher" ref={ref}>
      <button
        className="project-switcher-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        title="Switch project"
      >
        <span className="project-switcher-name">{displayName}</span>
        <svg
          className="project-switcher-chevron"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="project-switcher-dropdown" role="listbox">
          {projects.map((p) => (
            <button
              key={p.slug}
              className={`project-switcher-item${p.slug === activeSlug ? " active" : ""}`}
              role="option"
              aria-selected={p.slug === activeSlug}
              onClick={() => {
                if (p.slug !== activeSlug) {
                  onSwitch(p.slug)
                }
                setOpen(false)
              }}
            >
              <span className="project-switcher-item-name">{p.name}</span>
              {p.slug === activeSlug && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
