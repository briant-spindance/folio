import { Link } from 'react-router-dom'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/shared/status-badge'
import { ProgressBar } from '@/components/shared/progress-bar'
import { mockFeatures, mockIssues, mockSprints, mockVCS, mockHealthChecks, getSprintProgress } from '@/lib/mock-data'
import { CheckCircle2, AlertTriangle, XCircle, GitBranch } from 'lucide-react'
import { relativeTime, daysRemaining } from '@/lib/utils'
import type { WorkflowState } from '@/types'

const cardClass = 'rounded-lg border border-border bg-surface-raised p-4'
const headingClass = 'text-sm font-medium text-foreground-muted uppercase tracking-wider mb-3'

const backlogFeatures = mockFeatures
  .filter((f) => f.backlogPosition != null)
  .sort((a, b) => a.backlogPosition! - b.backlogPosition!)
  .slice(0, 5)

const statusCounts = mockFeatures.reduce<Record<string, number>>((acc, f) => {
  acc[f.status] = (acc[f.status] ?? 0) + 1
  return acc
}, {})

const activeSprint = mockSprints.find((s) => s.status === 'active')

const recentIssues = [...mockIssues]
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  .slice(0, 5)

const healthCounts = mockHealthChecks.reduce(
  (acc, h) => {
    acc[h.status] = (acc[h.status] ?? 0) + 1
    return acc
  },
  { pass: 0, warn: 0, fail: 0 } as Record<string, number>
)

export default function Dashboard() {
  const sprintProgress = activeSprint ? getSprintProgress(activeSprint) : null
  const remaining = activeSprint ? daysRemaining(activeSprint.endDate) : 0

  return (
    <div>
      <Header />
      <div className="p-6 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Project Summary */}
          <div className={cardClass}>
            <h2 className={headingClass}>Project Summary</h2>
            <h3 className="text-lg font-semibold text-foreground">Forge Demo</h3>
            <p className="text-sm text-foreground-muted mt-1">
              A lightweight project management tool for agile teams embracing agentic engineering workflows.
            </p>
            <div className="flex gap-4 mt-3">
              <div className="text-center">
                <div className="text-xl font-semibold text-foreground">5</div>
                <div className="text-xs text-foreground-subtle">Docs</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-foreground">8</div>
                <div className="text-xs text-foreground-subtle">Features</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-foreground">5</div>
                <div className="text-xs text-foreground-subtle">Issues</div>
              </div>
            </div>
          </div>

          {/* Backlog Snapshot */}
          <div className={cardClass}>
            <h2 className={headingClass}>Backlog Snapshot</h2>
            <ul className="space-y-2">
              {backlogFeatures.map((f) => (
                <li key={f.slug} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-foreground-subtle font-mono w-4 shrink-0">
                      {f.backlogPosition}
                    </span>
                    <Link
                      to={`/features/${f.slug}`}
                      className="text-sm text-foreground hover:text-primary truncate"
                    >
                      {f.name}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={f.status} />
                    {f.assignee && (
                      <span className="text-xs text-foreground-muted">{f.assignee}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Feature Status Distribution */}
          <div className={cardClass}>
            <h2 className={headingClass}>Feature Status Distribution</h2>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(statusCounts) as [WorkflowState, number][]).map(([status, count]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <StatusBadge status={status} />
                  <span className="text-sm font-medium text-foreground">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Sprint */}
          <div className={cardClass}>
            <h2 className={headingClass}>Active Sprint</h2>
            {activeSprint && sprintProgress ? (
              <div>
                <div className="flex items-center justify-between">
                  <Link
                    to={`/sprints/${activeSprint.slug}`}
                    className="text-sm font-semibold text-foreground hover:text-primary"
                  >
                    {activeSprint.name}
                  </Link>
                  <StatusBadge status={activeSprint.status} />
                </div>
                <p className="text-xs text-foreground-muted mt-1">
                  {activeSprint.startDate} — {activeSprint.endDate}
                  <span className="ml-2 text-foreground-subtle">
                    ({remaining > 0 ? `${remaining}d remaining` : 'ended'})
                  </span>
                </p>
                {activeSprint.goal && (
                  <p className="text-sm text-foreground-muted mt-2 italic">
                    {activeSprint.goal}
                  </p>
                )}
                <div className="mt-3">
                  <ProgressBar
                    value={sprintProgress.completedPoints}
                    max={sprintProgress.totalPoints}
                  />
                </div>
                <div className="flex gap-3 mt-2 text-xs text-foreground-subtle">
                  <span>{sprintProgress.featureCount} features</span>
                  <span>{sprintProgress.issueCount} issues</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-foreground-muted">No active sprint</p>
            )}
          </div>

          {/* Recent Issues */}
          <div className={cardClass}>
            <h2 className={headingClass}>Recent Issues</h2>
            <ul className="space-y-2">
              {recentIssues.map((issue) => (
                <li key={issue.slug} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Link
                      to={`/issues/${issue.slug}`}
                      className="text-sm text-foreground hover:text-primary truncate"
                    >
                      {issue.name}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={issue.status} />
                    {issue.labels.map((label) => (
                      <span
                        key={label}
                        className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[11px] text-foreground-muted"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* VCS Status */}
          <div className={cardClass}>
            <h2 className={headingClass}>VCS Status</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-foreground-muted" />
                <span className="text-sm font-mono text-foreground">{mockVCS.branch}</span>
                {mockVCS.dirty && (
                  <span className="inline-flex items-center rounded-full bg-warning/12 px-2 py-0.5 text-[11px] font-medium text-warning">
                    dirty
                  </span>
                )}
              </div>
              <div className="text-sm text-foreground-muted">
                <span className="font-mono text-foreground-subtle">{mockVCS.lastCommit.hash}</span>
                {' '}— {mockVCS.lastCommit.message}
              </div>
              <div className="text-xs text-foreground-subtle">
                {mockVCS.lastCommit.author} · {relativeTime(mockVCS.lastCommit.timestamp)}
              </div>
            </div>
          </div>

          {/* Forge Health */}
          <div className={cardClass}>
            <h2 className={headingClass}>Forge Health</h2>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-foreground">{healthCounts.pass}</span>
                <span className="text-xs text-foreground-muted">pass</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-foreground">{healthCounts.warn}</span>
                <span className="text-xs text-foreground-muted">warn</span>
              </div>
              <div className="flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-error" />
                <span className="text-sm font-medium text-foreground">{healthCounts.fail}</span>
                <span className="text-xs text-foreground-muted">fail</span>
              </div>
            </div>
            <ul className="mt-3 space-y-1">
              {mockHealthChecks.map((check) => (
                <li key={check.name} className="flex items-center gap-2 text-xs">
                  {check.status === 'pass' && <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />}
                  {check.status === 'warn' && <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />}
                  {check.status === 'fail' && <XCircle className="h-3.5 w-3.5 text-error shrink-0" />}
                  <span className="text-foreground-muted">{check.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
