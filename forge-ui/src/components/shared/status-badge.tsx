import { cn } from '@/lib/utils'
import type { WorkflowState, IssueStatus, SprintStatus } from '@/types'

const stateColors: Record<string, string> = {
  draft: 'bg-state-draft/12 text-state-draft dark:bg-state-draft/20',
  ready: 'bg-state-ready/12 text-state-ready dark:bg-state-ready/20',
  'in-progress': 'bg-state-in-progress/12 text-state-in-progress dark:bg-state-in-progress/20',
  review: 'bg-state-review/12 text-state-review dark:bg-state-review/20',
  done: 'bg-state-done/12 text-state-done dark:bg-state-done/20',
  open: 'bg-state-ready/12 text-state-ready dark:bg-state-ready/20',
  closed: 'bg-state-done/12 text-state-done dark:bg-state-done/20',
  planning: 'bg-state-draft/12 text-state-draft dark:bg-state-draft/20',
  active: 'bg-state-in-progress/12 text-state-in-progress dark:bg-state-in-progress/20',
  completed: 'bg-state-done/12 text-state-done dark:bg-state-done/20',
}

interface StatusBadgeProps {
  status: WorkflowState | IssueStatus | SprintStatus | string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize',
        stateColors[status] ?? 'bg-surface text-foreground-muted',
        className
      )}
    >
      {status}
    </span>
  )
}
