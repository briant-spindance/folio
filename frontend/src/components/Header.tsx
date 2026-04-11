interface HeaderProps {
  projectName: string
  branch?: string
  commit?: string
  dirty?: boolean
}

export function Header({ projectName, branch, commit, dirty }: HeaderProps) {
  return (
    <header className="top-header">
      <div className="top-header-left">
        {/* Forge brand icon — same SVG as mockup */}
        <svg
          className="header-brand-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z" />
          <path d="m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18" />
          <path d="m2.3 2.3 7.286 7.286" />
          <circle cx="11" cy="11" r="2" />
        </svg>
        <div className="header-brand-divider" />
        <span className="header-project-name">{projectName}</span>
      </div>

      <div className="top-header-right">
        {(branch || commit) && (
          <div className="header-vcs">
            {branch && (
              <span className="header-vcs-branch">
                {/* git-branch icon inline */}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="6" y1="3" x2="6" y2="15" />
                  <circle cx="18" cy="6" r="3" />
                  <circle cx="6" cy="18" r="3" />
                  <path d="M18 9a9 9 0 0 1-9 9" />
                </svg>
                {branch}
                {dirty && <span className="header-vcs-dirty" title="Uncommitted changes" />}
              </span>
            )}
            {commit && (
              <span className="header-vcs-commit">
                <a href="#">{commit}</a>
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
