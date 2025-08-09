import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Settings, Bell, Volume2, Eye } from 'lucide-react'
import { Modal } from '../ui/Modal'
import Button from '../ui/Button'
import { useGlobalTimer } from '@/hooks/useGlobalTimer'

interface TimerSettingsProps {
  isOpen: boolean
  onClose: () => void
}

export function TimerSettings({ isOpen, onClose }: TimerSettingsProps) {
  const { t } = useTranslation(['logbook', 'common'])
  const { settings, updateSettings } = useGlobalTimer()

  // Local state for editing
  const [localSettings, setLocalSettings] = useState(settings)

  const handleSave = () => {
    updateSettings(localSettings)
    onClose()
  }

  const handleCancel = () => {
    setLocalSettings(settings) // Reset to current settings
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={t('logbook:timer.settings', 'Timer Settings')}
    >
      <div className="space-y-6">
        {/* Enable Reminders */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-600" />
            <div>
              <label className="font-medium text-gray-900">
                {t('logbook:timer.enableReminders', 'Enable Reminders')}
              </label>
              <p className="text-sm text-gray-500">
                {t(
                  'logbook:timer.reminderDescription',
                  'Get notified at regular intervals'
                )}
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={localSettings.enableReminders}
              onChange={e =>
                setLocalSettings({
                  ...localSettings,
                  enableReminders: e.target.checked,
                })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Reminder Type */}
        {localSettings.enableReminders && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('logbook:timer.reminderType', 'Reminder Type')}
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="reminderType"
                    value="visual"
                    checked={localSettings.reminderType === 'visual'}
                    onChange={e =>
                      setLocalSettings({
                        ...localSettings,
                        reminderType: e.target.value as
                          | 'visual'
                          | 'sound'
                          | 'both',
                      })
                    }
                    className="text-blue-600"
                  />
                  <Eye className="w-4 h-4 text-gray-600" />
                  <span>
                    {t('logbook:timer.visualOnly', 'Visual notification only')}
                  </span>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="reminderType"
                    value="sound"
                    checked={localSettings.reminderType === 'sound'}
                    onChange={e =>
                      setLocalSettings({
                        ...localSettings,
                        reminderType: e.target.value as
                          | 'visual'
                          | 'sound'
                          | 'both',
                      })
                    }
                    className="text-blue-600"
                  />
                  <Volume2 className="w-4 h-4 text-gray-600" />
                  <span>{t('logbook:timer.soundOnly', 'Sound only')}</span>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="reminderType"
                    value="both"
                    checked={localSettings.reminderType === 'both'}
                    onChange={e =>
                      setLocalSettings({
                        ...localSettings,
                        reminderType: e.target.value as
                          | 'visual'
                          | 'sound'
                          | 'both',
                      })
                    }
                    className="text-blue-600"
                  />
                  <Bell className="w-4 h-4 text-gray-600" />
                  <span>{t('logbook:timer.both', 'Visual and sound')}</span>
                </label>
              </div>
            </div>

            {/* Reminder Interval */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('logbook:timer.reminderInterval', 'Reminder Interval')}
              </label>
              <select
                value={localSettings.reminderInterval}
                onChange={e =>
                  setLocalSettings({
                    ...localSettings,
                    reminderInterval: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="15">
                  {t('logbook:timer.every15min', 'Every 15 minutes')}
                </option>
                <option value="20">
                  {t('logbook:timer.every20min', 'Every 20 minutes')}
                </option>
                <option value="25">
                  {t('logbook:timer.every25min', 'Every 25 minutes')}
                </option>
                <option value="30">
                  {t('logbook:timer.every30min', 'Every 30 minutes')}
                </option>
                <option value="45">
                  {t('logbook:timer.every45min', 'Every 45 minutes')}
                </option>
                <option value="60">
                  {t('logbook:timer.every60min', 'Every hour')}
                </option>
              </select>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={handleCancel}>
            {t('common:actions.cancel')}
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {t('common:actions.save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

interface TimerSettingsButtonProps {
  onClick: () => void
  className?: string
}

export function TimerSettingsButton({
  onClick,
  className = '',
}: TimerSettingsButtonProps) {
  const { t } = useTranslation(['logbook'])

  return (
    <button
      onClick={onClick}
      className={`p-2 text-gray-500 hover:text-gray-700 transition-colors ${className}`}
      title={t('logbook:timer.settings', 'Timer Settings')}
    >
      <Settings className="w-5 h-5" />
    </button>
  )
}
