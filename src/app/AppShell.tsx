import { Outlet } from 'react-router-dom'
import { MobileNav } from '../components/layout/MobileNav'
import { MobileTopbar } from '../components/layout/MobileTopbar'
import { ScrollToTop } from '../components/layout/ScrollToTop'
import { Sidebar } from '../components/layout/Sidebar'
import { useAuth } from '../features/auth/hooks/useAuth'
import { useUiStore } from '../stores/useUiStore'

export const AppShell = () => {
  const { mobileNavOpen, openMobileNav, closeMobileNav } = useUiStore()
  const { userEmail, signOut } = useAuth()

  return (
    <div className="min-h-dvh">
      <ScrollToTop />
      <a href="#contenido" className="ui-skip-link">
        Saltar al contenido
      </a>
      <Sidebar userEmail={userEmail} onSignOut={() => void signOut()} />
      <MobileTopbar onOpenMenu={openMobileNav} />
      <MobileNav
        open={mobileNavOpen}
        onClose={closeMobileNav}
        userEmail={userEmail}
        onSignOut={() => void signOut()}
      />
      <div className="lg:pl-64">
        <main id="contenido" className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-9 lg:px-10 lg:py-12">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
