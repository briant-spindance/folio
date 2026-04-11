import { useParams } from 'react-router-dom'
import { useFeature } from '@/hooks/useData'
import { StatusBadge } from '@/components/StatusBadge'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { User, Tag, Zap, Calendar } from 'lucide-react'

export function FeatureDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { data, isLoading, error } = useFeature(slug ?? '')

  if (isLoading) {
    return <div className="text-[var(--foreground-muted)] text-sm">Loading…</div>
  }
  if (error || !data) {
    return <div className="text-[var(--status-error)] text-sm">Feature not found.</div>
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Features', to: '/features' },
          { label: data.title },
        ]}
      />

      <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--card-radius)] p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-xl font-semibold text-[var(--foreground)] leading-tight">{data.title}</h1>
          <StatusBadge status={data.status} />
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-4 text-[0.75rem] text-[var(--foreground-muted)] mb-6 pb-4 border-b border-[var(--border)]">
          {data.assignee && (
            <span className="flex items-center gap-1">
              <User size={13} />
              {data.assignee}
            </span>
          )}
          {data.points != null && (
            <span className="flex items-center gap-1">
              <Zap size={13} />
              {data.points} pts
            </span>
          )}
          <span className="flex items-center gap-1 capitalize">
            Priority: {data.priority}
          </span>
          {data.sprint && (
            <span className="flex items-center gap-1">
              <Calendar size={13} />
              {data.sprint}
            </span>
          )}
          {data.tags && data.tags.length > 0 && (
            <span className="flex items-center gap-1">
              <Tag size={13} />
              {data.tags.join(', ')}
            </span>
          )}
        </div>

        {/* Body */}
        <div
          className="prose prose-sm max-w-none text-[var(--foreground)] text-[0.875rem] leading-relaxed"
          dangerouslySetInnerHTML={{ __html: data.body }}
        />
      </div>
    </>
  )
}
