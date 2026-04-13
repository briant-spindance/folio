import { useState, useCallback, useRef, useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import { DocEditor } from "@/components/DocEditor"
import { AssigneePicker } from "@/components/AssigneePicker"
import { useIssue, useSaveIssue, useStatus } from "@/hooks/useData"
import { FeaturePicker } from "@/components/FeaturePicker"
import type { SaveDocPayload, IssueStatus, IssueType, IssuePriority } from "@/lib/types"

const STATUS_OPTIONS: IssueStatus[] = ["open", "in-progress", "closed"]
const TYPE_OPTIONS: IssueType[] = ["bug", "task", "improvement", "chore"]
const PRIORITY_OPTIONS: IssuePriority[] = ["critical", "high", "medium", "low"]

export function IssuesEdit() {
  const { slug } = useParams<{ slug: string }>()
  const { data: issue, isLoading, error } = useIssue(slug ?? "")
  const { mutate: saveIssue, isPending } = useSaveIssue(slug ?? "")
  const { data: statusData } = useStatus()
  const teamMembers = statusData?.team?.map((t) => t.name) ?? []

  const [status, setStatus] = useState<IssueStatus>("open")
  const [type, setType] = useState<IssueType>("task")
  const [priority, setPriority] = useState<IssuePriority>("medium")
  const [assignees, setAssignees] = useState<string[]>([])
  const [points, setPoints] = useState("")
  const [feature, setFeature] = useState<string | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (issue && !initialized.current) {
      queueMicrotask(() => {
        setStatus(issue.status)
        setType(issue.type)
        setPriority(issue.priority)
        setAssignees(issue.assignees)
        setPoints(issue.points != null ? String(issue.points) : "")
        setFeature(issue.feature ?? null)
      })
      initialized.current = true
    }
  }, [issue])

  const handleSave = useCallback((payload: SaveDocPayload) => {
    saveIssue({
      title: payload.title,
      body: payload.body,
      status,
      type,
      priority,
      assignees,
      points: points.trim() ? Number(points) : null,
      feature: feature || null,
    })
  }, [saveIssue, status, type, priority, assignees, points, feature])

  if (isLoading) {
    return (
      <div style={{ color: "var(--foreground-muted)", padding: "40px", textAlign: "center" }}>
        Loading...
      </div>
    )
  }

  if (error || !issue) {
    return (
      <div className="card" style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ color: "var(--status-error)" }}>Issue not found.</p>
        <Link to="/issues" className="docs-back-link" style={{ justifyContent: "center", marginTop: "12px", marginBottom: 0 }}>
          &larr; Back to issues
        </Link>
      </div>
    )
  }

  const bodyForEditor = issue.body.trimStart().replace(/^#\s+.+\n?/, "")

  return (
    <>
      <Link to={`/issues/${slug}`} className="docs-back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        {issue.title}
      </Link>

      <div className="feature-edit-meta">
        <div className="feature-edit-meta-field">
          <label className="feature-edit-meta-label">Status</label>
          <select
            className="feature-edit-meta-select"
            value={status}
            onChange={(e) => setStatus(e.target.value as IssueStatus)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="feature-edit-meta-field">
          <label className="feature-edit-meta-label">Type</label>
          <select
            className="feature-edit-meta-select"
            value={type}
            onChange={(e) => setType(e.target.value as IssueType)}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="feature-edit-meta-field">
          <label className="feature-edit-meta-label">Priority</label>
          <select
            className="feature-edit-meta-select"
            value={priority}
            onChange={(e) => setPriority(e.target.value as IssuePriority)}
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="feature-edit-meta-field">
          <label className="feature-edit-meta-label">Assignees</label>
          <AssigneePicker
            value={assignees}
            teamMembers={teamMembers}
            onChange={setAssignees}
            mode="field"
          />
        </div>
        <div className="feature-edit-meta-field">
          <label className="feature-edit-meta-label">Points</label>
          <input
            className="feature-edit-meta-input feature-edit-meta-input-narrow"
            type="number"
            value={points}
            placeholder="—"
            onChange={(e) => setPoints(e.target.value)}
          />
        </div>
        <div className="feature-edit-meta-field">
          <label className="feature-edit-meta-label">Feature</label>
          <FeaturePicker
            value={feature}
            onChange={setFeature}
            mode="field"
          />
        </div>
      </div>

      <DocEditor
        initialTitle={issue.title}
        initialIcon={null}
        initialBody={bodyForEditor}
        onSave={handleSave}
        isSaving={isPending}
        viewHref={`/issues/${slug}`}
      />
    </>
  )
}
