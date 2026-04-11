import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  Puzzle,
  Timer,
  CircleDot,
  FileText,
  ClipboardCheck,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/docs', label: 'Project Docs', icon: BookOpen },
  { to: '/features', label: 'Features', icon: Puzzle },
  { to: '/sprints', label: 'Sprints', icon: Timer },
  { to: '/issues', label: 'Issues', icon: CircleDot },
  { to: '/wiki', label: 'Wiki', icon: FileText },
  { to: '/review-tools', label: 'Review Tools', icon: ClipboardCheck },
  { to: '/configuration', label: 'Configuration', icon: Settings },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      style={{ width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)' }}
      className="fixed top-[var(--header-height)] left-0 bottom-0 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col py-2 z-50 transition-[width] duration-200 overflow-hidden"
    >
      <nav className="flex-1">
        {navItems.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-[10px] px-4 py-[7px] text-[0.8125rem] no-underline cursor-pointer transition-[background,color] duration-100 border-l-[3px] border-transparent whitespace-nowrap',
                'text-[var(--foreground-muted)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]',
                isActive && 'text-[var(--primary)] bg-[var(--accent)] border-l-[var(--primary)] font-medium',
                collapsed && 'px-0 justify-center',
              )
            }
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[var(--border)] pt-2">
        <button
          onClick={onToggle}
          className={cn(
            'flex items-center gap-[10px] px-4 py-[7px] text-xs text-[var(--foreground-subtle)] cursor-pointer border-none bg-transparent w-full font-[inherit] transition-colors duration-100 whitespace-nowrap border-l-[3px] border-transparent hover:text-[var(--foreground-muted)] hover:bg-[var(--accent)]',
            collapsed && 'px-0 justify-center',
          )}
        >
          {collapsed ? <PanelLeftOpen size={18} className="shrink-0" /> : <PanelLeftClose size={18} className="shrink-0" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
