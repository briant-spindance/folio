import { useParams } from 'react-router-dom'
import { useWikiDoc } from '@/hooks/useData'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Calendar } from 'lucide-react'

export function DocsDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { data, isLoading, error } = useWikiDoc(slug ?? '')

  if (isLoading) {
    return <div className="text-[var(--foreground-muted)] text-sm">Loading…</div>
  }
  if (error || !data) {
    return <div className="text-[var(--status-error)] text-sm">Document not found.</div>
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Project Docs', to: '/docs' },
          { label: data.title },
        ]}
      />

      <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--card-radius)] p-6">
        <div className="mb-4 pb-4 border-b border-[var(--border)]">
          <h1 className="text-xl font-semibold text-[var(--foreground)] mb-1">{data.title}</h1>
          {data.description && (
            <p className="text-[0.875rem] text-[var(--foreground-muted)]">{data.description}</p>
          )}
          {data.updatedAt && (
            <div className="flex items-center gap-1 mt-2 text-[0.75rem] text-[var(--foreground-subtle)]">
              <Calendar size={12} />
              {data.updatedAt}
            </div>
          )}
        </div>

        <div
          className="prose prose-sm max-w-none text-[var(--foreground)] text-[0.875rem] leading-relaxed"
          dangerouslySetInnerHTML={{ __html: data.body }}
        />
      </div>
    </>
  )
}
