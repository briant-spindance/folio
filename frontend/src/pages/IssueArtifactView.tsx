import { useState, useCallback, useEffect } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import CodeMirror from "@uiw/react-codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { json as jsonLang } from "@codemirror/lang-json"
import { markdown as markdownLang } from "@codemirror/lang-markdown"
import { yaml as yamlLang } from "@codemirror/lang-yaml"
import { css as cssLang } from "@codemirror/lang-css"
import { html as htmlLang } from "@codemirror/lang-html"
import { python } from "@codemirror/lang-python"
import { sql } from "@codemirror/lang-sql"
import {
  useIssue,
  useIssueArtifactContent,
  useSaveIssueArtifact,
  useDeleteIssueArtifact,
} from "@/hooks/useData"
import { getIssueArtifactRawUrl } from "@/lib/api"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileExtension(name: string): string {
  const i = name.lastIndexOf(".")
  return i >= 0 ? name.slice(i).toLowerCase() : ""
}

type ArtifactCategory = "markdown" | "code" | "image" | "binary"

function categorize(type: string, name: string): ArtifactCategory {
  if (type === "markdown") return "markdown"
  if (type === "image") return "image"
  if (type === "text" || type === "data") return "code"
  const ext = getFileExtension(name)
  const codeExts = new Set([
    ".js", ".ts", ".tsx", ".jsx", ".html", ".css",
    ".sh", ".py", ".rb", ".go", ".rs", ".sql",
    ".graphql", ".env", ".toml", ".ini", ".conf", ".log",
    ".xml",
  ])
  if (codeExts.has(ext)) return "code"
  return "binary"
}

function getCodeMirrorExtensions(name: string) {
  const ext = getFileExtension(name)
  switch (ext) {
    case ".js":
    case ".jsx":
      return [javascript({ jsx: true })]
    case ".ts":
    case ".tsx":
      return [javascript({ jsx: true, typescript: true })]
    case ".json":
      return [jsonLang()]
    case ".md":
      return [markdownLang()]
    case ".yaml":
    case ".yml":
      return [yamlLang()]
    case ".css":
      return [cssLang()]
    case ".html":
    case ".xml":
    case ".svg":
      return [htmlLang()]
    case ".py":
      return [python()]
    case ".sql":
      return [sql()]
    default:
      return []
  }
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ArtifactBreadcrumbs({ slug, issueTitle, filename }: { slug: string; issueTitle?: string; filename: string }) {
  return (
    <nav className="artifact-breadcrumbs">
      <Link to="/issues" className="artifact-breadcrumb-link">Issues</Link>
      <span className="artifact-breadcrumb-sep">&lsaquo;</span>
      <Link to={`/issues/${slug}`} className="artifact-breadcrumb-link">{issueTitle ?? slug}</Link>
      <span className="artifact-breadcrumb-sep">&lsaquo;</span>
      <span className="artifact-breadcrumb-current">{filename}</span>
    </nav>
  )
}

function MarkdownViewer({ content }: { content: string }) {
  return (
    <div className="doc-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: headingRenderer(2),
          h3: headingRenderer(3),
          h4: headingRenderer(4),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function CodeViewer({ content, filename }: { content: string; filename: string }) {
  return (
    <div className="artifact-code-view">
      <CodeMirror
        value={content}
        extensions={getCodeMirrorExtensions(filename)}
        editable={false}
        theme="light"
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: false,
        }}
      />
    </div>
  )
}

function ImageViewer({ slug, filename }: { slug: string; filename: string }) {
  const rawUrl = getIssueArtifactRawUrl(slug, filename)
  return (
    <div className="artifact-image-view">
      <img src={rawUrl} alt={filename} />
    </div>
  )
}

function BinaryViewer({ slug, filename, size }: { slug: string; filename: string; size: number }) {
  const rawUrl = getIssueArtifactRawUrl(slug, filename)
  return (
    <div className="artifact-binary-view">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--foreground-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <p className="artifact-binary-name">{filename}</p>
      <p className="artifact-binary-size">{formatFileSize(size)}</p>
      <a href={rawUrl} download={filename} className="btn btn-primary btn-sm">
        Download
      </a>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function IssueArtifactView() {
  const { slug, filename } = useParams<{ slug: string; filename: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: issue } = useIssue(slug ?? "")
  const { data: artifact, isLoading, error } = useIssueArtifactContent(slug ?? "", filename ?? "")
  const saveMutation = useSaveIssueArtifact(slug ?? "", filename ?? "")
  const deleteMutation = useDeleteIssueArtifact(slug ?? "")

  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const category = artifact ? categorize(artifact.type, artifact.name) : null
  const isEditable = category === "markdown" || category === "code"

  useEffect(() => {
    if (searchParams.has("edit") && artifact && isEditable && !editing) {
      setEditContent(artifact.content)
      setEditing(true)
      searchParams.delete("edit")
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams, artifact, isEditable, editing])

  const handleEdit = useCallback(() => {
    if (artifact) {
      setEditContent(artifact.content)
      setEditing(true)
    }
  }, [artifact])

  const handleCancel = useCallback(() => {
    setEditing(false)
    setEditContent("")
  }, [])

  const handleSave = useCallback(() => {
    saveMutation.mutate(editContent, {
      onSuccess: () => {
        setEditing(false)
        setEditContent("")
      },
    })
  }, [saveMutation, editContent])

  const handleDelete = useCallback(() => {
    if (filename) {
      deleteMutation.mutate(filename)
    }
  }, [deleteMutation, filename])

  if (isLoading) {
    return (
      <div style={{ color: "var(--foreground-muted)", padding: "40px", textAlign: "center" }}>
        Loading...
      </div>
    )
  }

  // For image/binary files, the fetch returns an error since they're not JSON.
  if (error && filename) {
    const ext = getFileExtension(filename)
    const imageExts = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"])
    if (imageExts.has(ext)) {
      return (
        <div>
          <ArtifactBreadcrumbs slug={slug ?? ""} issueTitle={issue?.title} filename={filename} />
          <div className="card">
            <div className="artifact-view-header">
              <div className="artifact-view-title-row">
                <h1 className="artifact-view-filename">{filename}</h1>
                <div className="artifact-view-actions">
                  <a
                    href={getIssueArtifactRawUrl(slug ?? "", filename)}
                    download={filename}
                    className="btn btn-sm btn-outline"
                  >
                    Download
                  </a>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
            <div className="artifact-view-body">
              <ImageViewer slug={slug ?? ""} filename={filename} />
            </div>
            {showDeleteConfirm && (
              <div className="artifact-delete-confirm">
                <p>Delete <strong>{filename}</strong>? This cannot be undone.</p>
                <div className="artifact-delete-confirm-actions">
                  <button className="btn btn-sm btn-outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                  <button className="btn btn-sm btn-danger" onClick={handleDelete}>Delete</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div>
        <ArtifactBreadcrumbs slug={slug ?? ""} issueTitle={issue?.title} filename={filename} />
        <div className="card">
          <div className="artifact-view-header">
            <div className="artifact-view-title-row">
              <h1 className="artifact-view-filename">{filename}</h1>
              <div className="artifact-view-actions">
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
          <div className="artifact-view-body">
            <BinaryViewer slug={slug ?? ""} filename={filename} size={0} />
          </div>
          {showDeleteConfirm && (
            <div className="artifact-delete-confirm">
              <p>Delete <strong>{filename}</strong>? This cannot be undone.</p>
              <div className="artifact-delete-confirm-actions">
                <button className="btn btn-sm btn-outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                <button className="btn btn-sm btn-danger" onClick={handleDelete}>Delete</button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!artifact) {
    return (
      <div>
        <ArtifactBreadcrumbs slug={slug ?? ""} issueTitle={issue?.title} filename={filename ?? "Unknown"} />
        <div className="card" style={{ padding: "40px", textAlign: "center" }}>
          <p style={{ color: "var(--status-error)" }}>Artifact not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ArtifactBreadcrumbs slug={slug ?? ""} issueTitle={issue?.title} filename={artifact.name} />

      <div className="card">
        <div className="artifact-view-header">
          <div className="artifact-view-title-row">
            <h1 className="artifact-view-filename">{artifact.name}</h1>
            <div className="artifact-view-meta">
              <span className="artifact-view-size">{formatFileSize(artifact.size)}</span>
              <span className="artifact-view-type">{artifact.type}</span>
            </div>
            <div className="artifact-view-actions">
              {isEditable && !editing && (
                <button className="btn btn-sm btn-primary" onClick={handleEdit}>
                  Edit
                </button>
              )}
              {editing && (
                <>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={handleCancel}
                    disabled={saveMutation.isPending}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? "Saving..." : "Save"}
                  </button>
                </>
              )}
              <a
                href={getIssueArtifactRawUrl(slug ?? "", artifact.name)}
                download={artifact.name}
                className="btn btn-sm btn-outline"
              >
                Download
              </a>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        <div className="artifact-view-body">
          {editing ? (
            <div className="artifact-editor-wrap">
              <CodeMirror
                value={editContent}
                onChange={setEditContent}
                extensions={getCodeMirrorExtensions(artifact.name)}
                theme="light"
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  highlightActiveLine: true,
                }}
                minHeight="400px"
              />
            </div>
          ) : (
            <>
              {category === "markdown" && (
                <MarkdownViewer content={artifact.content} />
              )}
              {category === "code" && (
                <CodeViewer content={artifact.content} filename={artifact.name} />
              )}
              {category === "image" && (
                <ImageViewer slug={slug ?? ""} filename={artifact.name} />
              )}
              {category === "binary" && (
                <BinaryViewer
                  slug={slug ?? ""}
                  filename={artifact.name}
                  size={artifact.size}
                />
              )}
            </>
          )}
        </div>

        {showDeleteConfirm && (
          <div className="artifact-delete-confirm">
            <p>Delete <strong>{artifact.name}</strong>? This cannot be undone.</p>
            <div className="artifact-delete-confirm-actions">
              <button className="btn btn-sm btn-outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-sm btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
