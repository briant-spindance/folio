import { cn } from '@/lib/utils'
import type { FeatureStatus } from '@/lib/types'

const stateStyles: Record<FeatureStatus, string> = {
  draft: 'bg-[color-mix(in_srgb,var(--state-draft)_15%,transparent)] text-[var(--state-draft)]',
  ready: 'bg-[color-mix(in_srgb,var(--state-ready)_15%,transparent)] text-[var(--state-ready)]',
  'in-progress': 'bg-[color-mix(in_srgb,var(--state-in-progress)_15%,transparent)] text-[var(--state-in-progress)]',
  review: 'bg-[color-mix(in_srgb,var(--state-review)_15%,transparent)] text-[var(--state-review)]',
  done: 'bg-[color-mix(in_srgb,var(--state-done)_15%,transparent)] text-[var(--state-done)]',
}

interface StatusBadgeProps {
  status: FeatureStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium',
        stateStyles[status],
        className,
      )}
    >
      {status}
    </span>
  )
}
