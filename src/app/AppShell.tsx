import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { MobileNav } from '../components/layout/MobileNav'
import { MobileTopbar } from '../components/layout/MobileTopbar'
import { ScrollToTop } from '../components/layout/ScrollToTop'
import { Sidebar } from '../components/layout/Sidebar'

export const AppShell = () => {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-dvh">
      <ScrollToTop />
      <a href="#contenido" className="ui-skip-link">
        Saltar al contenido
      </a>
      <Sidebar />
      <MobileTopbar onOpenMenu={() => setMenuOpen(true)} />
      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-64">
        <main id="contenido" className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-9 lg:px-10 lg:py-12">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
