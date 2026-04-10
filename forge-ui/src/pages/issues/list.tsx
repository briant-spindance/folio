import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/shared/status-badge'
import { mockIssues } from '@/lib/mock-data'
import { Plus } from 'lucide-react'
import type { IssueStatus } from '@/types'

const issueStatuses: IssueStatus[] = ['open', 'closed']

export default function IssueListPage() {
  const [activeFilter, setActiveFilter] = useState<IssueStatus | null>(null)

  const filteredIssues =
    activeFilter === null
      ? mockIssues
      : mockIssues.filter((i) => i.status === activeFilter)

  return (
    <>
      <Header
        action={
          <Link
            to="/issues/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Issue
          </Link>
        }
      />
      <div className="p-6 max-w-[1200px] mx-auto">
        {/* Filter buttons */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {issueStatuses.map((status) => (
            <button
              key={status}
              onClick={() =>
                setActiveFilter(activeFilter === status ? null : status)
              }
              className={
                activeFilter === status
                  ? 'rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors'
                  : 'rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors'
              }
            >
              <span className="capitalize">{status}</span>
            </button>
          ))}
          {activeFilter !== null && (
            <button
              onClick={() => setActiveFilter(null)}
              className="rounded-md px-3 py-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Issues table */}
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="px-4 py-2.5 text-left font-medium text-foreground-muted">Name</th>
                <th className="px-4 py-2.5 text-left font-medium text-foreground-muted">Status</th>
                <th className="px-4 py-2.5 text-left font-medium text-foreground-muted">Assignee</th>
                <th className="px-4 py-2.5 text-left font-medium text-foreground-muted">Labels</th>
                <th className="px-4 py-2.5 text-left font-medium text-foreground-muted">Linked Feature</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.map((issue) => (
                <tr
                  key={issue.slug}
                  className="border-b border-border last:border-b-0 bg-background hover:bg-surface transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/issues/${issue.slug}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {issue.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={issue.status} />
                  </td>
                  <td className="px-4 py-2.5 text-foreground-muted">
                    {issue.assignee ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {issue.labels.length > 0
                        ? issue.labels.map((label) => (
                            <span
                              key={label}
                              className="bg-surface text-foreground-muted border border-border rounded-full px-2 py-0.5 text-[11px]"
                            >
                              {label}
                            </span>
                          ))
                        : <span className="text-foreground-muted">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-foreground-muted">
                    {issue.linkedFeature ? (
                      <Link
                        to={`/features/${issue.linkedFeature}`}
                        className="text-primary hover:underline"
                      >
                        {issue.linkedFeature}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
              {filteredIssues.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-foreground-subtle">
                    No issues match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
