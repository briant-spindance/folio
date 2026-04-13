import { lazy, Suspense, useState, type ReactNode } from "react"
import { Header } from "./Header"
import { Sidebar } from "./Sidebar"
import { useGitStatus } from "@/hooks/useData"

const AISidebar = lazy(() => import("./AISidebar").then(m => ({ default: m.AISidebar })))

const STORAGE_KEY = "sidebar-collapsed"
const AI_STORAGE_KEY = "ai-sidebar-open"

interface AppShellProps {
  children: ReactNode
  projectName?: string
}

export function AppShell({ children, projectName = "folio-project" }: AppShellProps) {
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(STORAGE_KEY) === "true"
  )
  const [aiOpen, setAiOpen] = useState<boolean>(
    () => localStorage.getItem(AI_STORAGE_KEY) === "true"
  )

  const { data: git } = useGitStatus()

  function handleToggle() {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  function handleAiToggle() {
    setAiOpen((o) => {
      const next = !o
      localStorage.setItem(AI_STORAGE_KEY, String(next))
      return next
    })
  }

  const rootClass = [
    collapsed ? "sidebar-collapsed" : "",
    aiOpen ? "ai-sidebar-open" : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={rootClass || undefined}>
      <Header
        projectName={projectName}
        branch={git?.branch ?? undefined}
        commit={git?.commit ?? undefined}
        dirty={git?.dirty ?? false}
        aiOpen={aiOpen}
        onAiToggle={handleAiToggle}
      />
      <Sidebar collapsed={collapsed} onToggle={handleToggle} />
      <main className="main">
        <div className="content">{children}</div>
      </main>
      {aiOpen && (
        <Suspense fallback={null}>
          <AISidebar open={aiOpen} onClose={handleAiToggle} />
        </Suspense>
      )}
    </div>
  )
}
