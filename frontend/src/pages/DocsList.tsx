import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { useWiki } from '@/hooks/useData'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export function DocsList() {
  const { data, isLoading, error } = useWiki()

  return (
    <>
      <Breadcrumbs items={[{ label: 'Project Docs' }]} />
      <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--card-radius)] p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[0.6875rem] font-semibold text-[var(--foreground-muted)] uppercase tracking-[0.05em] flex items-center gap-1.5">
            <BookOpen size={14} />
            Project Docs
          </span>
        </div>

        {isLoading && (
          <div className="text-[var(--foreground-muted)] text-sm py-4">Loading…</div>
        )}
        {(error || (!isLoading && !data)) && (
          <div className="text-[var(--status-error)] text-sm py-4">Failed to load docs.</div>
        )}

        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.map((doc) => (
              <Link
                key={doc.slug}
                to={`/docs/${doc.slug}`}
                className="flex items-start gap-3 p-4 rounded-md border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-inset)] no-underline transition-colors duration-100"
              >
                <span className="text-[var(--foreground-muted)] shrink-0 mt-0.5">
                  <BookOpen size={16} />
                </span>
                <div className="min-w-0">
                  <div className="text-[0.8125rem] font-medium text-[var(--foreground)]">{doc.title}</div>
                  {doc.description && (
                    <div className="text-[0.75rem] text-[var(--foreground-muted)] mt-0.5 line-clamp-2">
                      {doc.description}
                    </div>
                  )}
                  {doc.updatedAt && (
                    <div className="text-[0.6875rem] text-[var(--foreground-subtle)] mt-1">{doc.updatedAt}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
