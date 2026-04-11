import { useState, type ReactNode } from "react"
import { Header } from "./Header"
import { Sidebar } from "./Sidebar"

interface AppShellProps {
  children: ReactNode
  projectName?: string
}

export function AppShell({ children, projectName = "forge-project" }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className={collapsed ? "sidebar-collapsed" : ""}>
      <Header
        projectName={projectName}
        branch="feature/oauth"
        commit="abc1234"
        dirty={true}
      />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main className="main">
        <div className="content">{children}</div>
      </main>
    </div>
  )
}
