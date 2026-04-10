import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface HeaderProps {
  action?: ReactNode
}

const routeLabels: Record<string, string> = {
  '': 'Dashboard',
  docs: 'Project Docs',
  features: 'Features',
  sprints: 'Sprints',
  issues: 'Issues',
  reviews: 'Reviews',
  config: 'Configuration',
  backlog: 'Backlog',
  new: 'New',
  edit: 'Edit',
  plan: 'Planning',
  health: 'Health Check',
  board: 'Board',
}

function humanize(slug: string): string {
  return routeLabels[slug] ?? slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function Header({ action }: HeaderProps) {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  const crumbs = segments.map((segment, index) => {
    const path = '/' + segments.slice(0, index + 1).join('/')
    return { label: humanize(segment), path }
  })

  if (crumbs.length === 0) {
    crumbs.push({ label: 'Dashboard', path: '/' })
  }

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-3 bg-background">
      <nav className="flex items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => (
          <span key={crumb.path} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-foreground-subtle" />}
            {index === crumbs.length - 1 ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link to={crumb.path} className="text-foreground-muted hover:text-foreground transition-colors">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
      {action && <div>{action}</div>}
    </header>
  )
}
