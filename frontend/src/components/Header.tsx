import { SearchBar } from "./SearchBar"

interface HeaderProps {
  projectName: string
  branch?: string
  commit?: string
  dirty?: boolean
  aiOpen?: boolean
  onAiToggle?: () => void
}

export function Header({ projectName, branch, commit, dirty, aiOpen, onAiToggle }: HeaderProps) {
  return (
    <header className="top-header">
      <div className="top-header-left">
        {/* Folio brand icon — same SVG as mockup */}
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

      <div className="top-header-center">
        <SearchBar />
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

        {/* AI sidebar toggle */}
        {onAiToggle && (
          <button
            className={`header-ai-toggle${aiOpen ? " active" : ""}`}
            onClick={onAiToggle}
            title={aiOpen ? "Close AI assistant" : "Open AI assistant"}
            aria-label={aiOpen ? "Close AI assistant" : "Open AI assistant"}
          >
            {/* Sparkles icon */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
              <path d="M20 3v4" />
              <path d="M22 5h-4" />
              <path d="M4 17v2" />
              <path d="M5 18H3" />
            </svg>
          </button>
        )}
      </div>
    </header>
  )
}
