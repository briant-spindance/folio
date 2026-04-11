import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Dashboard } from '@/pages/Dashboard'
import { FeaturesList } from '@/pages/FeaturesList'
import { FeatureDetail } from '@/pages/FeatureDetail'
import { DocsList } from '@/pages/DocsList'
import { DocsDetail } from '@/pages/DocsDetail'
import { StubPage } from '@/pages/StubPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="features" element={<FeaturesList />} />
            <Route path="features/:slug" element={<FeatureDetail />} />
            <Route path="docs" element={<DocsList />} />
            <Route path="docs/:slug" element={<DocsDetail />} />
            <Route path="sprints" element={<StubPage title="Sprints" />} />
            <Route path="issues" element={<StubPage title="Issues" />} />
            <Route path="wiki" element={<StubPage title="Wiki" />} />
            <Route path="review-tools" element={<StubPage title="Review Tools" />} />
            <Route path="configuration" element={<StubPage title="Configuration" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
