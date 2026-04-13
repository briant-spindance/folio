import { useEffect, useRef } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useProjectDoc } from "@/hooks/useData"
import { DocIcon } from "@/lib/docIcons"

// ── Helpers ──────────────────────────────────────────────────────

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
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
  const { data: doc, isLoading, error } = useProjectDoc(slug ?? "")
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
            <DocIcon name={doc.icon} size={18} />
          </div>
          <div className="docs-prose-meta-text">
            <span className="docs-prose-meta-title">{doc.title}</span>
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
