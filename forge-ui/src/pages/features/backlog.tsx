import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/shared/status-badge'
import { mockFeatures } from '@/lib/mock-data'
import { GripVertical, ChevronUp, ChevronDown, X } from 'lucide-react'
import type { Feature } from '@/types'

export default function BacklogPage() {
  const [features, setFeatures] = useState<Feature[]>(() =>
    mockFeatures.map((f) => ({ ...f }))
  )

  const prioritized = features
    .filter((f) => f.backlogPosition != null)
    .sort((a, b) => a.backlogPosition! - b.backlogPosition!)

  const unprioritized = features.filter((f) => f.backlogPosition == null)

  function promote(slug: string) {
    setFeatures((prev) => {
      const next = prev.map((f) => ({ ...f }))
      const sorted = next
        .filter((f) => f.backlogPosition != null)
        .sort((a, b) => a.backlogPosition! - b.backlogPosition!)

      const idx = sorted.findIndex((f) => f.slug === slug)
      if (idx <= 0) return prev

      // Swap positions with the item above
      const currentPos = sorted[idx].backlogPosition!
      const abovePos = sorted[idx - 1].backlogPosition!
      const current = next.find((f) => f.slug === sorted[idx].slug)!
      const above = next.find((f) => f.slug === sorted[idx - 1].slug)!
      current.backlogPosition = abovePos
      above.backlogPosition = currentPos

      return next
    })
  }

  function demote(slug: string) {
    setFeatures((prev) => {
      const next = prev.map((f) => ({ ...f }))
      const sorted = next
        .filter((f) => f.backlogPosition != null)
        .sort((a, b) => a.backlogPosition! - b.backlogPosition!)

      const idx = sorted.findIndex((f) => f.slug === slug)
      if (idx < 0 || idx >= sorted.length - 1) return prev

      // Swap positions with the item below
      const currentPos = sorted[idx].backlogPosition!
      const belowPos = sorted[idx + 1].backlogPosition!
      const current = next.find((f) => f.slug === sorted[idx].slug)!
      const below = next.find((f) => f.slug === sorted[idx + 1].slug)!
      current.backlogPosition = belowPos
      below.backlogPosition = currentPos

      return next
    })
  }

  function removeFromBacklog(slug: string) {
    setFeatures((prev) => {
      const next = prev.map((f) => ({ ...f }))
      const target = next.find((f) => f.slug === slug)
      if (!target || target.backlogPosition == null) return prev

      const removedPos = target.backlogPosition
      target.backlogPosition = null

      // Compact positions: shift everything above the removed position down by 1
      for (const f of next) {
        if (f.backlogPosition != null && f.backlogPosition > removedPos) {
          f.backlogPosition -= 1
        }
      }

      return next
    })
  }

  function addToBacklog(slug: string) {
    setFeatures((prev) => {
      const next = prev.map((f) => ({ ...f }))
      const target = next.find((f) => f.slug === slug)
      if (!target) return prev

      const maxPos = Math.max(
        0,
        ...next.filter((f) => f.backlogPosition != null).map((f) => f.backlogPosition!)
      )
      target.backlogPosition = maxPos + 1

      return next
    })
  }

  return (
    <>
      <Header />
      <div className="p-6 max-w-[1200px] mx-auto">
        <h1 className="mb-6 text-2xl font-bold text-foreground">Backlog</h1>

        {/* Prioritized features */}
        <div className="space-y-2">
          {prioritized.map((feature, idx) => (
            <div
              key={feature.slug}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
            >
              {/* Grip handle */}
              <GripVertical className="h-4 w-4 flex-shrink-0 text-foreground-subtle" />

              {/* Position number */}
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-accent text-xs font-semibold text-foreground">
                {feature.backlogPosition}
              </span>

              {/* Feature info */}
              <div className="flex flex-1 items-center gap-3 min-w-0">
                <Link
                  to={`/features/${feature.slug}`}
                  className="truncate font-medium text-foreground hover:text-primary transition-colors"
                >
                  {feature.name}
                </Link>
                <StatusBadge status={feature.status} />
                {feature.assignee && (
                  <span className="text-sm text-foreground-muted">{feature.assignee}</span>
                )}
                {feature.points != null && (
                  <span className="text-sm text-foreground-subtle">{feature.points} pts</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={() => promote(feature.slug)}
                  disabled={idx === 0}
                  className="rounded-md p-1.5 text-foreground-muted hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  title="Move up"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => demote(feature.slug)}
                  disabled={idx === prioritized.length - 1}
                  className="rounded-md p-1.5 text-foreground-muted hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  title="Move down"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => removeFromBacklog(feature.slug)}
                  className="rounded-md p-1.5 text-foreground-muted hover:bg-accent hover:text-foreground transition-colors"
                  title="Remove from backlog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {prioritized.length === 0 && (
            <div className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-foreground-subtle">
              No features in the backlog. Add features from the unprioritized list below.
            </div>
          )}
        </div>

        {/* Unprioritized features */}
        {unprioritized.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Unprioritized Features
            </h2>
            <div className="space-y-2">
              {unprioritized.map((feature) => (
                <div
                  key={feature.slug}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Link
                      to={`/features/${feature.slug}`}
                      className="truncate font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {feature.name}
                    </Link>
                    <StatusBadge status={feature.status} />
                    {feature.assignee && (
                      <span className="text-sm text-foreground-muted">{feature.assignee}</span>
                    )}
                    {feature.points != null && (
                      <span className="text-sm text-foreground-subtle">{feature.points} pts</span>
                    )}
                  </div>
                  <button
                    onClick={() => addToBacklog(feature.slug)}
                    className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors flex-shrink-0"
                  >
                    Add to backlog
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
