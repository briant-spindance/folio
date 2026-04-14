import { Link, useSearchParams } from "react-router-dom"
import { DocEditor } from "@/components/DocEditor"
import { useCreateWikiDoc } from "@/hooks/useData"
import type { SaveDocPayload } from "@/lib/types"

export function WikiNew() {
  const { mutate: createDoc, isPending } = useCreateWikiDoc()
  const [searchParams] = useSearchParams()

  // Support pre-filling title from wikilink click-through (?title=...)
  const prefillTitle = searchParams.get("title") ?? ""

  function handleSave(payload: SaveDocPayload) {
    createDoc(payload)
  }

  return (
    <>
      <Link to="/wiki" className="docs-back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Wiki
      </Link>

      <DocEditor
        initialTitle={prefillTitle}
        initialIcon="file-text"
        initialBody=""
        onSave={handleSave}
        isSaving={isPending}
        isNew
      />
    </>
  )
}
