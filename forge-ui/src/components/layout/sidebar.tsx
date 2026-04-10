import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Puzzle,
  Timer,
  CircleDot,
  ClipboardCheck,
  Settings,
  GitBranch,
  Sun,
  Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { mockVCS } from '@/lib/mock-data'
import { useTheme } from '@/hooks/use-theme'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/docs', icon: FileText, label: 'Project Docs' },
  { to: '/features', icon: Puzzle, label: 'Features' },
  { to: '/sprints', icon: Timer, label: 'Sprints' },
  { to: '/issues', icon: CircleDot, label: 'Issues' },
  { to: '/reviews', icon: ClipboardCheck, label: 'Reviews' },
  { to: '/config', icon: Settings, label: 'Configuration' },
]

export function Sidebar() {
  const { theme, toggleTheme } = useTheme()

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-surface">
      {/* Project name */}
      <div className="px-4 pt-5 pb-1">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            F
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Forge</h1>
            <p className="text-[11px] text-foreground-muted">my-project</p>
          </div>
        </div>
      </div>

      {/* VCS indicator */}
      <div className="px-4 pb-4 pt-1">
        <div className="flex items-center gap-1.5 text-[11px] text-foreground-subtle">
          <GitBranch className="h-3 w-3" />
          <span className="truncate">{mockVCS.branch}</span>
          {mockVCS.dirty && (
            <span className="h-1.5 w-1.5 rounded-full bg-warning flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-accent text-foreground font-medium border-l-[3px] border-primary pl-[9px]'
                  : 'text-foreground-muted hover:bg-accent hover:text-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Theme toggle */}
      <div className="border-t border-border px-3 py-3">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground-muted hover:bg-accent hover:text-foreground w-full transition-colors"
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          {theme === 'light' ? 'Dark mode' : 'Light mode'}
        </button>
      </div>
    </aside>
  )
}
