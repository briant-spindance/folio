import { useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/shared/status-badge'
import { ProgressBar } from '@/components/shared/progress-bar'
import { mockSprints, mockFeatures, mockIssues, getSprintProgress, mockConfig } from '@/lib/mock-data'
import { daysRemaining } from '@/lib/utils'
import type { WorkflowState } from '@/types'

const stateBorderColors: Record<WorkflowState, string> = {
  draft: 'border-state-draft',
  ready: 'border-state-ready',
  'in-progress': 'border-state-in-progress',
  review: 'border-state-review',
  done: 'border-state-done',
}

export default function SprintBoard() {
  const { slug } = useParams<{ slug: string }>()
  const sprint = mockSprints.find((s) => s.slug === slug)

  if (!sprint) {
    return (
      <>
        <Header />
        <div className="p-6 max-w-[1200px] mx-auto">
          <p className="text-sm text-foreground-muted">Sprint not found.</p>
        </div>
      </>
    )
  }

  const sprintFeatures = mockFeatures.filter((f) => sprint.features.includes(f.slug))
  const sprintIssues = mockIssues.filter((i) => sprint.issues.includes(i.slug))
  const progress = getSprintProgress(sprint)
  const remaining = daysRemaining(sprint.endDate)

  // Map issue statuses to workflow states for column placement
  function issueToWorkflowState(issueStatus: string): WorkflowState {
    return issueStatus === 'closed' ? 'done' : 'ready'
  }

  return (
    <>
      <Header />

      <div className="p-6">
        {/* Sprint Header Banner */}
        <div className="rounded-lg border border-border bg-surface p-4 mb-6">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">{sprint.name}</h1>
              <StatusBadge status={sprint.status} />
            </div>
            <div className="flex items-center gap-3 text-sm text-foreground-muted">
              <span>{sprint.startDate} — {sprint.endDate}</span>
              {sprint.status === 'active' && (
                <span className="font-medium">{remaining} days remaining</span>
              )}
            </div>
          </div>
          {sprint.goal && (
            <p className="text-sm text-foreground-muted mb-3">{sprint.goal}</p>
          )}
          <ProgressBar value={progress.completedPoints} max={progress.totalPoints} />
        </div>

        {/* Kanban Columns */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {mockConfig.workflow.states.map((state) => {
            const columFeatures = sprintFeatures.filter((f) => f.status === state)
            const columnIssues = sprintIssues.filter(
              (i) => issueToWorkflowState(i.status) === state
            )
            const count = columFeatures.length + columnIssues.length

            return (
              <div
                key={state}
                className="min-w-[250px] flex-1 flex flex-col"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between rounded-t-lg border border-border bg-surface-raised px-3 py-2">
                  <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider capitalize">
                    {state}
                  </span>
                  <span className="text-xs text-foreground-subtle">{count}</span>
                </div>

                {/* Column Body */}
                <div className="flex-1 flex flex-col gap-2 rounded-b-lg border border-t-0 border-border bg-surface-inset p-2 min-h-[200px]">
                  {columFeatures.map((feature) => (
                    <div
                      key={feature.slug}
                      className={`bg-surface-raised rounded-lg border border-border p-3 border-l-[3px] ${stateBorderColors[state]}`}
                    >
                      <Link
                        to={`/features/${feature.slug}`}
                        className="text-sm font-medium text-foreground hover:text-primary transition-colors block mb-1.5"
                      >
                        {feature.name}
                      </Link>
                      <div className="flex items-center justify-between">
                        {feature.assignee ? (
                          <span className="text-xs text-foreground-muted">
                            {feature.assignee}
                          </span>
                        ) : (
                          <span className="text-xs text-foreground-subtle">
                            Unassigned
                          </span>
                        )}
                        {feature.points != null && (
                          <span className="text-xs font-medium text-foreground-muted">
                            {feature.points} pts
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {columnIssues.map((issue) => (
                    <div
                      key={issue.slug}
                      className={`bg-surface-raised rounded-lg border border-border p-3 border-l-[3px] border-l-dashed ${stateBorderColors[state]}`}
                      style={{ borderLeftStyle: 'dashed' }}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[10px] font-medium uppercase text-foreground-subtle bg-surface-inset px-1.5 py-0.5 rounded">
                          issue
                        </span>
                        <Link
                          to={`/issues/${issue.slug}`}
                          className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {issue.name}
                        </Link>
                      </div>
                      {issue.assignee ? (
                        <span className="text-xs text-foreground-muted">
                          {issue.assignee}
                        </span>
                      ) : (
                        <span className="text-xs text-foreground-subtle">
                          Unassigned
                        </span>
                      )}
                    </div>
                  ))}

                  {count === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-xs text-foreground-subtle">No items</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
