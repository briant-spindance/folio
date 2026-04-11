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
        <span className="docs-list-count">{data.length} document{data.length !== 1 ? "s" : ""}</span>
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
