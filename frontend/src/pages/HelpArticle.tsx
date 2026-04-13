import { useMemo } from "react"
import { Link, useParams, Navigate } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { helpArticles, getHelpArticle } from "@/lib/helpContent"

// ── Helpers ──────────────────────────────────────────────────────

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

/** Extract h2/h3 headings from markdown for the table of contents. */
function extractToc(markdown: string): { id: string; text: string; depth: number }[] {
  const toc: { id: string; text: string; depth: number }[] = []
  const lines = markdown.split("\n")
  let inCodeBlock = false

  for (const line of lines) {
    // Track fenced code blocks to avoid treating # inside code as headings
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue

    const match = line.match(/^(#{2,3})\s+(.+)$/)
    if (match) {
      const depth = match[1].length
      const text = match[2].trim()
      toc.push({ id: slugifyHeading(text), text, depth })
    }
  }

  return toc
}

// ── Custom heading renderers ─────────────────────────────────────

function headingRenderer(depth: 1 | 2 | 3 | 4) {
  return function Heading({ children }: { children?: React.ReactNode }) {
    const text = extractText(children)
    const id = slugifyHeading(text)
    const Tag = `h${depth}` as "h1" | "h2" | "h3" | "h4"
    return <Tag id={id}>{children}</Tag>
  }
}

/** Recursively extract text from React children. */
function extractText(children: React.ReactNode): string {
  if (typeof children === "string") return children
  if (typeof children === "number") return String(children)
  if (Array.isArray(children)) return children.map(extractText).join("")
  if (children && typeof children === "object" && "props" in children) {
    const el = children as { props: { children?: React.ReactNode } }
    return extractText(el.props.children)
  }
  return ""
}

// ── Custom link renderer (resolve /help/ links) ──────────────────

function linkRenderer({ href, children }: { href?: string; children?: React.ReactNode }) {
  // Convert internal /help/ links to React Router Links
  if (href && href.startsWith("/help/")) {
    return <Link to={href}>{children}</Link>
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

// ── Page component ───────────────────────────────────────────────

export function HelpArticle() {
  const { slug } = useParams<{ slug: string }>()
  const article = getHelpArticle(slug ?? "")

  // Find prev/next articles for sequential navigation
  const { prev, next } = useMemo(() => {
    if (!article) return { prev: undefined, next: undefined }
    const idx = helpArticles.findIndex((a) => a.slug === article.slug)
    return {
      prev: idx > 0 ? helpArticles[idx - 1] : undefined,
      next: idx < helpArticles.length - 1 ? helpArticles[idx + 1] : undefined,
    }
  }, [article])

  const toc = useMemo(() => {
    if (!article) return []
    return extractToc(article.body)
  }, [article])

  if (!article) {
    return <Navigate to="/help" replace />
  }

  // Strip leading # Title line from body if it matches the frontmatter title
  const body = article.body.trimStart().replace(/^#\s+.+\n?/, "")

  return (
    <>
      <Link to="/help" className="docs-back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Help & Documentation
      </Link>

      <div className="help-article-layout">
        <div className="docs-prose">
          <div className="docs-prose-meta">
            <div className="docs-prose-meta-text">
              <span className="docs-prose-meta-title">{article.title}</span>
              {article.description && (
                <span className="docs-prose-meta-updated">{article.description}</span>
              )}
            </div>
          </div>

          <div className="docs-prose-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: headingRenderer(1),
                h2: headingRenderer(2),
                h3: headingRenderer(3),
                h4: headingRenderer(4),
                a: linkRenderer,
              }}
            >
              {body}
            </ReactMarkdown>
          </div>

          {/* Prev / Next navigation */}
          {(prev || next) && (
            <div className="help-article-nav">
              {prev ? (
                <Link to={`/help/${prev.slug}`} className="help-article-nav-link help-article-nav-prev">
                  <span className="help-article-nav-label">Previous</span>
                  <span className="help-article-nav-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                    {prev.title}
                  </span>
                </Link>
              ) : <div />}
              {next ? (
                <Link to={`/help/${next.slug}`} className="help-article-nav-link help-article-nav-next">
                  <span className="help-article-nav-label">Next</span>
                  <span className="help-article-nav-title">
                    {next.title}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </span>
                </Link>
              ) : <div />}
            </div>
          )}
        </div>

        {/* Table of contents sidebar */}
        {toc.length > 2 && (
          <aside className="help-toc">
            <span className="help-toc-heading">On this page</span>
            <nav className="help-toc-nav">
              {toc.map((entry) => (
                <a
                  key={entry.id}
                  href={`#${entry.id}`}
                  className={`help-toc-link ${entry.depth === 3 ? "help-toc-link-nested" : ""}`}
                >
                  {entry.text}
                </a>
              ))}
            </nav>
          </aside>
        )}
      </div>
    </>
  )
}
