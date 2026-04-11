import { useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useWikiDoc, useDeleteWikiDoc } from "@/hooks/useData"
import { docIcon } from "@/lib/docIcons"

// ── Types ────────────────────────────────────────────────────────

interface TocEntry {
  id: string
  text: string
  depth: 2 | 3
}

// ── Helpers ──────────────────────────────────────────────────────

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

function extractToc(markdown: string): TocEntry[] {
  const entries: TocEntry[] = []
  const lines = markdown.split("\n")
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/)
    const h3 = line.match(/^###\s+(.+)$/)
    if (h2) {
      const text = h2[1].trim()
      entries.push({ id: slugifyHeading(text), text, depth: 2 })
    } else if (h3) {
      const text = h3[1].trim()
      entries.push({ id: slugifyHeading(text), text, depth: 3 })
    }
  }
  return entries
}

function formatUpdatedAt(dateStr?: string | null): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

// ── TOC with active heading tracking ─────────────────────────────

function TableOfContents({ entries }: { entries: TocEntry[] }) {
  const [activeId, setActiveId] = useState<string>("")

  useEffect(() => {
    if (entries.length === 0) return

    const headingEls = entries
      .map(({ id }) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[]

    const observer = new IntersectionObserver(
      (obs) => {
        const visible = obs.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: "-48px 0px -60% 0px", threshold: 0 }
    )

    headingEls.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [entries])

  if (entries.length === 0) return null

  return (
    <nav className="docs-toc">
      <div className="docs-toc-heading">On this page</div>
      <ul className="docs-toc-list">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              className={`docs-toc-item depth-${entry.depth}${activeId === entry.id ? " active" : ""}`}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(entry.id)?.scrollIntoView({ behavior: "smooth" })
                setActiveId(entry.id)
              }}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// ── Custom heading renderer that adds id anchors ─────────────────

function headingRenderer(depth: 2 | 3 | 4) {
  return function Heading({ children }: { children?: React.ReactNode }) {
    const text = typeof children === "string" ? children : ""
    const id = slugifyHeading(text)
    const Tag = `h${depth}` as "h2" | "h3" | "h4"
    return <Tag id={id}>{children}</Tag>
  }
}

// ── Page component ───────────────────────────────────────────────

export function DocsDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { data: doc, isLoading, error } = useWikiDoc(slug ?? "")
  const { mutate: deleteDoc, isPending: isDeleting } = useDeleteWikiDoc()
  const contentRef = useRef<HTMLDivElement>(null)

  if (isLoading) {
    return <div style={{ color: "var(--foreground-muted)", padding: "40px", textAlign: "center" }}>Loading…</div>
  }
  if (error || !doc) {
    return (
      <div className="card" style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ color: "var(--status-error)" }}>Document not found.</p>
        <Link to="/docs" className="docs-back-link" style={{ justifyContent: "center", marginTop: "12px", marginBottom: 0 }}>
          ← Back to docs
        </Link>
      </div>
    )
  }

  const toc = extractToc(doc.body)
  // Strip leading whitespace then a `# Title` line so it doesn't duplicate the meta header
  const body = doc.body.trimStart().replace(/^#\s+.+\n?/, "")

  return (
    <>
      <Link to="/docs" className="docs-back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Project Docs
      </Link>

      <div className="docs-detail-layout">
        <TableOfContents entries={toc} />

        <div className="docs-prose" ref={contentRef}>
          <div className="docs-prose-meta">
            <div className="docs-prose-icon">
              {docIcon(doc.icon, 18)}
            </div>
            <div className="docs-prose-meta-text">
              <span className="docs-prose-meta-title">{doc.title}</span>
              {doc.updatedAt && (
                <span className="docs-prose-meta-updated">
                  Last updated {formatUpdatedAt(doc.updatedAt)}
                </span>
              )}
            </div>
            {/* Edit / Delete actions */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
              <Link
                to={`/docs/${slug}/edit`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: "var(--primary)",
                  textDecoration: "none",
                  padding: "4px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  background: "var(--surface)",
                  transition: "background 100ms, border-color 100ms",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </Link>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  if (confirm(`Delete "${doc.title}"? This cannot be undone.`)) {
                    deleteDoc(slug ?? "")
                  }
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: "var(--status-error)",
                  padding: "4px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  background: "var(--surface)",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  transition: "background 100ms, border-color 100ms",
                  opacity: isDeleting ? 0.6 : 1,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>

          <div className="docs-prose-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1>{children}</h1>,
                h2: headingRenderer(2),
                h3: headingRenderer(3),
                h4: headingRenderer(4),
              }}
            >
              {body}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </>
  )
}
