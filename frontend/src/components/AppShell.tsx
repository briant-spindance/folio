import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main
        style={{
          marginLeft: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
          paddingTop: 'var(--header-height)',
        }}
        className="transition-[margin-left] duration-200 min-h-screen"
      >
        <div className="p-6 max-w-[1120px] mx-auto flex flex-col gap-5">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
