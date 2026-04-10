import { useParams, useNavigate } from 'react-router-dom'
import { Header } from '@/components/layout/header'
import { MarkdownEditor } from '@/components/markdown/editor'
import { mockDocs } from '@/lib/mock-data'
import { useState } from 'react'

export default function DocsEditor() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const isEditing = Boolean(slug)
  const existingDoc = isEditing ? mockDocs.find((d) => d.slug === slug) : null

  const [filename, setFilename] = useState('')
  const [body, setBody] = useState(existingDoc?.body ?? '')

  const handleSave = () => {
    navigate(isEditing ? `/docs/${slug}` : '/docs')
  }

  const handleCancel = () => {
    navigate(isEditing ? `/docs/${slug}` : '/docs')
  }

  return (
    <>
      <Header />

      <div className="p-6 max-w-[1200px] mx-auto">
        <div className="flex flex-col gap-5">
          {!isEditing && (
            <div>
              <label
                htmlFor="doc-filename"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Filename
              </label>
              <input
                id="doc-filename"
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="e.g. architecture-decisions"
                className="w-full rounded-md border border-border bg-surface-inset px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Content
            </label>
            <MarkdownEditor value={body} onChange={setBody} />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={handleCancel}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              {isEditing ? 'Save Changes' : 'Create Document'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
