import { useState, useRef, useCallback, useEffect } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { createPortal } from "react-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useIssue, useDeleteIssue, useSaveIssue, useIssueArtifacts, useUploadIssueArtifact, useDeleteIssueArtifact, useCreateIssueArtifact, useStatus } from "@/hooks/useData"
import { AssigneePicker } from "@/components/AssigneePicker"
import { FeaturePicker } from "@/components/FeaturePicker"
import type { IssueStatus, IssueType, IssuePriority } from "@/lib/types"

const STATUS_OPTIONS: IssueStatus[] = ["open", "in-progress", "closed"]
const TYPE_OPTIONS: IssueType[] = ["bug", "task", "improvement", "chore"]
const PRIORITY_OPTIONS: IssuePriority[] = ["critical", "high", "medium", "low"]

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—"
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
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

// ── Inline-editable field components ─────────────────────────────

function InlineSelect<T extends string>({
  value,
  options,
  onSave,
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
          {opt}
        </option>
      ))}
    </select>
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

export function IssuesDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { data: issue, isLoading, error } = useIssue(slug ?? "")
  const { mutate: deleteIssue, isPending: isDeleting } = useDeleteIssue()
  const { mutate: saveIssue } = useSaveIssue(slug ?? "")
  const { data: artifacts } = useIssueArtifacts(slug ?? "")
  const { data: statusData } = useStatus()
  const teamMembers = statusData?.team?.map((t) => t.name) ?? []
  const uploadMutation = useUploadIssueArtifact(slug ?? "")
  const createArtifactMutation = useCreateIssueArtifact(slug ?? "")
  const deleteArtifactMutation = useDeleteIssueArtifact(slug ?? "")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Add-file dropdown state
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const addBtnRef = useRef<HTMLButtonElement>(null)
  const addMenuRef = useRef<HTMLDivElement>(null)
  const [addMenuPos, setAddMenuPos] = useState<{ top: number; left: number } | null>(null)

  // Create file modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newFilename, setNewFilename] = useState("")
  const [createError, setCreateError] = useState("")
  const createInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files) return
    for (let i = 0; i < files.length; i++) {
      uploadMutation.mutate(files[i])
    }
  }, [uploadMutation])

  useEffect(() => {
    if (!addMenuOpen || !addBtnRef.current) return
    const rect = addBtnRef.current.getBoundingClientRect()
    setAddMenuPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.right + window.scrollX,
    })
  }, [addMenuOpen])

  useEffect(() => {
    if (!addMenuOpen) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (addBtnRef.current?.contains(target)) return
      if (addMenuRef.current?.contains(target)) return
      setAddMenuOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [addMenuOpen])

  useEffect(() => {
    if (createModalOpen) {
      setTimeout(() => createInputRef.current?.focus(), 0)
    }
  }, [createModalOpen])

  function handleCreateFile() {
    const filename = newFilename.trim()
    if (!filename) {
      setCreateError("Filename is required")
      return
    }
    if (filename === "ISSUE.md") {
      setCreateError("Cannot use reserved name ISSUE.md")
      return
    }
    setCreateError("")
    createArtifactMutation.mutate(filename, {
      onSuccess: () => {
        setCreateModalOpen(false)
        setNewFilename("")
        navigate(`/issues/${slug}/artifacts/${encodeURIComponent(filename)}?edit`)
      },
      onError: (err) => {
        setCreateError(err.message)
      },
    })
  }

  if (isLoading) {
    return <div style={{ color: "var(--foreground-muted)", padding: "40px", textAlign: "center" }}>Loading...</div>
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

  const body = issue.body.trimStart().replace(/^#\s+.+\n?/, "").trimStart()

  return (
    <>
      <Link to="/issues" className="docs-back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Issues
      </Link>

      <div className="feature-detail">
        {/* ── Content area ──────────────────────────────────── */}
        <div className="feature-detail-content">
          <div className="feature-detail-header">
            <h1 className="feature-detail-title">{issue.title}</h1>
            <div className="feature-detail-actions">
              <Link to={`/issues/${slug}/edit`} className="btn btn-outline btn-sm">
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
                  if (confirm(`Delete "${issue.title}"? This will remove the issue directory and all artifacts. This cannot be undone.`)) {
                    deleteIssue(slug ?? "")
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
              value={issue.status}
              options={STATUS_OPTIONS}
              onSave={(v) => saveIssue({ status: v })}
            />
          </div>

          <div className="feature-meta-field">
            <span className="feature-meta-label">Type</span>
            <div className="feature-meta-value">
              <InlineSelect
                value={issue.type}
                options={TYPE_OPTIONS}
                onSave={(v) => saveIssue({ type: v })}
              />
            </div>
          </div>

          <div className="feature-meta-field">
            <span className="feature-meta-label">Priority</span>
            <div className="feature-meta-value">
              <InlineSelect
                value={issue.priority}
                options={PRIORITY_OPTIONS}
                onSave={(v) => saveIssue({ priority: v })}
              />
            </div>
          </div>

          <div className="feature-meta-field">
            <span className="feature-meta-label">Assignees</span>
            <div className="feature-meta-value">
              <AssigneePicker
                value={issue.assignees}
                teamMembers={teamMembers}
                onChange={(v) => saveIssue({ assignees: v })}
              />
            </div>
          </div>

          <div className="feature-meta-field">
            <span className="feature-meta-label">Points</span>
            <div className="feature-meta-value">
              <InlineNumber
                value={issue.points}
                placeholder="—"
                onSave={(v) => saveIssue({ points: v })}
              />
            </div>
          </div>

          <div className="feature-meta-field">
            <span className="feature-meta-label">Sprint</span>
            <div className="feature-meta-value feature-meta-readonly">
              {issue.sprint ?? <span className="text-muted">None</span>}
            </div>
          </div>

          <div className="feature-meta-field">
            <span className="feature-meta-label">Feature</span>
            <div className="feature-meta-value" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <FeaturePicker
                value={issue.feature}
                onChange={(slug) => saveIssue({ feature: slug })}
                mode="inline"
              />
              {issue.feature && (
                <Link
                  to={`/features/${issue.feature}`}
                  style={{ color: "var(--accent)", display: "flex", alignItems: "center", flexShrink: 0 }}
                  title={`Go to feature: ${issue.feature}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </Link>
              )}
            </div>
          </div>

          {issue.labels.length > 0 && (
            <div className="feature-meta-field">
              <span className="feature-meta-label">Labels</span>
              <div className="feature-meta-tags">
                {issue.labels.map((l) => (
                  <span key={l} className="badge badge-label">{l}</span>
                ))}
              </div>
            </div>
          )}

          <div className="feature-meta-divider" />

          <div className="feature-meta-field">
            <span className="feature-meta-label">Created</span>
            <div className="feature-meta-value feature-meta-readonly">
              {formatDate(issue.created)}
            </div>
          </div>

          <div className="feature-meta-field">
            <span className="feature-meta-label">Modified</span>
            <div className="feature-meta-value feature-meta-readonly">
              {formatDate(issue.modified)}
            </div>
          </div>
        </aside>

        {/* ── Supporting files (own box) ────────────────────── */}
        <div className="feature-sidebar-files-card">
          <div className="feature-sidebar-files-header">
            <h3 className="feature-meta-heading">Supporting Files</h3>
            <button
              ref={addBtnRef}
              className="btn btn-sm btn-outline"
              onClick={() => setAddMenuOpen((v) => !v)}
              disabled={uploadMutation.isPending}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "2px" }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={(e) => { handleFileUpload(e.target.files); setAddMenuOpen(false) }}
            />
            {addMenuOpen && addMenuPos && createPortal(
              <div
                ref={addMenuRef}
                className="files-add-dropdown"
                style={{
                  position: "absolute",
                  top: addMenuPos.top,
                  left: addMenuPos.left,
                }}
              >
                <button
                  className="files-add-option"
                  onClick={() => {
                    setAddMenuOpen(false)
                    fileInputRef.current?.click()
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload File
                </button>
                <button
                  className="files-add-option"
                  onClick={() => {
                    setAddMenuOpen(false)
                    setCreateModalOpen(true)
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                  Create File
                </button>
              </div>,
              document.body,
            )}
          </div>

          {artifacts && artifacts.length > 0 ? (
            <div className="feature-sidebar-files-list">
              {artifacts.map((a) => (
                <div key={a.name} className="feature-sidebar-file-row">
                  <Link
                    to={`/issues/${slug}/artifacts/${encodeURIComponent(a.name)}`}
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

      {/* ── Create File modal ── */}
      {createModalOpen && createPortal(
        <div className="create-file-backdrop" onClick={() => { setCreateModalOpen(false); setNewFilename(""); setCreateError("") }}>
          <div className="create-file-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="create-file-title">Create New File</h3>
            <label className="create-file-label">Filename</label>
            <input
              ref={createInputRef}
              className="create-file-input"
              type="text"
              value={newFilename}
              placeholder="notes.md"
              onChange={(e) => { setNewFilename(e.target.value); setCreateError("") }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFile()
                if (e.key === "Escape") { setCreateModalOpen(false); setNewFilename(""); setCreateError("") }
              }}
            />
            {createError && <p className="create-file-error">{createError}</p>}
            <div className="create-file-actions">
              <button
                className="btn btn-sm btn-outline"
                onClick={() => { setCreateModalOpen(false); setNewFilename(""); setCreateError("") }}
              >
                Cancel
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={handleCreateFile}
                disabled={createArtifactMutation.isPending}
              >
                {createArtifactMutation.isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
