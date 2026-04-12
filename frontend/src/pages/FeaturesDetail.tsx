import { useState, useRef, useCallback } from "react"
import { Link, useParams } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useFeature, useDeleteFeature, useSaveFeature, useFeatureArtifacts, useUploadArtifact, useDeleteArtifact } from "@/hooks/useData"
import { StatusBadge } from "@/components/Badges"
import type { FeatureStatus, IssuePriority } from "@/lib/types"

const STATUS_OPTIONS: FeatureStatus[] = ["draft", "ready", "in-progress", "review", "done"]
const PRIORITY_OPTIONS: IssuePriority[] = ["critical", "high", "medium", "low"]

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—"
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

function headingRenderer(depth: 2 | 3 | 4) {
  return function Heading({ children }: { children?: React.ReactNode }) {
    const text = typeof children === "string" ? children : ""
    const id = slugifyHeading(text)
    const Tag = `h${depth}` as "h2" | "h3" | "h4"
    return <Tag id={id}>{children}</Tag>
  }
}

// ── Inline‑editable field components ─────────────────────────────

function InlineSelect<T extends string>({
  value,
  options,
  onSave,
  renderValue,
}: {
  value: T
  options: T[]
  onSave: (v: T) => void
  renderValue?: (v: T) => React.ReactNode
}) {
  return (
    <select
      className="feature-meta-select"
      value={value}
      onChange={(e) => onSave(e.target.value as T)}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {renderValue ? opt : opt}
        </option>
      ))}
    </select>
  )
}

function InlineText({
  value,
  placeholder,
  onSave,
}: {
  value: string
  placeholder?: string
  onSave: (v: string | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (!editing) {
    return (
      <button
        className="feature-meta-inline-btn"
        onClick={() => { setDraft(value); setEditing(true) }}
      >
        {value || <span className="text-muted">{placeholder ?? "—"}</span>}
      </button>
    )
  }

  return (
    <input
      className="feature-meta-inline-input"
      autoFocus
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false)
        const trimmed = draft.trim()
        if (trimmed !== value) {
          onSave(trimmed || null)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur()
        } else if (e.key === "Escape") {
          setDraft(value)
          setEditing(false)
        }
      }}
    />
  )
}

function InlineNumber({
  value,
  placeholder,
  onSave,
}: {
  value: number | null
  placeholder?: string
  onSave: (v: number | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value?.toString() ?? "")

  if (!editing) {
    return (
      <button
        className="feature-meta-inline-btn"
        onClick={() => { setDraft(value?.toString() ?? ""); setEditing(true) }}
      >
        {value != null ? value : <span className="text-muted">{placeholder ?? "—"}</span>}
      </button>
    )
  }

  return (
    <input
      className="feature-meta-inline-input"
      type="number"
      autoFocus
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false)
        const num = draft.trim() ? Number(draft) : null
        if (num !== value) {
          onSave(num)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur()
        } else if (e.key === "Escape") {
          setDraft(value?.toString() ?? "")
          setEditing(false)
        }
      }}
    />
  )
}

// ── Artifact type icon ───────────────────────────────────────────

function ArtifactIcon({ type }: { type: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    image: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    ),
    document: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      </svg>
    ),
    markdown: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <line x1="8" x2="16" y1="13" y2="13" />
        <line x1="8" x2="16" y1="17" y2="17" />
      </svg>
    ),
    data: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M8 12h8" />
        <path d="M8 16h8" />
      </svg>
    ),
  }

  return (
    <span className="feature-artifact-icon">
      {iconMap[type] ?? iconMap.document}
    </span>
  )
}

// ── Page component ───────────────────────────────────────────────

export function FeaturesDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { data: feature, isLoading, error } = useFeature(slug ?? "")
  const { mutate: deleteFeature, isPending: isDeleting } = useDeleteFeature()
  const { mutate: saveFeature } = useSaveFeature(slug ?? "")
  const { data: artifacts } = useFeatureArtifacts(slug ?? "")
  const uploadMutation = useUploadArtifact(slug ?? "")
  const deleteArtifactMutation = useDeleteArtifact(slug ?? "")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files) return
    for (let i = 0; i < files.length; i++) {
      uploadMutation.mutate(files[i])
    }
  }, [uploadMutation])

  if (isLoading) {
    return <div style={{ color: "var(--foreground-muted)", padding: "40px", textAlign: "center" }}>Loading...</div>
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

  // Strip leading whitespace then a `# Title` line
  const body = feature.body.trimStart().replace(/^#\s+.+\n?/, "")

  return (
    <>
      <Link to="/features" className="docs-back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Features
      </Link>

      <div className="feature-detail">
        {/* ── Content area ──────────────────────────────────── */}
        <div className="feature-detail-content">
          <div className="feature-detail-header">
            <h1 className="feature-detail-title">{feature.title}</h1>
            <div className="feature-detail-actions">
              <Link to={`/features/${slug}/edit`} className="btn btn-outline btn-sm">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </Link>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={isDeleting}
                onClick={() => {
                  if (confirm(`Delete "${feature.title}"? This will remove the feature directory and all artifacts. This cannot be undone.`)) {
                    deleteFeature(slug ?? "")
                  }
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>

          <div className="docs-prose-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1>{children}</h1>,
                h2: headingRenderer(2),
                h3: headingRenderer(3),
                h4: headingRenderer(4),
              }}
            >
              {body}
            </ReactMarkdown>
          </div>
        </div>

        {/* ── Right column ───────────────────────────────── */}
        <div className="feature-detail-sidebar">
          <aside className="feature-meta-sidebar">
          <h3 className="feature-meta-heading">Details</h3>

          <div className="feature-meta-field">
            <span className="feature-meta-label">Status</span>
            <InlineSelect
              value={feature.status}
              options={STATUS_OPTIONS}
              onSave={(v) => saveFeature({ status: v })}
            />
          </div>

          <div className="feature-meta-field">
            <span className="feature-meta-label">Priority</span>
            <div className="feature-meta-value">
              <InlineSelect
                value={feature.priority}
                options={PRIORITY_OPTIONS}
                onSave={(v) => saveFeature({ priority: v })}
              />
            </div>
          </div>

          <div className="feature-meta-field">
            <span className="feature-meta-label">Assignee</span>
            <div className="feature-meta-value">
              <InlineText
                value={feature.assignee ?? ""}
                placeholder="Unassigned"
                onSave={(v) => saveFeature({ assignee: v })}
              />
            </div>
          </div>

          <div className="feature-meta-field">
            <span className="feature-meta-label">Points</span>
            <div className="feature-meta-value">
              <InlineNumber
                value={feature.points}
                placeholder="—"
                onSave={(v) => saveFeature({ points: v })}
              />
            </div>
          </div>

          <div className="feature-meta-field">
            <span className="feature-meta-label">Sprint</span>
            <div className="feature-meta-value feature-meta-readonly">
              {feature.sprint ?? <span className="text-muted">None</span>}
            </div>
          </div>

          {feature.tags.length > 0 && (
            <div className="feature-meta-field">
              <span className="feature-meta-label">Tags</span>
              <div className="feature-meta-tags">
                {feature.tags.map((t) => (
                  <span key={t} className="badge badge-label">{t}</span>
                ))}
              </div>
            </div>
          )}

          <div className="feature-meta-divider" />

          <div className="feature-meta-field">
            <span className="feature-meta-label">Created</span>
            <div className="feature-meta-value feature-meta-readonly">
              {formatDate(feature.created)}
            </div>
          </div>

          <div className="feature-meta-field">
            <span className="feature-meta-label">Modified</span>
            <div className="feature-meta-value feature-meta-readonly">
              {formatDate(feature.modified)}
            </div>
          </div>
        </aside>

        {/* ── Supporting files (own box) ────────────────────── */}
        <div className="feature-sidebar-files-card">
          <div className="feature-sidebar-files-header">
            <h3 className="feature-meta-heading">Supporting Files</h3>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={(e) => handleFileUpload(e.target.files)}
            />
          </div>

          {artifacts && artifacts.length > 0 ? (
            <div className="feature-sidebar-files-list">
              {artifacts.map((a) => (
                <div key={a.name} className="feature-sidebar-file-row">
                  <Link
                    to={`/features/${slug}/artifacts/${encodeURIComponent(a.name)}`}
                    className="feature-sidebar-file-link"
                  >
                    <ArtifactIcon type={a.type} />
                    <span className="feature-sidebar-file-name">{a.name}</span>
                  </Link>
                  {deleteConfirm === a.name ? (
                    <div className="feature-artifact-confirm">
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setDeleteConfirm(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          deleteArtifactMutation.mutate(a.name, {
                            onSettled: () => setDeleteConfirm(null),
                          })
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <button
                      className="feature-artifact-delete"
                      title="Delete file"
                      onClick={() => setDeleteConfirm(a.name)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="feature-sidebar-files-empty">No files yet</p>
          )}
        </div>
        </div>
      </div>
    </>
  )
}
