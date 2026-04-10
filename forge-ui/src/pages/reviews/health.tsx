import { Header } from '@/components/layout/header'
import { mockHealthChecks } from '@/lib/mock-data'
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react'

const statusConfig = {
  pass: {
    icon: CheckCircle2,
    color: 'text-success',
    bg: 'bg-success/12',
    label: 'Pass',
  },
  warn: {
    icon: AlertTriangle,
    color: 'text-warning',
    bg: 'bg-warning/12',
    label: 'Warn',
  },
  fail: {
    icon: XCircle,
    color: 'text-error',
    bg: 'bg-error/12',
    label: 'Fail',
  },
} as const

export default function HealthCheckPage() {
  const passCount = mockHealthChecks.filter((c) => c.status === 'pass').length
  const warnCount = mockHealthChecks.filter((c) => c.status === 'warn').length
  const failCount = mockHealthChecks.filter((c) => c.status === 'fail').length

  return (
    <>
      <Header
        action={
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors">
            <RefreshCw className="h-4 w-4" />
            Re-run
          </button>
        }
      />
      <div className="p-6 max-w-[1200px] mx-auto">
        {/* Summary */}
        <div className="mb-6 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm text-foreground">
              <span className="font-medium">{passCount}</span> passed
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm text-foreground">
              <span className="font-medium">{warnCount}</span> warnings
            </span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-error" />
            <span className="text-sm text-foreground">
              <span className="font-medium">{failCount}</span> failed
            </span>
          </div>
        </div>

        {/* Health checks table */}
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="px-4 py-2.5 text-left font-medium text-foreground-muted">Check Name</th>
                <th className="px-4 py-2.5 text-left font-medium text-foreground-muted">Status</th>
                <th className="px-4 py-2.5 text-left font-medium text-foreground-muted">Details</th>
              </tr>
            </thead>
            <tbody>
              {mockHealthChecks.map((check) => {
                const config = statusConfig[check.status]
                const Icon = config.icon
                return (
                  <tr
                    key={check.name}
                    className="border-b border-border last:border-b-0 bg-background hover:bg-surface transition-colors"
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {check.name}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${config.bg} ${config.color}`}
                      >
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-foreground-muted">
                      {check.message}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
