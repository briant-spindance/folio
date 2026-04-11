import type { FeatureStatus } from "@/lib/types"

interface StatusBadgeProps {
  status: FeatureStatus | "open" | "closed"
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const cls = `badge badge-${status}`
  return <span className={cls}>{status}</span>
}

interface LabelBadgeProps {
  label: string
}

export function LabelBadge({ label }: LabelBadgeProps) {
  return <span className="badge badge-label">{label}</span>
}
