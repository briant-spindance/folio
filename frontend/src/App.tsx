import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AppShell } from "@/components/AppShell"
import { Dashboard } from "@/pages/Dashboard"
import { DocsList } from "@/pages/DocsList"
import { DocsNew } from "@/pages/DocsNew"
import { DocsDetail } from "@/pages/DocsDetail"
import { DocsEdit } from "@/pages/DocsEdit"
import { RoadmapPage } from "@/pages/Roadmap"
import { FeaturesList } from "@/pages/FeaturesList"
import { FeaturesDetail } from "@/pages/FeaturesDetail"
import { FeaturesEdit } from "@/pages/FeaturesEdit"
import { FeaturesNew } from "@/pages/FeaturesNew"
import { ArtifactView } from "@/pages/ArtifactView"
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
            <Route path="/features" element={<FeaturesList />} />
            <Route path="/features/new" element={<FeaturesNew />} />
            <Route path="/features/:slug/edit" element={<FeaturesEdit />} />
            <Route path="/features/:slug/artifacts/:filename" element={<ArtifactView />} />
            <Route path="/features/:slug" element={<FeaturesDetail />} />
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
