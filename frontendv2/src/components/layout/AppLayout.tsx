import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import BottomTabs from './BottomTabs'
import SignInModal from '../auth/SignInModal'

interface AppLayoutProps {
  children: React.ReactNode
  onSearchChange?: (query: string) => void
  onNewEntry?: () => void
  onTimerClick?: () => void
  showQuickActions?: boolean
}

const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  onSearchChange,
  onNewEntry,
  onTimerClick,
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

  // Determine if we should show quick actions based on current page
  const shouldShowQuickActions =
    showQuickActions && location.pathname.includes('/logbook')

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
      // Could add score import functionality here in the future
      console.log('Add score functionality not implemented yet')
    }
    // Add other page-specific actions here
  }

  return (
    <>
      <div className="min-h-screen bg-[#fafafa]">
        {/* Desktop Sidebar */}
        <Sidebar
          className="hidden sm:block"
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Main Content Area */}
        <div
          className={`transition-all duration-300 min-h-screen ${
            isSidebarCollapsed ? 'sm:ml-16' : 'sm:ml-60'
          }`}
        >
          {/* Top Bar */}
          <TopBar
            onSearchChange={shouldShowQuickActions ? onSearchChange : undefined}
            onNewEntry={shouldShowQuickActions ? onNewEntry : undefined}
            onTimerClick={shouldShowQuickActions ? onTimerClick : undefined}
            onSignInClick={() => setShowSignInModal(true)}
          />

          {/* Page Content */}
          <main className="pb-16 sm:pb-0">{children}</main>
        </div>

        {/* Mobile Bottom Tabs */}
        <BottomTabs onAddClick={handleAddClick} onTimerClick={onTimerClick} />
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
