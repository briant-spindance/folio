import { Link } from "react-router-dom"
import { DocEditor } from "@/components/DocEditor"
import { useCreateWikiDoc } from "@/hooks/useData"
import type { SaveDocPayload } from "@/lib/types"

export function DocsNew() {
  const { mutate: createDoc, isPending } = useCreateWikiDoc()

  function handleSave(payload: SaveDocPayload) {
    createDoc(payload)
  }

  return (
    <>
      <Link to="/docs" className="docs-back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Project Docs
      </Link>

      <DocEditor
        initialTitle=""
        initialIcon="file-text"
        initialBody=""
        onSave={handleSave}
        isSaving={isPending}
        isNew
      />
    </>
  )
}
