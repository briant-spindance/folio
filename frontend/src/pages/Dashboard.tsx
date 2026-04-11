import { Link } from 'react-router-dom'
import { BookOpen, Puzzle, ChevronRight, Boxes, Palette, Plug, Terminal, GitPullRequest } from 'lucide-react'
import { useStatus } from '@/hooks/useData'
import { StatusBadge } from '@/components/StatusBadge'

const docIcons: Record<string, React.ReactNode> = {
  'project-brief': <BookOpen size={16} />,
  architecture: <Boxes size={16} />,
  'design-system': <Palette size={16} />,
  'api-specification': <Plug size={16} />,
  'cli-reference': <Terminal size={16} />,
  'contributing-guide': <GitPullRequest size={16} />,
}

function defaultDocIcon(slug: string) {
  return docIcons[slug] ?? <BookOpen size={16} />
}

export function Dashboard() {
  const { data, isLoading, error } = useStatus()

  if (isLoading) {
    return <div className="text-[var(--foreground-muted)] text-sm">Loading…</div>
  }
  if (error || !data) {
    return <div className="text-[var(--status-error)] text-sm">Failed to load dashboard.</div>
  }

  return (
    <>
      {/* Project Docs */}
      <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--card-radius)] p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[0.6875rem] font-semibold text-[var(--foreground-muted)] uppercase tracking-[0.05em] flex items-center gap-1.5">
            <BookOpen size={14} />
            Project Docs
          </span>
          <Link
            to="/docs"
            className="text-[0.6875rem] text-[var(--primary)] font-medium no-underline hover:text-[var(--primary-hover)] flex items-center gap-1"
          >
            View all <ChevronRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {data.recentDocs.map((doc) => (
            <Link
              key={doc.slug}
              to={`/docs/${doc.slug}`}
              className="flex items-center gap-3 p-3 rounded-md border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-inset)] no-underline transition-colors duration-100"
            >
              <span className="text-[var(--foreground-muted)] shrink-0">
                {defaultDocIcon(doc.slug)}
              </span>
              <div className="min-w-0">
                <div className="text-[0.8125rem] font-medium text-[var(--foreground)] truncate">
                  {doc.title}
                </div>
                {doc.updatedAt && (
                  <div className="text-[0.6875rem] text-[var(--foreground-subtle)]">
                    {doc.updatedAt}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--card-radius)] p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[0.6875rem] font-semibold text-[var(--foreground-muted)] uppercase tracking-[0.05em] flex items-center gap-1.5">
            <Puzzle size={14} />
            Features
          </span>
          <Link
            to="/features"
            className="text-[0.6875rem] text-[var(--primary)] font-medium no-underline hover:text-[var(--primary-hover)] flex items-center gap-1"
          >
            View all features <ChevronRight size={12} />
          </Link>
        </div>
        <table className="w-full text-[0.8125rem]">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left text-[0.6875rem] font-semibold text-[var(--foreground-muted)] pb-2 pr-4">Feature</th>
              <th className="text-left text-[0.6875rem] font-semibold text-[var(--foreground-muted)] pb-2 pr-4">Status</th>
              <th className="text-left text-[0.6875rem] font-semibold text-[var(--foreground-muted)] pb-2 pr-4">Assignee</th>
              <th className="text-right text-[0.6875rem] font-semibold text-[var(--foreground-muted)] pb-2">Points</th>
            </tr>
          </thead>
          <tbody>
            {data.topFeatures.map((f, i) => (
              <tr
                key={f.slug}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)] cursor-pointer transition-colors duration-100"
              >
                <td className="py-2 pr-4">
                  <Link to={`/features/${f.slug}`} className="no-underline flex items-center gap-2">
                    <span className="text-[0.6875rem] text-[var(--foreground-subtle)] w-4 text-right shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-[var(--foreground)] hover:text-[var(--primary)]">{f.title}</span>
                  </Link>
                </td>
                <td className="py-2 pr-4">
                  <StatusBadge status={f.status} />
                </td>
                <td className="py-2 pr-4 text-[var(--foreground-muted)]">{f.assignee ?? '—'}</td>
                <td className="py-2 text-right text-[var(--foreground-muted)]">{f.points ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(data.byStatus).map(([status, count]) => (
          <div
            key={status}
            className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--card-radius)] p-4 flex flex-col gap-1"
          >
            <span className="text-[0.6875rem] text-[var(--foreground-muted)] uppercase tracking-[0.05em]">{status}</span>
            <span className="text-2xl font-semibold text-[var(--foreground)]">{count}</span>
          </div>
        ))}
      </div>
    </>
  )
}
