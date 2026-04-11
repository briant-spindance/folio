import { Link, useMatches } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  to?: string
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const matches = useMatches()

  // Use provided items or derive from route matches
  const crumbs: BreadcrumbItem[] = items ?? matches
    .filter((m) => (m.handle as { crumb?: string } | undefined)?.crumb)
    .map((m) => ({
      label: (m.handle as { crumb: string }).crumb,
      to: m.pathname,
    }))

  if (crumbs.length === 0) return null

  return (
    <nav className="flex items-center gap-1 text-[0.75rem] text-[var(--foreground-muted)] mb-4">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={12} className="text-[var(--foreground-subtle)]" />}
          {crumb.to && i < crumbs.length - 1 ? (
            <Link to={crumb.to} className="text-[var(--primary)] hover:underline no-underline">
              {crumb.label}
            </Link>
          ) : (
            <span className={i === crumbs.length - 1 ? 'text-[var(--foreground)]' : ''}>
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
