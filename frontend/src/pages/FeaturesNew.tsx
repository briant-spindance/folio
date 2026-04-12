import { useState, useCallback } from "react"
import { Link } from "react-router-dom"
import { DocEditor } from "@/components/DocEditor"
import { useCreateFeature } from "@/hooks/useData"
import type { SaveDocPayload, FeatureStatus, IssuePriority } from "@/lib/types"

const STATUS_OPTIONS: FeatureStatus[] = ["draft", "ready", "in-progress", "review", "done"]
const PRIORITY_OPTIONS: IssuePriority[] = ["critical", "high", "medium", "low"]

export function FeaturesNew() {
  const { mutate: createFeature, isPending } = useCreateFeature()

  const [status, setStatus] = useState<FeatureStatus>("draft")
  const [priority, setPriority] = useState<IssuePriority>("medium")
  const [assignee, setAssignee] = useState("")
  const [points, setPoints] = useState("")

  const handleSave = useCallback((payload: SaveDocPayload) => {
    createFeature({
      title: payload.title,
      body: payload.body,
      priority,
    })
  }, [createFeature, priority])

  return (
    <>
      <Link to="/features" className="docs-back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Features
      </Link>

      {/* Feature metadata fields */}
      <div className="feature-edit-meta">
        <div className="feature-edit-meta-field">
          <label className="feature-edit-meta-label">Status</label>
          <select
            className="feature-edit-meta-select"
            value={status}
            onChange={(e) => setStatus(e.target.value as FeatureStatus)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
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
          <label className="feature-edit-meta-label">Assignee</label>
          <input
            className="feature-edit-meta-input"
            type="text"
            value={assignee}
            placeholder="Unassigned"
            onChange={(e) => setAssignee(e.target.value)}
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
