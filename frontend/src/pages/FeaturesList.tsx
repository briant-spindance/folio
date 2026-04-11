import { Link } from 'react-router-dom'
import { Puzzle } from 'lucide-react'
import { useFeatures } from '@/hooks/useData'
import { StatusBadge } from '@/components/StatusBadge'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export function FeaturesList() {
  const { data, isLoading, error } = useFeatures()

  return (
    <>
      <Breadcrumbs items={[{ label: 'Features' }]} />
      <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--card-radius)] p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[0.6875rem] font-semibold text-[var(--foreground-muted)] uppercase tracking-[0.05em] flex items-center gap-1.5">
            <Puzzle size={14} />
            Features
            {data && (
              <span className="ml-1 text-[var(--foreground-subtle)]">({data.length})</span>
            )}
          </span>
        </div>

        {isLoading && (
          <div className="text-[var(--foreground-muted)] text-sm py-4">Loading…</div>
        )}
        {(error || (!isLoading && !data)) && (
          <div className="text-[var(--status-error)] text-sm py-4">Failed to load features.</div>
        )}

        {data && (
          <table className="w-full text-[0.8125rem]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left text-[0.6875rem] font-semibold text-[var(--foreground-muted)] pb-2 pr-4">#</th>
                <th className="text-left text-[0.6875rem] font-semibold text-[var(--foreground-muted)] pb-2 pr-4">Feature</th>
                <th className="text-left text-[0.6875rem] font-semibold text-[var(--foreground-muted)] pb-2 pr-4">Status</th>
                <th className="text-left text-[0.6875rem] font-semibold text-[var(--foreground-muted)] pb-2 pr-4">Priority</th>
                <th className="text-left text-[0.6875rem] font-semibold text-[var(--foreground-muted)] pb-2 pr-4">Assignee</th>
                <th className="text-right text-[0.6875rem] font-semibold text-[var(--foreground-muted)] pb-2">Points</th>
              </tr>
            </thead>
            <tbody>
              {data.map((f, i) => (
                <tr
                  key={f.slug}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)] transition-colors duration-100"
                >
                  <td className="py-2 pr-4 text-[0.6875rem] text-[var(--foreground-subtle)]">{i + 1}</td>
                  <td className="py-2 pr-4">
                    <Link
                      to={`/features/${f.slug}`}
                      className="text-[var(--foreground)] hover:text-[var(--primary)] no-underline font-medium"
                    >
                      {f.title}
                    </Link>
                    {f.tags && f.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {f.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[0.625rem] px-1.5 py-0.5 rounded bg-[var(--surface-inset)] text-[var(--foreground-subtle)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={f.status} />
                  </td>
                  <td className="py-2 pr-4 text-[var(--foreground-muted)] capitalize">{f.priority}</td>
                  <td className="py-2 pr-4 text-[var(--foreground-muted)]">{f.assignee ?? '—'}</td>
                  <td className="py-2 text-right text-[var(--foreground-muted)]">{f.points ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
