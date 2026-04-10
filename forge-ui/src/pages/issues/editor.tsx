import { useParams, useNavigate } from 'react-router-dom'
import { Header } from '@/components/layout/header'
import { MarkdownEditor } from '@/components/markdown/editor'
import { mockIssues, mockFeatures } from '@/lib/mock-data'
import { useState } from 'react'

export default function IssueEditorPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const isEditing = Boolean(slug)
  const existingIssue = isEditing ? mockIssues.find((i) => i.slug === slug) : null

  const [name, setName] = useState(existingIssue?.name ?? '')
  const [status, setStatus] = useState<'open' | 'closed'>(existingIssue?.status ?? 'open')
  const [assignee, setAssignee] = useState(existingIssue?.assignee ?? '')
  const [labels, setLabels] = useState(existingIssue?.labels.join(', ') ?? '')
  const [linkedFeature, setLinkedFeature] = useState(existingIssue?.linkedFeature ?? '')
  const [body, setBody] = useState(existingIssue?.body ?? '')

  const handleSave = () => {
    navigate(isEditing ? `/issues/${slug}` : '/issues')
  }

  const handleCancel = () => {
    navigate(isEditing ? `/issues/${slug}` : '/issues')
  }

  return (
    <>
      <Header />

      <div className="p-6 max-w-[1200px] mx-auto">
        <div className="flex flex-col gap-5">
          {/* Name (create only) */}
          {!isEditing && (
            <div>
              <label htmlFor="issue-name" className="block text-sm font-medium text-foreground mb-1">
                Name
              </label>
              <input
                id="issue-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Login Timeout on Slow Connections"
                className="rounded-md border border-border bg-surface-inset px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary transition-colors w-full"
              />
            </div>
          )}

          {/* Status */}
          <div>
            <label htmlFor="issue-status" className="block text-sm font-medium text-foreground mb-1">
              Status
            </label>
            <select
              id="issue-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'open' | 'closed')}
              className="rounded-md border border-border bg-surface-inset px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary transition-colors w-full"
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label htmlFor="issue-assignee" className="block text-sm font-medium text-foreground mb-1">
              Assignee
            </label>
            <input
              id="issue-assignee"
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="e.g. Alice"
              className="rounded-md border border-border bg-surface-inset px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary transition-colors w-full"
            />
          </div>

          {/* Labels */}
          <div>
            <label htmlFor="issue-labels" className="block text-sm font-medium text-foreground mb-1">
              Labels
            </label>
            <input
              id="issue-labels"
              type="text"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              placeholder="bug, security, ui (comma-separated)"
              className="rounded-md border border-border bg-surface-inset px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary transition-colors w-full"
            />
          </div>

          {/* Linked Feature */}
          <div>
            <label htmlFor="issue-feature" className="block text-sm font-medium text-foreground mb-1">
              Linked Feature
            </label>
            <select
              id="issue-feature"
              value={linkedFeature}
              onChange={(e) => setLinkedFeature(e.target.value)}
              className="rounded-md border border-border bg-surface-inset px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary transition-colors w-full"
            >
              <option value="">None</option>
              {mockFeatures.map((f) => (
                <option key={f.slug} value={f.slug}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <MarkdownEditor value={body} onChange={setBody} />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={handleCancel}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              {isEditing ? 'Save Changes' : 'Create Issue'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
