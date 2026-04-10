import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/shared/status-badge'
import { mockFeatures } from '@/lib/mock-data'
import { Plus } from 'lucide-react'
import type { WorkflowState } from '@/types'

const workflowStates: WorkflowState[] = ['draft', 'ready', 'in-progress', 'review', 'done']

export default function FeatureListPage() {
  const [activeFilters, setActiveFilters] = useState<Set<WorkflowState>>(new Set())

  function toggleFilter(state: WorkflowState) {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(state)) {
        next.delete(state)
      } else {
        next.add(state)
      }
      return next
    })
  }

  const filteredFeatures =
    activeFilters.size === 0
      ? mockFeatures
      : mockFeatures.filter((f) => activeFilters.has(f.status))

  return (
    <>
      <Header
        action={
          <Link
            to="/features/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Feature
          </Link>
        }
      />
      <div className="p-6 max-w-[1200px] mx-auto">
        {/* Filter buttons */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {workflowStates.map((state) => (
            <button
              key={state}
              onClick={() => toggleFilter(state)}
              className={
                activeFilters.has(state)
                  ? 'rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors'
                  : 'rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors'
              }
            >
              <span className="capitalize">{state}</span>
            </button>
          ))}
          {activeFilters.size > 0 && (
            <button
              onClick={() => setActiveFilters(new Set())}
              className="rounded-md px-3 py-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Features table */}
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="px-4 py-2.5 text-left font-medium text-foreground-muted">Name</th>
                <th className="px-4 py-2.5 text-left font-medium text-foreground-muted">Status</th>
                <th className="px-4 py-2.5 text-left font-medium text-foreground-muted">Assignee</th>
                <th className="px-4 py-2.5 text-left font-medium text-foreground-muted">Points</th>
                <th className="px-4 py-2.5 text-left font-medium text-foreground-muted">Priority</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeatures.map((feature) => (
                <tr
                  key={feature.slug}
                  className="border-b border-border last:border-b-0 bg-background hover:bg-surface transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/features/${feature.slug}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {feature.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={feature.status} />
                  </td>
                  <td className="px-4 py-2.5 text-foreground-muted">
                    {feature.assignee ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-foreground-muted">
                    {feature.points ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-foreground-muted">
                    {feature.backlogPosition != null ? `#${feature.backlogPosition}` : '—'}
                  </td>
                </tr>
              ))}
              {filteredFeatures.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-foreground-subtle">
                    No features match the selected filters.
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
