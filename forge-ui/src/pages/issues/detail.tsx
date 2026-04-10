import { useParams, Link } from 'react-router-dom'
import { Header } from '@/components/layout/header'
import { MarkdownRenderer } from '@/components/markdown/renderer'
import { StatusBadge } from '@/components/shared/status-badge'
import { mockIssues, mockSprints, mockFeatures } from '@/lib/mock-data'
import { Pencil, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function IssueDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const issue = mockIssues.find((i) => i.slug === slug)

  if (!issue) {
    return (
      <>
        <Header />
        <div className="p-6 max-w-[1200px] mx-auto">
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface py-16">
            <p className="text-sm font-medium text-foreground">Not Found</p>
            <p className="text-sm text-foreground-muted mt-1">
              The issue you're looking for doesn't exist.
            </p>
            <Link
              to="/issues"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors mt-4"
            >
              Back to Issues
            </Link>
          </div>
        </div>
      </>
    )
  }

  const linkedFeature = issue.linkedFeature
    ? mockFeatures.find((f) => f.slug === issue.linkedFeature)
    : null
  const sprint = issue.sprint
    ? mockSprints.find((s) => s.slug === issue.sprint)
    : null

  return (
    <>
      <Header
        action={
          <div className="flex items-center gap-1">
            <Link
              to={`/issues/${issue.slug}/edit`}
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          {/* Main content */}
          <div className="flex flex-col gap-6">
            <div className="rounded-lg border border-border bg-surface-raised p-6">
              <MarkdownRenderer content={issue.body} />
            </div>

            {/* Artifacts */}
            {issue.artifacts.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-foreground-muted uppercase tracking-wider mb-3">
                  Artifacts
                </h3>
                <div className="rounded-lg border border-border bg-surface-raised divide-y divide-border">
                  {issue.artifacts.map((artifact) => (
                    <div
                      key={artifact.name}
                      className="flex items-center justify-between px-4 py-2.5 text-sm"
                    >
                      <span className="font-medium text-foreground">
                        {artifact.name}
                      </span>
                      <span className="text-foreground-muted">
                        {(artifact.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-border bg-surface-raised p-4">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs font-medium text-foreground-muted mb-1">Status</p>
                  <StatusBadge status={issue.status} />
                </div>

                <div>
                  <p className="text-xs font-medium text-foreground-muted mb-1">Assignee</p>
                  <p className="text-sm text-foreground">
                    {issue.assignee ?? '—'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-foreground-muted mb-1">Labels</p>
                  <div className="flex flex-wrap gap-1">
                    {issue.labels.length > 0 ? (
                      issue.labels.map((label) => (
                        <span
                          key={label}
                          className="bg-surface text-foreground-muted border border-border rounded-full px-2 py-0.5 text-[11px]"
                        >
                          {label}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-foreground-muted">None</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-foreground-muted mb-1">Linked Feature</p>
                  {linkedFeature ? (
                    <Link
                      to={`/features/${linkedFeature.slug}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {linkedFeature.name}
                    </Link>
                  ) : (
                    <p className="text-sm text-foreground-muted">None</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-foreground-muted mb-1">Sprint</p>
                  {sprint ? (
                    <Link
                      to={`/sprints/${sprint.slug}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {sprint.name}
                    </Link>
                  ) : (
                    <p className="text-sm text-foreground-muted">None</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-foreground-muted mb-1">Created</p>
                  <p className="text-sm text-foreground">
                    {formatDate(issue.createdAt)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-foreground-muted mb-1">Modified</p>
                  <p className="text-sm text-foreground">
                    {formatDate(issue.modifiedAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
