import { useParams, Link } from 'react-router-dom'
import { Header } from '@/components/layout/header'
import { MarkdownRenderer } from '@/components/markdown/renderer'
import { mockDocs } from '@/lib/mock-data'
import { Pencil, Trash2 } from 'lucide-react'

export default function DocsDetail() {
  const { slug } = useParams<{ slug: string }>()
  const doc = mockDocs.find((d) => d.slug === slug)

  if (!doc) {
    return (
      <>
        <Header />
        <div className="p-6 max-w-[1200px] mx-auto">
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface py-16">
            <p className="text-sm font-medium text-foreground">Not Found</p>
            <p className="text-sm text-foreground-muted mt-1">
              The document you're looking for doesn't exist.
            </p>
            <Link
              to="/docs"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors mt-4"
            >
              Back to Documents
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header
        action={
          <div className="flex items-center gap-1">
            <Link
              to={`/docs/${doc.slug}/edit`}
              className="rounded-md p-1.5 text-foreground-muted hover:bg-accent hover:text-foreground transition-colors"
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </Link>
            <button
              className="rounded-md p-1.5 text-foreground-muted hover:bg-accent hover:text-foreground transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <div className="p-6 max-w-[1200px] mx-auto">
        <div className="rounded-lg border border-border bg-surface p-6">
          <MarkdownRenderer content={doc.body} />
        </div>
      </div>
    </>
  )
}
