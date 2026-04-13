import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AppShell } from "@/components/AppShell"

// ── Lazy-loaded page components (route-level code splitting) ─────
const Dashboard = lazy(() => import("@/pages/Dashboard").then(m => ({ default: m.Dashboard })))
const DocsList = lazy(() => import("@/pages/DocsList").then(m => ({ default: m.DocsList })))
const DocsDetail = lazy(() => import("@/pages/DocsDetail").then(m => ({ default: m.DocsDetail })))
const RoadmapPage = lazy(() => import("@/pages/Roadmap").then(m => ({ default: m.RoadmapPage })))
const FeaturesList = lazy(() => import("@/pages/FeaturesList").then(m => ({ default: m.FeaturesList })))
const FeaturesDetail = lazy(() => import("@/pages/FeaturesDetail").then(m => ({ default: m.FeaturesDetail })))
const FeaturesEdit = lazy(() => import("@/pages/FeaturesEdit").then(m => ({ default: m.FeaturesEdit })))
const FeaturesNew = lazy(() => import("@/pages/FeaturesNew").then(m => ({ default: m.FeaturesNew })))
const ArtifactView = lazy(() => import("@/pages/ArtifactView").then(m => ({ default: m.ArtifactView })))
const IssuesList = lazy(() => import("@/pages/IssuesList").then(m => ({ default: m.IssuesList })))
const IssuesDetail = lazy(() => import("@/pages/IssuesDetail").then(m => ({ default: m.IssuesDetail })))
const IssuesEdit = lazy(() => import("@/pages/IssuesEdit").then(m => ({ default: m.IssuesEdit })))
const IssuesNew = lazy(() => import("@/pages/IssuesNew").then(m => ({ default: m.IssuesNew })))
const IssueArtifactView = lazy(() => import("@/pages/IssueArtifactView").then(m => ({ default: m.IssueArtifactView })))
const StubPage = lazy(() => import("@/pages/StubPage").then(m => ({ default: m.StubPage })))
const HelpIndex = lazy(() => import("@/pages/HelpIndex").then(m => ({ default: m.HelpIndex })))
const HelpArticle = lazy(() => import("@/pages/HelpArticle").then(m => ({ default: m.HelpArticle })))

const queryClient = new QueryClient()

function PageLoader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0", opacity: 0.5 }}>
      Loading…
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/docs" element={<DocsList />} />
              <Route path="/docs/:slug" element={<DocsDetail />} />
              <Route path="/roadmap" element={<RoadmapPage />} />
              <Route path="/features" element={<FeaturesList />} />
              <Route path="/features/new" element={<FeaturesNew />} />
              <Route path="/features/:slug/edit" element={<FeaturesEdit />} />
              <Route path="/features/:slug/artifacts/:filename" element={<ArtifactView />} />
              <Route path="/features/:slug" element={<FeaturesDetail />} />
              <Route path="/issues" element={<IssuesList />} />
              <Route path="/issues/new" element={<IssuesNew />} />
              <Route path="/issues/:slug/edit" element={<IssuesEdit />} />
              <Route path="/issues/:slug/artifacts/:filename" element={<IssueArtifactView />} />
              <Route path="/issues/:slug" element={<IssuesDetail />} />
              <Route path="/sprints" element={<StubPage title="Sprints" />} />
              <Route path="/wiki" element={<StubPage title="Wiki" />} />
              <Route path="/review" element={<StubPage title="Review Tools" />} />
              <Route path="/configuration" element={<StubPage title="Configuration" />} />
              <Route path="/help" element={<HelpIndex />} />
              <Route path="/help/:slug" element={<HelpArticle />} />
            </Routes>
          </Suspense>
        </AppShell>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
