import { Link } from "react-router-dom"
import { useWikiDocs } from "@/hooks/useData"
import { docIcon } from "@/lib/docIcons"

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

export function DocsList() {
  const { data, isLoading, error } = useWikiDocs()

  if (isLoading) {
    return <div style={{ color: "var(--foreground-muted)", padding: "40px", textAlign: "center" }}>Loading…</div>
  }
  if (error || !data) {
    return <div style={{ color: "var(--status-error)", padding: "40px" }}>Failed to load docs.</div>
  }

  return (
    <div className="card">
      <div className="docs-list-header">
        <span className="docs-list-title">Project Docs</span>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="docs-list-count">{data.length} document{data.length !== 1 ? "s" : ""}</span>
          <Link
            to="/docs/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "var(--primary-foreground)",
              background: "var(--primary)",
              textDecoration: "none",
              padding: "5px 12px",
              borderRadius: "6px",
              transition: "background 100ms",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Doc
          </Link>
        </div>
      </div>
      <div className="docs-list">
        {data.map((doc) => (
          <Link key={doc.slug} className="docs-list-row" to={`/docs/${doc.slug}`}>
            <div className="docs-list-row-icon">
              {docIcon(doc.icon, 18)}
            </div>
            <div className="docs-list-row-body">
              <span className="docs-list-row-title">{doc.title}</span>
              {doc.description && (
                <span className="docs-list-row-desc">{doc.description}</span>
              )}
            </div>
            <span className="docs-list-row-date">{formatRelativeDate(doc.updatedAt)}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
