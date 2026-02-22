import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { User, Clock, Music, Target, Calendar, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Input, Button } from '../ui'
import { useAuthStore } from '../../stores/authStore'
import { useLogbookStore } from '../../stores/logbookStore'
import { useRepertoireStore } from '../../stores/repertoireStore'
import { useUserPreferences } from '../../hooks/useUserPreferences'
import { showToast } from '../../utils/toastManager'

export function ProfileTab() {
  const { t } = useTranslation(['profile', 'common'])
  const { user, isAuthenticated } = useAuthStore()
  const { entries, goals: logbookGoals } = useLogbookStore()
  const { repertoire } = useRepertoireStore()
  const { preferences, updatePreferences } = useUserPreferences()

  // Get the effective display name - localStorage takes priority, then server, then email
  const getEffectiveDisplayName = useCallback(() => {
    // Priority: 1. Local preferences (user's choice), 2. Server displayName, 3. Email prefix
    if (preferences.displayName) {
      return preferences.displayName
    }
    if (isAuthenticated && user?.displayName) {
      return user.displayName
    }
    return ''
  }, [preferences.displayName, isAuthenticated, user?.displayName])

  // Username state - initialize from effective display name
  const [displayName, setDisplayName] = useState(getEffectiveDisplayName)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Update displayName when preferences or user changes
  useEffect(() => {
    const effectiveName = getEffectiveDisplayName()
    if (effectiveName && !isEditing) {
      setDisplayName(effectiveName)
    }
  }, [getEffectiveDisplayName, isEditing])

  const getUserInitials = () => {
    const name = displayName || user?.email || ''
    if (!name) return '?'
    const parts = name.split(/[\s@]+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const handleSaveDisplayName = async () => {
    setIsSaving(true)
    try {
      // Save to local preferences (works for both anonymous and authenticated)
      updatePreferences({ displayName: displayName.trim() })

      // TODO: If authenticated, also sync to server API
      // await userApi.updateProfile({ displayName: displayName.trim() })

      showToast(t('profile:displayNameSaved', 'Display name saved'), 'success')
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save display name:', error)
      showToast(
        t('profile:displayNameError', 'Failed to save display name'),
        'error'
      )
    } finally {
      setIsSaving(false)
    }
  }

  // Calculate stats
  const totalPracticeMinutes = entries.reduce(
    (sum, entry) => sum + (entry.duration || 0),
    0
  )
  const totalHours = Math.floor(totalPracticeMinutes / 60)
  const remainingMinutes = totalPracticeMinutes % 60

  const stats = [
    {
      icon: Clock,
      label: t('profile:stats.totalPractice', 'Total Practice'),
      value:
        totalHours > 0
          ? `${totalHours}h ${remainingMinutes}m`
          : `${remainingMinutes}m`,
    },
    {
      icon: Calendar,
      label: t('profile:stats.entries', 'Practice Entries'),
      value: entries.length.toString(),
    },
    {
      icon: Music,
      label: t('profile:stats.pieces', 'Repertoire Pieces'),
      value: repertoire.size.toString(),
    },
    {
      icon: Target,
      label: t('profile:stats.goals', 'Goals'),
      value: logbookGoals.length.toString(),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-lexend text-morandi-stone-700">
            <User className="h-5 w-5" />
            {t('profile:sections.profile', 'Your Profile')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar and Name Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-morandi-sage-500 text-white flex items-center justify-center text-3xl font-semibold shadow-md">
              {getUserInitials()}
            </div>

            {/* Name and Email */}
            <div className="flex-1 text-center sm:text-left">
              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder={t(
                      'profile:displayNamePlaceholder',
                      'Enter your display name'
                    )}
                    className="max-w-xs"
                  />
                  <div className="flex gap-2 justify-center sm:justify-start">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveDisplayName}
                      disabled={isSaving || !displayName.trim()}
                    >
                      {isSaving ? (
                        t('common:saving', 'Saving...')
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          {t('common:save', 'Save')}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false)
                        // Reset to saved value
                        setDisplayName(getEffectiveDisplayName())
                      }}
                      disabled={isSaving}
                    >
                      {t('common:cancel', 'Cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="font-lexend text-xl font-medium text-morandi-stone-700">
                    {displayName ||
                      user?.email?.split('@')[0] ||
                      t('profile:anonymous', 'Anonymous User')}
                  </h2>
                  {isAuthenticated && user?.email && (
                    <p className="text-sm text-morandi-stone-500 mt-1">
                      {user.email}
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="mt-2"
                  >
                    {t('profile:editDisplayName', 'Edit display name')}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Account Info */}
          {isAuthenticated && user?.createdAt && (
            <div className="pt-4 border-t border-morandi-stone-200">
              <p className="text-xs text-morandi-stone-500">
                {t('profile:memberSince', 'Member since')}{' '}
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          )}

          {!isAuthenticated && (
            <div className="p-4 bg-morandi-sage-50 rounded-lg border border-morandi-sage-200">
              <p className="text-sm text-morandi-stone-600">
                {t(
                  'profile:anonymousNote',
                  'You are using Mirubato without an account. Your data is stored locally in this browser. Sign in to sync your data across devices.'
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="font-lexend text-morandi-stone-700">
            {t('profile:sections.statistics', 'Your Statistics')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map(stat => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.label}
                  className="text-center p-4 bg-morandi-stone-50 rounded-lg"
                >
                  <Icon className="h-6 w-6 mx-auto mb-2 text-morandi-sage-600" />
                  <div className="font-lexend text-2xl font-medium text-morandi-stone-700">
                    {stat.value}
                  </div>
                  <div className="text-xs text-morandi-stone-500 mt-1">
                    {stat.label}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
