import { useState, useCallback, useRef, useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import { DocEditor } from "@/components/DocEditor"
import { useFeature, useSaveFeature } from "@/hooks/useData"
import type { SaveDocPayload, FeatureStatus, IssuePriority } from "@/lib/types"

const STATUS_OPTIONS: FeatureStatus[] = ["draft", "ready", "in-progress", "review", "done"]
const PRIORITY_OPTIONS: IssuePriority[] = ["critical", "high", "medium", "low"]

export function FeaturesEdit() {
  const { slug } = useParams<{ slug: string }>()
  const { data: feature, isLoading, error } = useFeature(slug ?? "")
  const { mutate: saveFeature, isPending } = useSaveFeature(slug ?? "")

  // Local metadata state (synced from feature data on load)
  const [status, setStatus] = useState<FeatureStatus>("draft")
  const [priority, setPriority] = useState<IssuePriority>("medium")
  const [assignee, setAssignee] = useState("")
  const [points, setPoints] = useState("")
  const initialized = useRef(false)

  useEffect(() => {
    if (feature && !initialized.current) {
      setStatus(feature.status)
      setPriority(feature.priority)
      setAssignee(feature.assignee ?? "")
      setPoints(feature.points != null ? String(feature.points) : "")
      initialized.current = true
    }
  }, [feature])

  const handleSave = useCallback((payload: SaveDocPayload) => {
    saveFeature({
      title: payload.title,
      body: payload.body,
      status,
      priority,
      assignee: assignee.trim() || null,
      points: points.trim() ? Number(points) : null,
    })
  }, [saveFeature, status, priority, assignee, points])

  if (isLoading) {
    return (
      <div style={{ color: "var(--foreground-muted)", padding: "40px", textAlign: "center" }}>
        Loading...
      </div>
    )
  }

  if (error || !feature) {
    return (
      <div className="card" style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ color: "var(--status-error)" }}>Feature not found.</p>
        <Link to="/features" className="docs-back-link" style={{ justifyContent: "center", marginTop: "12px", marginBottom: 0 }}>
          &larr; Back to features
        </Link>
      </div>
    )
  }

  // Strip the leading `# Title` line
  const bodyForEditor = feature.body.trimStart().replace(/^#\s+.+\n?/, "")

  return (
    <>
      <Link to={`/features/${slug}`} className="docs-back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        {feature.title}
      </Link>

      {/* Feature metadata fields above the editor */}
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
        initialTitle={feature.title}
        initialIcon={null}
        initialBody={bodyForEditor}
        onSave={handleSave}
        isSaving={isPending}
        viewHref={`/features/${slug}`}
      />
    </>
  )
}
