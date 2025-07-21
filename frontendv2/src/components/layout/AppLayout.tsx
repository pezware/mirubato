import React, { useState } from 'react'
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
  const location = useLocation()

  // Determine if we should show quick actions based on current page
  const shouldShowQuickActions =
    showQuickActions && location.pathname.includes('/logbook')

  const handleAddClick = () => {
    // Determine action based on current page
    if (location.pathname.includes('/logbook')) {
      onNewEntry?.()
    }
    // Add other page-specific actions here
  }

  return (
    <>
      <div className="min-h-screen bg-[#fafafa]">
        {/* Desktop Sidebar */}
        <Sidebar className="hidden sm:block" />

        {/* Main Content Area */}
        <div className="sm:ml-60 min-h-screen">
          {/* Top Bar */}
          <TopBar
            onSearchChange={onSearchChange}
            onNewEntry={shouldShowQuickActions ? onNewEntry : undefined}
            onTimerClick={shouldShowQuickActions ? onTimerClick : undefined}
            onSignInClick={() => setShowSignInModal(true)}
          />

          {/* Page Content */}
          <main className="pb-16 sm:pb-0">{children}</main>
        </div>

        {/* Mobile Bottom Tabs */}
        <BottomTabs onAddClick={handleAddClick} />
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
