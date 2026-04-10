import { Link } from 'react-router-dom'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/shared/status-badge'
import { ProgressBar } from '@/components/shared/progress-bar'
import { mockSprints, getSprintProgress } from '@/lib/mock-data'
import { Plus, Timer } from 'lucide-react'
import { daysRemaining } from '@/lib/utils'

export default function SprintsList() {
  const activeSprint = mockSprints.find((s) => s.status === 'active')
  const otherSprints = mockSprints.filter((s) => s.status !== 'active')

  return (
    <>
      <Header
        action={
          <Link
            to="/sprints/new"
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New Sprint
          </Link>
        }
      />

      <div className="p-6 max-w-[1200px] mx-auto">
        <div className="flex flex-col gap-6">
          {/* Active Sprint Card */}
          {activeSprint && (
            <div className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-semibold text-foreground">
                      {activeSprint.name}
                    </h2>
                    <StatusBadge status={activeSprint.status} />
                  </div>
                  <p className="text-sm text-foreground-muted">
                    {activeSprint.startDate} — {activeSprint.endDate}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-foreground-muted">
                  <Timer className="h-4 w-4" />
                  <span>{daysRemaining(activeSprint.endDate)} days remaining</span>
                </div>
              </div>

              {activeSprint.goal && (
                <p className="text-sm text-foreground mb-4">{activeSprint.goal}</p>
              )}

              {(() => {
                const progress = getSprintProgress(activeSprint)
                return (
                  <div className="mb-4">
                    <ProgressBar
                      value={progress.completedPoints}
                      max={progress.totalPoints}
                    />
                  </div>
                )
              })()}

              <Link
                to={`/sprints/${activeSprint.slug}/board`}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors inline-block"
              >
                View Board
              </Link>
            </div>
          )}

          {/* All Other Sprints Table */}
          {otherSprints.length > 0 && (
            <div className="rounded-lg border border-border bg-surface overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-raised">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
                      Goal
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
                      Progress
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {otherSprints.map((sprint) => {
                    const progress = getSprintProgress(sprint)
                    return (
                      <tr
                        key={sprint.slug}
                        className="border-b border-border last:border-b-0 hover:bg-surface-raised/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Link
                            to={`/sprints/${sprint.slug}`}
                            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {sprint.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={sprint.status} />
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground-muted">
                          {sprint.startDate} — {sprint.endDate}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground-muted max-w-[250px] truncate">
                          {sprint.goal || '—'}
                        </td>
                        <td className="px-4 py-3 min-w-[160px]">
                          <ProgressBar
                            value={progress.completedPoints}
                            max={progress.totalPoints}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
