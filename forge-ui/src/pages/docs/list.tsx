import { Link } from 'react-router-dom'
import { Header } from '@/components/layout/header'
import { mockDocs } from '@/lib/mock-data'
import { Plus, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function DocsList() {
  return (
    <>
      <Header
        action={
          <Link
            to="/docs/new"
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New Document
          </Link>
        }
      />

      <div className="p-6 max-w-[1200px] mx-auto">
        {mockDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface py-16">
            <FileText className="h-10 w-10 text-foreground-muted mb-3" />
            <p className="text-sm font-medium text-foreground">No documents yet</p>
            <p className="text-sm text-foreground-muted mt-1">
              Create your first document to get started.
            </p>
            <Link
              to="/docs/new"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors mt-4"
            >
              New Document
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-surface overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-raised">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
                    Last Modified
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockDocs.map((doc) => (
                  <tr
                    key={doc.slug}
                    className="border-b border-border last:border-b-0 hover:bg-surface-raised/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/docs/${doc.slug}`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                      >
                        <FileText className="h-4 w-4 text-foreground-muted" />
                        {doc.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-muted">
                      {formatDate(doc.modifiedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
