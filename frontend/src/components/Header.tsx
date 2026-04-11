import { Crosshair, GitBranch } from 'lucide-react'

export function Header() {
  return (
    <header
      className="fixed top-0 left-0 right-0 h-[var(--header-height)] bg-[var(--surface-raised)] border-b border-[var(--border)] flex items-center justify-between px-5 z-[100]"
    >
      <div className="flex items-center gap-[10px]">
        <Crosshair size={20} className="text-[var(--primary)] shrink-0" />
        <div className="w-px h-5 bg-[var(--border-strong)]" />
        <span className="text-[0.9375rem] font-semibold text-[var(--foreground)]">
          forge-project
        </span>
      </div>

      <div className="flex items-center gap-[14px]">
        <div className="flex items-center gap-2 text-[0.6875rem] text-[var(--foreground-muted)]">
          <span className="flex items-center gap-1 font-mono text-[0.6875rem] font-medium text-[var(--foreground)] bg-[var(--surface)] px-2 py-0.5 rounded">
            <GitBranch size={12} className="text-[var(--foreground-muted)]" />
            feature/oauth
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-warning)] shrink-0" title="Uncommitted changes" />
          </span>
          <span className="font-mono text-[0.625rem] text-[var(--foreground-subtle)]">
            <a href="#" className="text-[var(--primary)] no-underline">abc1234</a>
          </span>
        </div>
      </div>
    </header>
  )
}
