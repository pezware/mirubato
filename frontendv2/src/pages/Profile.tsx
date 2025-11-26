import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { User, Settings, Database, LogIn } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { Tabs } from '../components/ui'
import { ProfileTab } from '../components/profile/ProfileTab'
import { PreferencesTab } from '../components/profile/PreferencesTab'
import { DataTab } from '../components/profile/DataTab'
import { AccountTab } from '../components/profile/AccountTab'

const validTabs = ['profile', 'preferences', 'data', 'account']

export default function Profile() {
  const { t } = useTranslation(['profile', 'common'])
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(
    tabParam && validTabs.includes(tabParam) ? tabParam : 'profile'
  )

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Sync tab state with URL
  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam)
    }
  }, [tabParam, activeTab])

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    if (tabId === 'profile') {
      setSearchParams({})
    } else {
      setSearchParams({ tab: tabId })
    }
  }

  const tabs = [
    {
      id: 'profile',
      label: t('profile:tabs.profile', 'Profile'),
      icon: <User size={20} />,
    },
    {
      id: 'preferences',
      label: t('profile:tabs.preferences', 'Preferences'),
      icon: <Settings size={20} />,
    },
    {
      id: 'data',
      label: t('profile:tabs.data', 'Data'),
      icon: <Database size={20} />,
    },
    {
      id: 'account',
      label: t('profile:tabs.account', 'Account'),
      icon: <LogIn size={20} />,
    },
  ]

  return (
    <AppLayout>
      <div className="p-3 sm:px-6 sm:py-4">
        {/* Page Header */}
        <div className="mb-4">
          <h1 className="font-lexend text-2xl sm:text-3xl font-light text-morandi-stone-700">
            {t('profile:title', 'User Profile')}
          </h1>
          <p className="font-inter text-sm text-morandi-stone-500 mt-1">
            {t(
              'profile:subtitle',
              'Manage your profile, preferences, and data'
            )}
          </p>
        </div>

        {/* Tabs */}
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          className="mb-3 sm:mb-4"
        />

        {/* Tab Content */}
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'preferences' && <PreferencesTab />}
        {activeTab === 'data' && <DataTab />}
        {activeTab === 'account' && <AccountTab />}
      </div>
    </AppLayout>
  )
}
