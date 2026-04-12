import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AppShell } from "@/components/AppShell"
import { Dashboard } from "@/pages/Dashboard"
import { DocsList } from "@/pages/DocsList"
import { DocsNew } from "@/pages/DocsNew"
import { DocsDetail } from "@/pages/DocsDetail"
import { DocsEdit } from "@/pages/DocsEdit"
import { RoadmapPage } from "@/pages/Roadmap"
import { StubPage } from "@/pages/StubPage"

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/docs" element={<DocsList />} />
            <Route path="/docs/new" element={<DocsNew />} />
            <Route path="/docs/:slug/edit" element={<DocsEdit />} />
            <Route path="/docs/:slug" element={<DocsDetail />} />
            <Route path="/roadmap" element={<RoadmapPage />} />
            <Route path="/features" element={<StubPage title="Features" />} />
            <Route path="/sprints" element={<StubPage title="Sprints" />} />
            <Route path="/issues" element={<StubPage title="Issues" />} />
            <Route path="/wiki" element={<StubPage title="Wiki" />} />
            <Route path="/review" element={<StubPage title="Review Tools" />} />
            <Route path="/configuration" element={<StubPage title="Configuration" />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
