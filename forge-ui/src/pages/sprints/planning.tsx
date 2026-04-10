import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/shared/status-badge'
import { mockSprints, mockFeatures, mockIssues } from '@/lib/mock-data'
import { ArrowRight, X } from 'lucide-react'

type AvailableTab = 'features' | 'issues'

export default function SprintPlanning() {
  const { slug } = useParams<{ slug: string }>()
  const sprint = mockSprints.find((s) => s.slug === slug)

  const [assignedFeatureSlugs, setAssignedFeatureSlugs] = useState<string[]>(
    sprint?.features ?? []
  )
  const [assignedIssueSlugs, setAssignedIssueSlugs] = useState<string[]>(
    sprint?.issues ?? []
  )
  const [activeTab, setActiveTab] = useState<AvailableTab>('features')

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

  // Available items: not assigned to any sprint, OR assigned to this sprint (already handled)
  const availableFeatures = mockFeatures.filter(
    (f) => f.sprint === null && !assignedFeatureSlugs.includes(f.slug)
  )
  const availableIssues = mockIssues.filter(
    (i) => i.sprint === null && !assignedIssueSlugs.includes(i.slug)
  )

  const assignedFeatures = mockFeatures.filter((f) =>
    assignedFeatureSlugs.includes(f.slug)
  )
  const assignedIssues = mockIssues.filter((i) =>
    assignedIssueSlugs.includes(i.slug)
  )

  const committedPoints = assignedFeatures.reduce(
    (sum, f) => sum + (f.points ?? 0),
    0
  )

  const addFeature = (featureSlug: string) => {
    setAssignedFeatureSlugs((prev) => [...prev, featureSlug])
  }

  const removeFeature = (featureSlug: string) => {
    setAssignedFeatureSlugs((prev) => prev.filter((s) => s !== featureSlug))
  }

  const addIssue = (issueSlug: string) => {
    setAssignedIssueSlugs((prev) => [...prev, issueSlug])
  }

  const removeIssue = (issueSlug: string) => {
    setAssignedIssueSlugs((prev) => prev.filter((s) => s !== issueSlug))
  }

  const isOverCapacity = sprint.capacity !== null && committedPoints > sprint.capacity

  return (
    <>
      <Header />

      <div className="p-6 max-w-[1200px] mx-auto">
        {/* Sprint title */}
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-lg font-semibold text-foreground">{sprint.name}</h1>
          <StatusBadge status={sprint.status} />
          <span className="text-sm text-foreground-muted">— Planning</span>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Panel: Available */}
          <div className="rounded-lg border border-border bg-surface overflow-hidden">
            <div className="border-b border-border bg-surface-raised px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Available</h2>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab('features')}
                className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'features'
                    ? 'text-foreground border-b-2 border-primary'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                Features ({availableFeatures.length})
              </button>
              <button
                onClick={() => setActiveTab('issues')}
                className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'issues'
                    ? 'text-foreground border-b-2 border-primary'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                Issues ({availableIssues.length})
              </button>
            </div>

            {/* Available Items */}
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {activeTab === 'features' &&
                availableFeatures.map((feature) => (
                  <div
                    key={feature.slug}
                    className="flex items-center justify-between px-4 py-3 hover:bg-surface-raised/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-medium text-foreground truncate">
                        {feature.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={feature.status} />
                        {feature.points != null && (
                          <span className="text-xs text-foreground-muted">
                            {feature.points} pts
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => addFeature(feature.slug)}
                      className="rounded-md border border-border p-1.5 text-foreground-muted hover:bg-accent hover:text-foreground transition-colors"
                      title="Add to sprint"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

              {activeTab === 'issues' &&
                availableIssues.map((issue) => (
                  <div
                    key={issue.slug}
                    className="flex items-center justify-between px-4 py-3 hover:bg-surface-raised/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-medium text-foreground truncate">
                        {issue.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={issue.status} />
                      </div>
                    </div>
                    <button
                      onClick={() => addIssue(issue.slug)}
                      className="rounded-md border border-border p-1.5 text-foreground-muted hover:bg-accent hover:text-foreground transition-colors"
                      title="Add to sprint"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

              {activeTab === 'features' && availableFeatures.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-foreground-subtle">No available features</p>
                </div>
              )}
              {activeTab === 'issues' && availableIssues.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-foreground-subtle">No available issues</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Sprint Contents */}
          <div className="rounded-lg border border-border bg-surface overflow-hidden">
            <div className="border-b border-border bg-surface-raised px-4 py-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Sprint Contents</h2>
                <span
                  className={`text-xs font-medium ${
                    isOverCapacity ? 'text-red-500' : 'text-foreground-muted'
                  }`}
                >
                  {assignedFeatures.length} features, {assignedIssues.length} issues —{' '}
                  {committedPoints} pts committed
                  {sprint.capacity !== null && ` / ${sprint.capacity}`}
                  {isOverCapacity && ' (over capacity)'}
                </span>
              </div>
            </div>

            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {assignedFeatures.map((feature) => (
                <div
                  key={feature.slug}
                  className="flex items-center justify-between px-4 py-3 hover:bg-surface-raised/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <Link
                      to={`/features/${feature.slug}`}
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {feature.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge status={feature.status} />
                      {feature.points != null && (
                        <span className="text-xs text-foreground-muted">
                          {feature.points} pts
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFeature(feature.slug)}
                    className="rounded-md border border-border p-1.5 text-foreground-muted hover:bg-accent hover:text-red-500 transition-colors"
                    title="Remove from sprint"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {assignedIssues.map((issue) => (
                <div
                  key={issue.slug}
                  className="flex items-center justify-between px-4 py-3 hover:bg-surface-raised/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <Link
                      to={`/issues/${issue.slug}`}
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {issue.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge status={issue.status} />
                    </div>
                  </div>
                  <button
                    onClick={() => removeIssue(issue.slug)}
                    className="rounded-md border border-border p-1.5 text-foreground-muted hover:bg-accent hover:text-red-500 transition-colors"
                    title="Remove from sprint"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {assignedFeatures.length === 0 && assignedIssues.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-foreground-subtle">
                    No items assigned to this sprint yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
