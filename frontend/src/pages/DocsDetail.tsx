import { useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import { useWikiDoc } from "@/hooks/useData"
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
          </div>

          <div className="docs-prose-body">
            <ReactMarkdown
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
