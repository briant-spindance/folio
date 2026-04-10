import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from '@/components/layout/sidebar'
import { ChatPanel } from '@/components/layout/chat-panel'
import Dashboard from '@/pages/dashboard'
import DocsList from '@/pages/docs/list'
import DocsDetail from '@/pages/docs/detail'
import DocsEditor from '@/pages/docs/editor'
import FeaturesList from '@/pages/features/list'
import FeaturesDetail from '@/pages/features/detail'
import FeaturesEditor from '@/pages/features/editor'
import FeaturesBacklog from '@/pages/features/backlog'
import SprintsList from '@/pages/sprints/list'
import SprintsBoard from '@/pages/sprints/board'
import SprintsPlanning from '@/pages/sprints/planning'
import SprintsEditor from '@/pages/sprints/editor'
import IssuesList from '@/pages/issues/list'
import IssuesDetail from '@/pages/issues/detail'
import IssuesEditor from '@/pages/issues/editor'
import ReviewsList from '@/pages/reviews/list'
import ReviewsDetail from '@/pages/reviews/detail'
import ReviewsHealth from '@/pages/reviews/health'
import Config from '@/pages/config'

export function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />

            <Route path="/docs" element={<DocsList />} />
            <Route path="/docs/new" element={<DocsEditor />} />
            <Route path="/docs/:slug" element={<DocsDetail />} />
            <Route path="/docs/:slug/edit" element={<DocsEditor />} />

            <Route path="/features" element={<FeaturesList />} />
            <Route path="/features/new" element={<FeaturesEditor />} />
            <Route path="/features/backlog" element={<FeaturesBacklog />} />
            <Route path="/features/:slug" element={<FeaturesDetail />} />
            <Route path="/features/:slug/edit" element={<FeaturesEditor />} />

            <Route path="/sprints" element={<SprintsList />} />
            <Route path="/sprints/new" element={<SprintsEditor />} />
            <Route path="/sprints/:slug" element={<SprintsBoard />} />
            <Route path="/sprints/:slug/plan" element={<SprintsPlanning />} />
            <Route path="/sprints/:slug/edit" element={<SprintsEditor />} />

            <Route path="/issues" element={<IssuesList />} />
            <Route path="/issues/new" element={<IssuesEditor />} />
            <Route path="/issues/:slug" element={<IssuesDetail />} />
            <Route path="/issues/:slug/edit" element={<IssuesEditor />} />

            <Route path="/reviews" element={<ReviewsList />} />
            <Route path="/reviews/health" element={<ReviewsHealth />} />
            <Route path="/reviews/:slug" element={<ReviewsDetail />} />

            <Route path="/config" element={<Config />} />
          </Routes>
        </main>
        <ChatPanel />
      </div>
    </BrowserRouter>
  )
}
