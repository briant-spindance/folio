import { Link, useParams } from "react-router-dom"
import { DocEditor } from "@/components/DocEditor"
import { useWikiDoc, useSaveWikiDoc } from "@/hooks/useData"
import type { SaveDocPayload } from "@/lib/types"

export function DocsEdit() {
  const { slug } = useParams<{ slug: string }>()
  const { data: doc, isLoading, error } = useWikiDoc(slug ?? "")
  const { mutate: saveDoc, isPending } = useSaveWikiDoc(slug ?? "")

  if (isLoading) {
    return (
      <div style={{ color: "var(--foreground-muted)", padding: "40px", textAlign: "center" }}>
        Loading…
      </div>
    )
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

  function handleSave(payload: SaveDocPayload) {
    saveDoc(payload)
  }

  // Strip the leading `# Title` line that the API stores verbatim — we edit title separately
  const bodyForEditor = doc.body.trimStart().replace(/^#\s+.+\n?/, "")

  return (
    <>
      <Link to={`/docs/${slug}`} className="docs-back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        {doc.title}
      </Link>

      <DocEditor
        initialTitle={doc.title}
        initialIcon={doc.icon}
        initialBody={bodyForEditor}
        onSave={handleSave}
        isSaving={isPending}
      />
    </>
  )
}
