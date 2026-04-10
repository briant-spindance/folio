import { useParams, useNavigate } from 'react-router-dom'
import { Header } from '@/components/layout/header'
import { MarkdownEditor } from '@/components/markdown/editor'
import { mockFeatures } from '@/lib/mock-data'
import { useState } from 'react'
import type { WorkflowState } from '@/types'

const workflowStates: WorkflowState[] = ['draft', 'ready', 'in-progress', 'review', 'done']

export default function FeatureEditorPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const isEditing = slug != null

  const existing = isEditing ? mockFeatures.find((f) => f.slug === slug) : null

  const [name, setName] = useState(existing?.name ?? '')
  const [status, setStatus] = useState<WorkflowState>(existing?.status ?? 'draft')
  const [assignee, setAssignee] = useState(existing?.assignee ?? '')
  const [points, setPoints] = useState<string>(
    existing?.points != null ? String(existing.points) : ''
  )
  const [body, setBody] = useState(existing?.body ?? '')

  function handleSave() {
    // In a real app this would POST/PUT to the API
    if (isEditing) {
      navigate(`/features/${slug}`)
    } else {
      navigate('/features')
    }
  }

  function handleCancel() {
    if (isEditing) {
      navigate(`/features/${slug}`)
    } else {
      navigate('/features')
    }
  }

  if (isEditing && !existing) {
    return (
      <>
        <Header />
        <div className="p-6 max-w-[1200px] mx-auto">
          <p className="text-foreground-muted">Feature not found.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="p-6 max-w-[1200px] mx-auto">
        <h1 className="mb-6 text-2xl font-bold text-foreground">
          {isEditing ? 'Edit Feature' : 'New Feature'}
        </h1>

        <div className="space-y-5">
          {/* Name — only on create */}
          {!isEditing && (
            <div>
              <label
                htmlFor="feature-name"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Name
              </label>
              <input
                id="feature-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Feature name"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle outline-none focus:border-primary transition-colors"
              />
            </div>
          )}

          {/* Status */}
          <div>
            <label
              htmlFor="feature-status"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Status
            </label>
            <select
              id="feature-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as WorkflowState)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors"
            >
              {workflowStates.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label
              htmlFor="feature-assignee"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Assignee
            </label>
            <input
              id="feature-assignee"
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Unassigned"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Points */}
          <div>
            <label
              htmlFor="feature-points"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Points
            </label>
            <input
              id="feature-points"
              type="number"
              min={0}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="—"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Body */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Body</label>
            <MarkdownEditor value={body} onChange={setBody} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              {isEditing ? 'Save Changes' : 'Create Feature'}
            </button>
            <button
              onClick={handleCancel}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
