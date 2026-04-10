import { useParams, useNavigate } from 'react-router-dom'
import { Header } from '@/components/layout/header'
import { MarkdownEditor } from '@/components/markdown/editor'
import { mockSprints } from '@/lib/mock-data'
import { useState } from 'react'

export default function SprintEditor() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const isEditing = Boolean(slug)
  const existingSprint = isEditing ? mockSprints.find((s) => s.slug === slug) : null

  const [name, setName] = useState(existingSprint?.name ?? '')
  const [startDate, setStartDate] = useState(existingSprint?.startDate ?? '')
  const [endDate, setEndDate] = useState(existingSprint?.endDate ?? '')
  const [goal, setGoal] = useState(existingSprint?.goal ?? '')
  const [capacity, setCapacity] = useState<string>(
    existingSprint?.capacity != null ? String(existingSprint.capacity) : ''
  )
  const [body, setBody] = useState(existingSprint?.body ?? '')

  const handleSave = () => {
    navigate(isEditing ? `/sprints/${slug}` : '/sprints')
  }

  const handleCancel = () => {
    navigate(isEditing ? `/sprints/${slug}` : '/sprints')
  }

  return (
    <>
      <Header />

      <div className="p-6 max-w-[1200px] mx-auto">
        <div className="flex flex-col gap-5">
          {/* Name — only on create */}
          {!isEditing && (
            <div>
              <label htmlFor="sprint-name" className="block text-sm font-medium text-foreground mb-1">
                Name
              </label>
              <input
                id="sprint-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sprint 5"
                className="rounded-md border border-border bg-surface-inset px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary transition-colors w-full"
              />
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sprint-start" className="block text-sm font-medium text-foreground mb-1">
                Start Date
              </label>
              <input
                id="sprint-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-md border border-border bg-surface-inset px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary transition-colors w-full"
              />
            </div>
            <div>
              <label htmlFor="sprint-end" className="block text-sm font-medium text-foreground mb-1">
                End Date
              </label>
              <input
                id="sprint-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-md border border-border bg-surface-inset px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary transition-colors w-full"
              />
            </div>
          </div>

          {/* Goal */}
          <div>
            <label htmlFor="sprint-goal" className="block text-sm font-medium text-foreground mb-1">
              Goal
            </label>
            <textarea
              id="sprint-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={3}
              placeholder="What should this sprint accomplish?"
              className="rounded-md border border-border bg-surface-inset px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary transition-colors w-full resize-y"
            />
          </div>

          {/* Capacity */}
          <div>
            <label htmlFor="sprint-capacity" className="block text-sm font-medium text-foreground mb-1">
              Capacity
            </label>
            <input
              id="sprint-capacity"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="e.g. 40"
              className="rounded-md border border-border bg-surface-inset px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary transition-colors w-full max-w-[200px]"
            />
            <p className="text-xs text-foreground-subtle mt-1">
              Total story points the team can commit to this sprint.
            </p>
          </div>

          {/* Body / Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Notes
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
              {isEditing ? 'Save Changes' : 'Create Sprint'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
