import { useState, type ReactNode } from "react"
import { Header } from "./Header"
import { Sidebar } from "./Sidebar"
import { useGitStatus } from "@/hooks/useData"

const STORAGE_KEY = "sidebar-collapsed"

interface AppShellProps {
  children: ReactNode
  projectName?: string
}

export function AppShell({ children, projectName = "forge-project" }: AppShellProps) {
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(STORAGE_KEY) === "true"
  )

  const { data: git } = useGitStatus()

  function handleToggle() {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <div className={collapsed ? "sidebar-collapsed" : ""}>
      <Header
        projectName={projectName}
        branch={git?.branch ?? undefined}
        commit={git?.commit ?? undefined}
        dirty={git?.dirty ?? false}
      />
      <Sidebar collapsed={collapsed} onToggle={handleToggle} />
      <main className="main">
        <div className="content">{children}</div>
      </main>
    </div>
  )
}
