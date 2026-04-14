import { lazy, Suspense, useEffect, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { Header } from "./Header"
import { Sidebar } from "./Sidebar"
import { useGitStatus, useProjects, useActivateProject } from "@/hooks/useData"
import { getActiveProjectSlug, setActiveProjectSlug } from "@/lib/api"
import type { Project } from "@/lib/types"

const AISidebar = lazy(() => import("./AISidebar").then(m => ({ default: m.AISidebar })))

const STORAGE_KEY = "sidebar-collapsed"
const AI_STORAGE_KEY = "ai-sidebar-open"

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(STORAGE_KEY) === "true"
  )
  const [aiOpen, setAiOpen] = useState<boolean>(
    () => localStorage.getItem(AI_STORAGE_KEY) === "true"
  )

  // Fetch project list and determine active project.
  const { data: projectData } = useProjects()
  const activateMutation = useActivateProject()
  const navigate = useNavigate()

  // Ensure the active project slug is set before any data fetches.
  const [ready, setReady] = useState<boolean>(() => !!getActiveProjectSlug())

  useEffect(() => {
    if (!projectData) return

    const currentSlug = getActiveProjectSlug()
    // If we already have a slug and it's valid, we're good.
    if (currentSlug && projectData.projects.some((p: Project) => p.slug === currentSlug)) {
      if (!ready) setReady(true)
      return
    }

    // Otherwise, use the server's active project.
    if (projectData.active) {
      setActiveProjectSlug(projectData.active)
      setReady(true)
    } else if (projectData.projects.length > 0) {
      setActiveProjectSlug(projectData.projects[0].slug)
      setReady(true)
    }
  }, [projectData, ready])

  const { data: git } = useGitStatus()

  const activeSlug = getActiveProjectSlug() ?? ""
  const activeProject = projectData?.projects.find((p: Project) => p.slug === activeSlug)
  const projectName = activeProject?.name ?? (activeSlug || "folio")
  const showSwitcher = (projectData?.projects.length ?? 0) > 1

  function handleProjectSwitch(slug: string) {
    activateMutation.mutate(slug)
    navigate("/")
  }

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

  // Don't render children until we know the active project.
  if (!ready) {
    return null
  }

  return (
    <div className={rootClass || undefined}>
      <Header
        projectName={projectName}
        projects={showSwitcher ? (projectData?.projects ?? []) : undefined}
        activeProjectSlug={activeSlug}
        onProjectSwitch={showSwitcher ? handleProjectSwitch : undefined}
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
