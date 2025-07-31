import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomTabs from './BottomTabs'
import SignInModal from '../auth/SignInModal'

interface AppLayoutProps {
  children: React.ReactNode
  onNewEntry?: () => void
  onTimerClick?: () => void
  onImportScore?: () => void
  onToolboxAdd?: () => void
  showQuickActions?: boolean
}

const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  onNewEntry,
  onTimerClick,
  onImportScore,
  onToolboxAdd,
  showQuickActions = true,
}) => {
  const [showSignInModal, setShowSignInModal] = useState(false)

  // Initialize sidebar state from localStorage
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('mirubato:sidebarCollapsed')
    return saved === 'true'
  })

  const location = useLocation()

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(
      'mirubato:sidebarCollapsed',
      isSidebarCollapsed.toString()
    )
  }, [isSidebarCollapsed])

  // Show quick actions on all pages
  const shouldShowQuickActions = showQuickActions

  const handleAddClick = () => {
    // Determine action based on current page
    if (
      location.pathname === '/logbook' ||
      location.pathname.startsWith('/logbook')
    ) {
      onNewEntry?.()
    } else if (
      location.pathname === '/scorebook/browse' ||
      location.pathname.startsWith('/scorebook')
    ) {
      onImportScore?.()
    } else if (
      location.pathname === '/toolbox' ||
      location.pathname.startsWith('/toolbox')
    ) {
      onToolboxAdd?.()
    }
  }

  return (
    <>
      <div className="min-h-screen bg-[#fafafa]">
        {/* Desktop Sidebar with all functionality */}
        <Sidebar
          className="hidden sm:block"
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onNewEntry={shouldShowQuickActions ? onNewEntry : undefined}
          onTimerClick={shouldShowQuickActions ? onTimerClick : undefined}
          onSignInClick={() => setShowSignInModal(true)}
        />

        {/* Main Content Area - No TopBar */}
        <div
          className={`transition-all duration-300 min-h-screen ${
            isSidebarCollapsed ? 'sm:ml-16' : 'sm:ml-56'
          }`}
        >
          {/* Page Content */}
          <main className="pb-16 sm:pb-0">{children}</main>
        </div>

        {/* Mobile Bottom Tabs - Unchanged */}
        <BottomTabs
          onAddClick={handleAddClick}
          onTimerClick={onTimerClick}
          onSignInClick={() => setShowSignInModal(true)}
        />
      </div>

      {/* Sign In Modal */}
      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
    </>
  )
}

export default AppLayout
