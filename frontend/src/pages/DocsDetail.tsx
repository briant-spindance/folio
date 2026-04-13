import { useEffect, useRef } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useWikiDoc, useDeleteWikiDoc } from "@/hooks/useData"
import { docIcon } from "@/lib/docIcons"

// ── Helpers ──────────────────────────────────────────────────────

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

function formatUpdatedAt(dateStr?: string | null): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

// ── Highlight helpers ─────────────────────────────────────────────

/**
 * Walk text nodes inside `root`, wrapping every case-insensitive match of
 * `query` in a <mark class="search-highlight"> element.
 */
function applyHighlights(root: HTMLElement, query: string): number {
  if (!query) return 0

  const lq = query.toLowerCase()
  let count = 0

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      const tag = parent.tagName.toLowerCase()
      if (tag === "mark" || tag === "script" || tag === "style" || tag === "code" || tag === "pre") {
        return NodeFilter.FILTER_REJECT
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })

  const textNodes: Text[] = []
  let n: Node | null
  while ((n = walker.nextNode())) textNodes.push(n as Text)

  for (const textNode of textNodes) {
    const text = textNode.nodeValue ?? ""
    const lower = text.toLowerCase()
    let idx = lower.indexOf(lq)
    if (idx === -1) continue

    const frag = document.createDocumentFragment()
    let last = 0

    while (idx !== -1) {
      if (idx > last) {
        frag.appendChild(document.createTextNode(text.slice(last, idx)))
      }
      const mark = document.createElement("mark")
      mark.className = "search-highlight"
      mark.textContent = text.slice(idx, idx + query.length)
      frag.appendChild(mark)
      count++
      last = idx + query.length
      idx = lower.indexOf(lq, last)
    }

    if (last < text.length) {
      frag.appendChild(document.createTextNode(text.slice(last)))
    }

    textNode.parentNode?.replaceChild(frag, textNode)
  }

  return count
}

/** Remove all <mark class="search-highlight"> elements, restoring text nodes. */
function removeHighlights(root: HTMLElement) {
  const marks = root.querySelectorAll("mark.search-highlight")
  for (const mark of marks) {
    const parent = mark.parentNode
    if (!parent) continue
    parent.replaceChild(document.createTextNode(mark.textContent ?? ""), mark)
    parent.normalize()
  }
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
  const [searchParams] = useSearchParams()
  const { data: doc, isLoading, error } = useWikiDoc(slug ?? "")
  const { mutate: deleteDoc, isPending: isDeleting } = useDeleteWikiDoc()
  const contentRef = useRef<HTMLDivElement>(null)

  const searchQuery = searchParams.get("q") ?? ""

  useEffect(() => {
    const root = contentRef.current
    if (!root) return
    removeHighlights(root)
    if (!searchQuery) return
    applyHighlights(root, searchQuery)
    const first = root.querySelector("mark.search-highlight")
    if (first) {
      first.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [searchQuery, doc])

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

      <div className="docs-prose" ref={contentRef}>
        <div className="docs-prose-meta">
          <div className="docs-prose-icon">
            {docIcon(doc.icon, 18)}
          </div>
          <div className="docs-prose-meta-text">
            <span className="docs-prose-meta-title">{doc.title}</span>
            {doc.updated_at && (
              <span className="docs-prose-meta-updated">
                Last updated {formatUpdatedAt(doc.updated_at)}
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
    </>
  )
}
