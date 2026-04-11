import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AppShell } from "@/components/AppShell"
import { Dashboard } from "@/pages/Dashboard"
import { StubPage } from "@/pages/StubPage"

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/docs" element={<StubPage title="Project Docs" />} />
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
