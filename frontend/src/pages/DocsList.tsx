import { Link } from "react-router-dom"
import { useProjectDocs } from "@/hooks/useData"
import { DocIcon } from "@/lib/docIcons"

// ---------------------------------------------------------------------------
// DocsList page — shows read-only project documents from project-docs/
// ---------------------------------------------------------------------------
export function DocsList() {
  const { data, isLoading, error } = useProjectDocs()

  if (isLoading) {
    return <div style={{ color: "var(--foreground-muted)", padding: "40px", textAlign: "center" }}>Loading…</div>
  }
  if (error || !data) {
    return <div style={{ color: "var(--status-error)", padding: "40px" }}>Failed to load docs.</div>
  }

  const docs = data.docs ?? []

  return (
    <div className="card">
      <div className="docs-list-header">
        <span className="docs-list-title">Project Docs</span>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="docs-list-count">{docs.length} document{docs.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
      <div className="docs-list">
        {docs.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--foreground-muted)" }}>
            No project documents yet. Add <code>.md</code> files to the <code>folio/project-docs/</code> directory.
          </div>
        ) : (
          docs.map((doc) => (
            <Link key={doc.slug} className="docs-list-row-wrap" to={`/docs/${doc.slug}`}>
              <div className="docs-list-row">
                <div className="docs-list-row-icon">
                  <DocIcon name={doc.icon} size={18} />
                </div>
                <div className="docs-list-row-body">
                  <span className="docs-list-row-title">{doc.title}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
