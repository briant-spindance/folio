import { useState, useCallback } from "react"
import { Link } from "react-router-dom"
import { DocEditor } from "@/components/DocEditor"
import { AssigneePicker } from "@/components/AssigneePicker"
import { useCreateIssue, useStatus } from "@/hooks/useData"
import { FeaturePicker } from "@/components/FeaturePicker"
import type { SaveDocPayload, IssueStatus, IssueType, IssuePriority } from "@/lib/types"

const STATUS_OPTIONS: IssueStatus[] = ["open", "in-progress", "closed"]
const TYPE_OPTIONS: IssueType[] = ["bug", "task", "improvement", "chore"]
const PRIORITY_OPTIONS: IssuePriority[] = ["critical", "high", "medium", "low"]

export function IssuesNew() {
  const { mutate: createIssue, isPending } = useCreateIssue()
  const { data: statusData } = useStatus()
  const teamMembers = statusData?.team?.map((t) => t.name) ?? []

  const [status, setStatus] = useState<IssueStatus>("open")
  const [type, setType] = useState<IssueType>("task")
  const [priority, setPriority] = useState<IssuePriority>("medium")
  const [assignees, setAssignees] = useState<string[]>([])
  const [points, setPoints] = useState("")
  const [feature, setFeature] = useState<string | null>(null)

  const handleSave = useCallback((payload: SaveDocPayload) => {
    createIssue({
      title: payload.title,
      body: payload.body,
      type,
      priority,
      ...(feature ? { feature } : {}),
    })
  }, [createIssue, type, priority, feature])

  return (
    <>
      <Link to="/issues" className="docs-back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Issues
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
        initialTitle=""
        initialIcon={null}
        initialBody=""
        onSave={handleSave}
        isSaving={isPending}
        isNew
      />
    </>
  )
}
