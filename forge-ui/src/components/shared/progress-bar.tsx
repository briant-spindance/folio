import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max: number
  className?: string
  showLabel?: boolean
}

export function ProgressBar({ value, max, className, showLabel = true }: ProgressBarProps) {
  const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="h-2 flex-1 rounded-full bg-surface-inset">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-foreground-muted whitespace-nowrap">
          {value} / {max} pts
        </span>
      )}
    </div>
  )
}
