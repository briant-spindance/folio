import { useParams, Link } from 'react-router-dom'
import { Header } from '@/components/layout/header'
import { MarkdownRenderer } from '@/components/markdown/renderer'
import { StatusBadge } from '@/components/shared/status-badge'
import { mockFeatures, mockSprints } from '@/lib/mock-data'
import { Pencil, Trash2, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function FeatureDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const feature = mockFeatures.find((f) => f.slug === slug)

  if (!feature) {
    return (
      <>
        <Header />
        <div className="p-6 max-w-[1200px] mx-auto">
          <p className="text-foreground-muted">Feature not found.</p>
        </div>
      </>
    )
  }

  const sprint = feature.sprint
    ? mockSprints.find((s) => s.slug === feature.sprint)
    : null

  return (
    <>
      <Header
        action={
          <div className="flex items-center gap-2">
            <Link
              to={`/features/${feature.slug}/edit`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
            <button
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        }
      />
      <div className="p-6 max-w-[1200px] mx-auto">
        <div className="flex gap-8">
          {/* Content area — 65% */}
          <div className="flex-[0_0_65%] min-w-0">
            <h1 className="mb-6 text-2xl font-bold text-foreground">{feature.name}</h1>

            {/* Body */}
            <div className="rounded-lg border border-border bg-surface p-6">
              <MarkdownRenderer content={feature.body} />
            </div>

            {/* Artifacts */}
            {feature.artifacts.length > 0 && (
              <div className="mt-6">
                <h2 className="mb-3 text-sm font-medium text-foreground-muted">Artifacts</h2>
                <div className="flex flex-col gap-2">
                  {feature.artifacts.map((artifact) => (
                    <div
                      key={artifact.name}
                      className="flex items-center gap-2.5 rounded-md border border-border bg-surface px-3 py-2"
                    >
                      <FileText className="h-4 w-4 text-foreground-subtle" />
                      <span className="text-sm text-foreground">{artifact.name}</span>
                      <span className="text-xs text-foreground-subtle">
                        {(artifact.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar — 35% */}
          <aside className="flex-[0_0_35%] min-w-0">
            <div className="rounded-lg border border-border bg-surface-raised p-5">
              <h2 className="mb-4 text-sm font-semibold text-foreground">Details</h2>
              <dl className="space-y-4 text-sm">
                <div className="flex items-start justify-between">
                  <dt className="text-foreground-muted">Status</dt>
                  <dd><StatusBadge status={feature.status} /></dd>
                </div>
                <div className="flex items-start justify-between">
                  <dt className="text-foreground-muted">Assignee</dt>
                  <dd className="text-foreground">{feature.assignee ?? '—'}</dd>
                </div>
                <div className="flex items-start justify-between">
                  <dt className="text-foreground-muted">Points</dt>
                  <dd className="text-foreground">{feature.points ?? '—'}</dd>
                </div>
                <div className="flex items-start justify-between">
                  <dt className="text-foreground-muted">Sprint</dt>
                  <dd>
                    {sprint ? (
                      <Link
                        to={`/sprints/${sprint.slug}`}
                        className="text-primary hover:underline"
                      >
                        {sprint.name}
                      </Link>
                    ) : (
                      <span className="text-foreground">None</span>
                    )}
                  </dd>
                </div>
                <div className="flex items-start justify-between">
                  <dt className="text-foreground-muted">Priority</dt>
                  <dd className="text-foreground">
                    {feature.backlogPosition != null
                      ? `#${feature.backlogPosition}`
                      : '—'}
                  </dd>
                </div>

                <hr className="border-border" />

                <div className="flex items-start justify-between">
                  <dt className="text-foreground-muted">Created</dt>
                  <dd className="text-foreground">{formatDate(feature.createdAt)}</dd>
                </div>
                <div className="flex items-start justify-between">
                  <dt className="text-foreground-muted">Last Modified</dt>
                  <dd className="text-foreground">{formatDate(feature.modifiedAt)}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
