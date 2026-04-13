import { Link } from "react-router-dom"
import { useStatus } from "@/hooks/useData"
import { StatusBadge, LabelBadge } from "@/components/Badges"
import { Card, CardHeader } from "@/components/Card"
import { docIcon } from "@/lib/docIcons"

// ── Icon helpers (inline SVGs matching lucide icons used in mockup) ──────────

function IconBookOpen() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function IconPuzzle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.27 12.27a2.5 2.5 0 0 0-3.54 3.54l-9 9a2.5 2.5 0 0 1-3.54-3.54l9-9a2.5 2.5 0 0 0 3.54-3.54" /><path d="m8 18-4-4" /><path d="m6 6 2-2 6 6" /><path d="m16 2 6 6" /><path d="M17 2h5v5" />
    </svg>
  )
}

function IconCircleDot() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="1" />
    </svg>
  )
}

function IconFileText() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><line x1="10" x2="14" y1="9" y2="9" /><line x1="8" x2="16" y1="13" y2="13" /><line x1="8" x2="16" y1="17" y2="17" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconShieldCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function IconPlay() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  )
}

function IconCheckCircle2() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function IconAlertTriangle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  )
}

function IconXCircle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
    </svg>
  )
}

function formatRelativeDate(dateStr?: string | null): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "Updated today"
  if (diffDays === 1) return "Updated yesterday"
  if (diffDays < 7) return `Updated ${diffDays} days ago`
  if (diffDays < 14) return "Updated 1 week ago"
  return `Updated ${Math.floor(diffDays / 7)} weeks ago`
}

function formatModified(dateStr?: string | null): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffHours < 2) return "2 hours ago"
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 14) return "1 week ago"
  return `${Math.floor(diffDays / 7)} weeks ago`
}

export function Dashboard() {
  const { data, isLoading, error } = useStatus()

  if (isLoading) {
    return <div style={{ color: "var(--foreground-muted)", padding: "40px", textAlign: "center" }}>Loading…</div>
  }
  if (error || !data) {
    return <div style={{ color: "var(--status-error)", padding: "40px" }}>Failed to load dashboard data.</div>
  }

  return (
    <>
      {/* ── 1. Project Docs ─────────────────────────────── */}
      <Card>
        <CardHeader
          title={<><IconBookOpen />Project Docs</>}
          action={
            <Link className="card-action" to="/docs">
              View all <IconChevronRight />
            </Link>
          }
        />
        <div className="docs-grid">
          {data.recentDocs.map((doc) => (
            <Link key={doc.slug} className="doc-tile" to={`/docs/${doc.slug}`}>
              <div className="doc-tile-icon">
                {docIcon(doc.icon)}
              </div>
              <div className="doc-tile-text">
                <span className="doc-tile-name">{doc.title}</span>
                <span className="doc-tile-meta">{formatRelativeDate(doc.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      {/* ── 2. Features ─────────────────────────────────── */}
      <Card>
        <CardHeader
          title={<><IconPuzzle />Features</>}
          action={
            <Link className="card-action" to="/features">
              View all features <IconChevronRight />
            </Link>
          }
        />
        <table className="features-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Status</th>
              <th>Assignee</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {data.topFeatures.map((f, i) => (
              <tr key={f.slug}>
                <td>
                  <div className="feature-name-cell">
                    <span className="feature-position">{i + 1}</span>
                    <span className="feature-name">{f.title}</span>
                  </div>
                </td>
                <td><StatusBadge status={f.status} /></td>
                <td className="feature-assignee">{f.assignees?.length ? f.assignees.join(", ") : "—"}</td>
                <td className="feature-points">{f.points ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* ── 3. Open Issues ──────────────────────────────── */}
      <Card>
        <CardHeader
          title={<><IconCircleDot />Open Issues</>}
          action={
            <Link className="card-action" to="/issues">
              View all issues <IconChevronRight />
            </Link>
          }
        />
        <table className="issues-table">
          <thead>
            <tr>
              <th>Issue</th>
              <th>Status</th>
              <th>Labels</th>
            </tr>
          </thead>
          <tbody>
            {data.openIssues.map((issue) => (
              <tr key={issue.slug}>
                <td className="issue-name">{issue.title}</td>
                <td><StatusBadge status={issue.status} /></td>
                <td>
                  <div className="issue-labels">
                    {issue.labels?.map((lbl) => (
                      <LabelBadge key={lbl} label={lbl} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* ── 4. Recent Wiki Changes ──────────────────────── */}
      <Card>
        <CardHeader
          title={<><IconFileText />Recent Wiki Changes</>}
          action={
            <Link className="card-action" to="/wiki">
              View wiki <IconChevronRight />
            </Link>
          }
        />
        <table className="wiki-table">
          <thead>
            <tr>
              <th>Page</th>
              <th>Changed by</th>
              <th style={{ textAlign: "right" }}>Modified</th>
            </tr>
          </thead>
          <tbody>
            {data.recentDocs.slice(0, 5).map((doc) => (
              <tr key={doc.slug} onClick={() => {}} style={{ cursor: "pointer" }}>
                <td className="wiki-page-name">{doc.title}</td>
                <td className="wiki-author">{doc.description ?? "—"}</td>
                <td className="wiki-modified">{formatModified(doc.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* ── 5. Team ─────────────────────────────────────── */}
      <Card>
        <CardHeader title={<><IconUsers />Team</>} />
        <div className="team-grid">
          {data.team.map((member) => (
            <div key={member.name} className="team-member">
              <div className="team-avatar">{member.initials}</div>
              <div className="team-info">
                <span className="team-name">{member.name}</span>
                <span className="team-role">{member.role}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── 6. Forge Health ─────────────────────────────── */}
      <Card>
        <CardHeader
          title={<><IconShieldCheck />Forge Health</>}
          action={
            <a className="card-action" href="#">
              Run checks <IconPlay />
            </a>
          }
        />
        <div className="health-summary-row">
          <div className="health-stat">
            <span className="health-stat-value pass">{data.health.passed}</span>
            <span className="health-stat-label">passed</span>
          </div>
          <div className="health-stat">
            <span className="health-stat-value warn">{data.health.warnings}</span>
            <span className="health-stat-label">warnings</span>
          </div>
          <div className="health-stat">
            <span className="health-stat-value fail">{data.health.failed}</span>
            <span className="health-stat-label">failed</span>
          </div>
          <span className="health-timestamp">{data.health.lastRun}</span>
        </div>
        <ul className="health-checks-list">
          {data.health.checks.map((check, i) => {
            const cls = `health-check-item check-${check.level}`
            const icon =
              check.level === "pass" ? <IconCheckCircle2 /> :
              check.level === "warn" ? <IconAlertTriangle /> :
              <IconXCircle />
            return (
              <li key={i} className={cls}>
                {icon}
                <span className="health-check-msg">{check.message}</span>
              </li>
            )
          })}
        </ul>
      </Card>
    </>
  )
}
