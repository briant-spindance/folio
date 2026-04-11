import { useState, type ReactNode } from "react"
import { Header } from "./Header"
import { Sidebar } from "./Sidebar"

const STORAGE_KEY = "sidebar-collapsed"

interface AppShellProps {
  children: ReactNode
  projectName?: string
}

export function AppShell({ children, projectName = "forge-project" }: AppShellProps) {
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(STORAGE_KEY) === "true"
  )

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
        branch="feature/oauth"
        commit="abc1234"
        dirty={true}
      />
      <Sidebar collapsed={collapsed} onToggle={handleToggle} />
      <main className="main">
        <div className="content">{children}</div>
      </main>
    </div>
  )
}
