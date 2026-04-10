import { useParams } from 'react-router-dom'
import { Header } from '@/components/layout/header'
import { MarkdownRenderer } from '@/components/markdown/renderer'
import { mockReviews } from '@/lib/mock-data'

export default function ReviewDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const review = mockReviews.find((r) => r.slug === slug)

  if (!review) {
    return (
      <>
        <Header />
        <div className="p-6 max-w-[1200px] mx-auto">
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface py-16">
            <p className="text-sm font-medium text-foreground">Not Found</p>
            <p className="text-sm text-foreground-muted mt-1">
              The review you're looking for doesn't exist.
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="p-6 max-w-[1200px] mx-auto">
        <div className="rounded-lg border border-border bg-surface-raised p-6">
          <MarkdownRenderer content={review.body} />
        </div>
      </div>
    </>
  )
}
