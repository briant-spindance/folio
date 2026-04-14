import { useEffect, useRef, useState, useMemo } from "react"
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useWikiDoc, useWikiDocs, useDeleteWikiDoc } from "@/hooks/useData"
import { DocIcon } from "@/lib/docIcons"
import type { WikiDocDetail } from "@/lib/types"

// ── Helpers ──────────────────────────────────────────────────────

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

function formatRelativeDate(dateStr?: string | null): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "Updated today"
  if (diffDays === 1) return "Updated yesterday"
  if (diffDays < 7) return `Updated ${diffDays} days ago`
  if (diffDays < 14) return "Updated 1 week ago"
  return `Updated ${Math.floor(diffDays / 7)} weeks ago`
}

// ── Highlight helpers ─────────────────────────────────────────────

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

function removeHighlights(root: HTMLElement) {
  const marks = root.querySelectorAll("mark.search-highlight")
  for (const mark of marks) {
    const parent = mark.parentNode
    if (!parent) continue
    parent.replaceChild(document.createTextNode(mark.textContent ?? ""), mark)
    parent.normalize()
  }
}

// ── Wikilink processing ──────────────────────────────────────────

const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g

/**
 * Build a lookup of slug/alias -> { slug, title } from the list of all wiki docs.
 */
function buildSlugLookup(docs: WikiDocDetail[]): Map<string, { slug: string; title: string }> {
  const map = new Map<string, { slug: string; title: string }>()
  for (const doc of docs) {
    const entry = { slug: doc.slug, title: doc.title }
    map.set(doc.slug, entry)
    for (const alias of doc.aliases ?? []) {
      map.set(alias, entry)
    }
  }
  return map
}

/**
 * Process markdown text to replace [[wikilinks]] with markdown links.
 * Returns the processed markdown string.
 */
function processWikilinks(
  text: string,
  slugLookup: Map<string, { slug: string; title: string }>,
  currentSlug: string,
): string {
  return text.replace(WIKILINK_RE, (_match, target: string, displayText?: string) => {
    const trimmedTarget = target.trim()
    const resolved = slugLookup.get(trimmedTarget)
    if (resolved) {
      const label = displayText?.trim() || resolved.title
      if (resolved.slug === currentSlug) {
        // Self-link: just render as bold text
        return `**${label}**`
      }
      return `[${label}](/wiki/${resolved.slug})`
    }
    // Broken link: render with special class via HTML
    const label = displayText?.trim() || trimmedTarget
    return `[${label}](/wiki/new?title=${encodeURIComponent(trimmedTarget)})`
  })
}

// ── Custom heading renderer ──────────────────────────────────────

function headingRenderer(depth: 2 | 3 | 4) {
  return function Heading({ children }: { children?: React.ReactNode }) {
    const text = typeof children === "string" ? children : ""
    const id = slugifyHeading(text)
    const Tag = `h${depth}` as "h2" | "h3" | "h4"
    return <Tag id={id}>{children}</Tag>
  }
}

// ── Custom link renderer (for wikilink styling) ──────────────────

function WikiLinkRenderer({
  href,
  children,
}: {
  href?: string
  children?: React.ReactNode
}) {
  const navigate = useNavigate()

  if (href?.startsWith("/wiki/")) {
    const isBroken = href.startsWith("/wiki/new?title=")
    return (
      <a
        href={href}
        className={isBroken ? "wikilink wikilink--broken" : "wikilink"}
        onClick={(e) => {
          e.preventDefault()
          navigate(href)
        }}
      >
        {children}
      </a>
    )
  }

  // Regular external links
  return <a href={href}>{children}</a>
}

// ── Delete confirmation dialog ───────────────────────────────────

function DeleteConfirmDialog({
  title,
  onConfirm,
  onCancel,
}: {
  title: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 8px" }}>Delete wiki page?</h3>
        <p style={{ color: "var(--foreground-muted)", margin: "0 0 16px", fontSize: "0.875rem" }}>
          Are you sure you want to delete <strong>{title}</strong>? This action cannot be undone.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button className="btn btn-sm btn-outline" onClick={onCancel}>Cancel</button>
          <button className="btn btn-sm btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}

// ── Page component ───────────────────────────────────────────────

export function WikiDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const { data: doc, isLoading, error } = useWikiDoc(slug ?? "")
  const { data: allDocs } = useWikiDocs({ limit: 100 })
  const { mutate: deleteDoc, isPending: isDeleting } = useDeleteWikiDoc()
  const contentRef = useRef<HTMLDivElement>(null)
  const [showDelete, setShowDelete] = useState(false)

  const searchQuery = searchParams.get("q") ?? ""

  // Build slug lookup for wikilink resolution
  const slugLookup = useMemo(
    () => buildSlugLookup(allDocs?.docs ?? []),
    [allDocs?.docs]
  )

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
    return <div style={{ color: "var(--foreground-muted)", padding: "40px", textAlign: "center" }}>Loading...</div>
  }
  if (error || !doc) {
    return (
      <div className="card" style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ color: "var(--status-error)" }}>Wiki page not found.</p>
        <Link to="/wiki" className="docs-back-link" style={{ justifyContent: "center", marginTop: "12px", marginBottom: 0 }}>
          ← Back to wiki
        </Link>
      </div>
    )
  }

  // Strip leading `# Title` line (rendered separately in meta header)
  const rawBody = doc.body.trimStart().replace(/^#\s+.+\n?/, "")
  // Process wikilinks into markdown links
  const body = processWikilinks(rawBody, slugLookup, slug ?? "")

  const backlinks = doc.backlinks ?? []

  return (
    <>
      <Link to="/wiki" className="docs-back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Wiki
      </Link>

      <div className="docs-prose" ref={contentRef}>
        <div className="docs-prose-meta">
          <div className="docs-prose-icon">
            <DocIcon name={doc.icon} size={18} />
          </div>
          <div className="docs-prose-meta-text">
            <span className="docs-prose-meta-title">{doc.title}</span>
            <span className="docs-prose-meta-updated">{formatRelativeDate(doc.updated_at)}</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
            <Link to={`/wiki/${slug}/edit`} className="btn btn-sm btn-outline">Edit</Link>
            <button
              className="btn btn-sm btn-outline btn-danger-outline"
              onClick={() => setShowDelete(true)}
              disabled={isDeleting}
            >
              Delete
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
              a: WikiLinkRenderer,
            }}
          >
            {body}
          </ReactMarkdown>
        </div>

        {/* Backlinks section */}
        {backlinks.length > 0 && (
          <div className="backlinks-section">
            <h4 className="backlinks-heading">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 17H7A5 5 0 0 1 7 7h2" />
                <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
                <line x1="8" x2="16" y1="12" y2="12" />
              </svg>
              Pages that link here
            </h4>
            <ul className="backlinks-list">
              {backlinks.map((bl) => (
                <li key={bl.slug}>
                  <Link to={`/wiki/${bl.slug}`} className="backlinks-link">
                    {bl.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {showDelete && (
        <DeleteConfirmDialog
          title={doc.title}
          onConfirm={() => {
            deleteDoc(slug ?? "")
            setShowDelete(false)
          }}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </>
  )
}
