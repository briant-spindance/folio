import type { FeatureStatus, IssueStatus, IssueType } from "@/lib/types"

interface StatusBadgeProps {
  status: FeatureStatus | IssueStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const cls = `badge badge-${status}`
  return <span className={cls}>{status}</span>
}

interface IssueTypeBadgeProps {
  type: IssueType
}

const TYPE_COLORS: Record<IssueType, string> = {
  bug: "badge-bug",
  task: "badge-task",
  improvement: "badge-improvement",
  chore: "badge-chore",
}

export function IssueTypeBadge({ type }: IssueTypeBadgeProps) {
  const cls = `badge ${TYPE_COLORS[type] ?? "badge-label"}`
  return <span className={cls}>{type}</span>
}

interface LabelBadgeProps {
  label: string
}

export function LabelBadge({ label }: LabelBadgeProps) {
  return <span className="badge badge-label">{label}</span>
}
