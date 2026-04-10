import { Link } from 'react-router-dom'
import { Header } from '@/components/layout/header'
import { mockReviews, mockHealthChecks } from '@/lib/mock-data'
import { ClipboardCheck, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

export default function ReviewListPage() {
  const passCount = mockHealthChecks.filter((c) => c.status === 'pass').length
  const warnCount = mockHealthChecks.filter((c) => c.status === 'warn').length
  const failCount = mockHealthChecks.filter((c) => c.status === 'fail').length

  return (
    <>
      <Header />
      <div className="p-6 max-w-[1200px] mx-auto">
        {/* Project Reviews */}
        <h2 className="text-sm font-medium text-foreground-muted uppercase tracking-wider mb-3">
          Project Reviews
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {mockReviews.map((review) => (
            <Link
              key={review.slug}
              to={`/reviews/${review.slug}`}
              className="rounded-lg border border-border bg-surface-raised p-4 hover:border-border-strong transition-colors group"
            >
              <div className="flex items-start gap-3">
                <ClipboardCheck className="h-5 w-5 text-foreground-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {review.type}
                  </p>
                  <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                    {review.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Forge Health */}
        <h2 className="text-sm font-medium text-foreground-muted uppercase tracking-wider mb-3">
          Forge Health
        </h2>
        <Link
          to="/reviews/health"
          className="block rounded-lg border border-border bg-surface-raised p-4 hover:border-border-strong transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Health Check Results</p>
              <p className="text-xs text-foreground-muted mt-1">
                {mockHealthChecks.length} checks completed
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-success">{passCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-warning">{warnCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-error" />
                <span className="text-sm font-medium text-error">{failCount}</span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </>
  )
}
