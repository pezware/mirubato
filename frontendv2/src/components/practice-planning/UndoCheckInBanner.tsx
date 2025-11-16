import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Undo2, Clock, CheckCircle2, X } from 'lucide-react'
import {
  Button,
  Typography,
  Modal,
  ModalBody,
  ModalFooter,
} from '@/components/ui'
import type { PlanOccurrence, PracticePlan } from '@/api/planning'
import { usePlanningStore } from '@/stores/planningStore'
import { trackPlanningEvent } from '@/lib/analytics/planning'

interface UndoCheckInBannerProps {
  occurrence: PlanOccurrence
  plan?: PracticePlan
  onUndoComplete?: () => void
}

const UNDO_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

const parseIsoDate = (value?: string | null): Date | null => {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function UndoCheckInBanner({
  occurrence,
  plan,
  onUndoComplete,
}: UndoCheckInBannerProps) {
  const { t } = useTranslation(['reports', 'common'])
  const uncheckInOccurrence = usePlanningStore(
    state => state.uncheckInOccurrence
  )

  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isUndoing, setIsUndoing] = useState(false)
  const [undoError, setUndoError] = useState<string | null>(null)
  const [remainingMs, setRemainingMs] = useState<number>(0)
  const [isDismissed, setIsDismissed] = useState(false)

  const checkInTime = useMemo(() => {
    return parseIsoDate(occurrence.checkIn?.recordedAt)
  }, [occurrence.checkIn?.recordedAt])

  const isEligible = useMemo(() => {
    if (occurrence.status !== 'completed' || !checkInTime) {
      return false
    }
    const elapsed = Date.now() - checkInTime.getTime()
    return elapsed < UNDO_WINDOW_MS
  }, [occurrence.status, checkInTime])

  // Update remaining time every second
  useEffect(() => {
    if (!isEligible || !checkInTime) {
      setRemainingMs(0)
      return
    }

    const updateRemaining = () => {
      const elapsed = Date.now() - checkInTime.getTime()
      const remaining = Math.max(0, UNDO_WINDOW_MS - elapsed)
      setRemainingMs(remaining)
    }

    updateRemaining()
    const interval = setInterval(updateRemaining, 1000)
    return () => clearInterval(interval)
  }, [isEligible, checkInTime])

  const formattedTime = useMemo(() => {
    if (remainingMs <= 0) return '0:00'
    const totalSeconds = Math.floor(remainingMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [remainingMs])

  const handleUndoClick = () => {
    setUndoError(null)
    setIsConfirmOpen(true)
  }

  const handleConfirmUndo = async () => {
    setIsUndoing(true)
    setUndoError(null)

    try {
      const result = await uncheckInOccurrence(occurrence.id, {
        reason: 'user_initiated',
      })

      if (!result.success) {
        setUndoError(
          result.error ??
            t(
              'reports:planningUncheckIn.genericError',
              'Unable to undo check-in'
            )
        )
        setIsUndoing(false)
        return
      }

      // Track analytics event
      trackPlanningEvent('planning.occurrence.uncheckin', {
        occurrenceId: occurrence.id,
        planId: plan?.id,
        timeSinceCheckIn: checkInTime ? Date.now() - checkInTime.getTime() : 0,
        reason: 'user_initiated',
      })

      setIsConfirmOpen(false)
      setIsUndoing(false)
      onUndoComplete?.()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t(
              'reports:planningUncheckIn.genericError',
              'Unable to undo check-in'
            )
      setUndoError(message)
      setIsUndoing(false)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
  }

  // Don't render if not eligible, dismissed, or time expired
  if (!isEligible || remainingMs <= 0 || isDismissed) {
    return null
  }

  return (
    <>
      <div className="rounded-lg border border-morandi-sage-200 bg-morandi-sage-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-morandi-sage-600 flex-shrink-0" />
            <div>
              <Typography
                variant="body-sm"
                className="text-morandi-stone-900 font-medium"
              >
                {t(
                  'reports:planningUncheckIn.recentlyCompleted',
                  'Session completed'
                )}
              </Typography>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-3.5 w-3.5 text-morandi-stone-500" />
                <Typography
                  variant="caption"
                  className="text-morandi-stone-600"
                >
                  {t(
                    'reports:planningUncheckIn.timeRemaining',
                    'Undo available for {{time}}',
                    {
                      time: formattedTime,
                    }
                  )}
                </Typography>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndoClick}
              leftIcon={<Undo2 className="h-4 w-4" />}
            >
              {t('reports:planningUncheckIn.undoButton', 'Undo')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              aria-label={t('common:close', 'Close')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => {
          if (!isUndoing) {
            setIsConfirmOpen(false)
            setUndoError(null)
          }
        }}
        title={t('reports:planningUncheckIn.confirmTitle', 'Undo Check-In?')}
        size="sm"
      >
        <ModalBody>
          <div className="space-y-3">
            <Typography variant="body" className="text-morandi-stone-700">
              {t(
                'reports:planningUncheckIn.confirmMessage',
                'This will unlink your practice session from "{{planTitle}}". Your logbook entry will be preserved and can be linked to a different plan or remain standalone.',
                { planTitle: plan?.title ?? 'this plan' }
              )}
            </Typography>
            <Typography variant="caption" className="text-morandi-stone-600">
              {t(
                'reports:planningUncheckIn.confirmNote',
                'Note: Your practice time has already been logged and will remain in your logbook.'
              )}
            </Typography>
            {undoError && (
              <Typography variant="body" className="text-morandi-rose-500">
                {undoError}
              </Typography>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => setIsConfirmOpen(false)}
            disabled={isUndoing}
          >
            {t('common:cancel', 'Cancel')}
          </Button>
          <Button
            variant="secondary"
            onClick={handleConfirmUndo}
            loading={isUndoing}
            leftIcon={<Undo2 className="h-4 w-4" />}
          >
            {t('reports:planningUncheckIn.confirmButton', 'Undo Check-In')}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

export default UndoCheckInBanner
