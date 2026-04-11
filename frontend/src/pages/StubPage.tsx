import { Breadcrumbs } from '@/components/Breadcrumbs'

interface StubPageProps {
  title: string
}

export function StubPage({ title }: StubPageProps) {
  return (
    <>
      <Breadcrumbs items={[{ label: title }]} />
      <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--card-radius)] p-12 flex flex-col items-center justify-center text-center gap-3">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
        <p className="text-[0.875rem] text-[var(--foreground-muted)] max-w-sm">
          This page hasn't been designed yet.
        </p>
      </div>
    </>
  )
}
