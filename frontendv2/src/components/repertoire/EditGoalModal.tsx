import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { showToast } from '@/utils/toastManager'
import { Goal, GoalType, GoalStatus } from '@/api/goals'

interface EditGoalModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (updates: Partial<Goal>) => Promise<void>
  goal: Goal
  pieceTitle: string
}

export function EditGoalModal({
  isOpen,
  onClose,
  onSave,
  goal,
  pieceTitle,
}: EditGoalModalProps) {
  const { t } = useTranslation(['repertoire', 'common'])
  const [title, setTitle] = useState(goal.title)
  const [description, setDescription] = useState(goal.description || '')
  const [type, setType] = useState(goal.type)
  const [targetValue, setTargetValue] = useState(
    goal.targetValue?.toString() || ''
  )
  const [targetDate, setTargetDate] = useState(
    goal.targetDate
      ? new Date(parseInt(goal.targetDate)).toISOString().split('T')[0]
      : ''
  )
  const [isLoading, setIsLoading] = useState(false)

  const typeOptions: Array<{ value: GoalType; label: string }> = [
    { value: 'practice_time', label: t('repertoire:goalType.practiceTime') },
    { value: 'accuracy', label: t('repertoire:goalType.accuracy') },
    { value: 'repertoire', label: t('repertoire:goalType.repertoire') },
    { value: 'custom', label: t('repertoire:goalType.custom') },
  ]

  const handleSave = async () => {
    if (!title.trim()) {
      showToast(t('repertoire:goalTitleRequired'), 'error')
      return
    }

    setIsLoading(true)
    try {
      const updates: Partial<Goal> = {
        title,
        description: description || undefined,
        type,
        targetValue: targetValue ? parseFloat(targetValue) : undefined,
        targetDate: targetDate
          ? new Date(targetDate).getTime().toString()
          : undefined,
      }

      await onSave(updates)
      onClose()
    } catch (error) {
      console.error('Error updating goal:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = () => {
    if (confirm(t('repertoire:confirmDeleteGoal'))) {
      onSave({ status: 'abandoned' as GoalStatus })
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('repertoire:editGoal')}
      size="lg"
    >
      <div className="space-y-4">
        <div className="text-sm text-stone-600">
          {t('repertoire:editingGoalFor', { piece: pieceTitle })}
        </div>

        {/* Goal Title */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            {t('repertoire:goalTitle')}
          </label>
          <Input
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setTitle(e.target.value)
            }
            placeholder={t('repertoire:goalTitlePlaceholder')}
            className="w-full"
          />
        </div>

        {/* Goal Description */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            {t('repertoire:goalDescription')}
          </label>
          <Textarea
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setDescription(e.target.value)
            }
            placeholder={t('repertoire:goalDescriptionPlaceholder')}
            rows={3}
            className="w-full"
          />
        </div>

        {/* Goal Type */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            {t('repertoire:goalType')}
          </label>
          <Select
            value={type}
            onChange={value => setType(value as GoalType)}
            options={typeOptions}
            className="w-full"
          />
        </div>

        {/* Target Value */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            {t('repertoire:targetValue')}
          </label>
          <Input
            type="number"
            value={targetValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setTargetValue(e.target.value)
            }
            placeholder={t('repertoire:targetValuePlaceholder')}
            className="w-full"
          />
        </div>

        {/* Target Date */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            {t('repertoire:targetDate')}
          </label>
          <Input
            type="date"
            value={targetDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setTargetDate(e.target.value)
            }
            className="w-full"
          />
        </div>

        {/* Current Progress */}
        {goal.currentValue !== undefined && goal.targetValue && (
          <Card variant="ghost" className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-stone-700">
                {t('repertoire:currentProgress')}
              </span>
              <span className="text-sm text-stone-600">
                {goal.currentValue} / {goal.targetValue}
              </span>
            </div>
            <div className="w-full bg-stone-200 rounded-full h-2">
              <div
                className="bg-sage-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    (goal.currentValue / goal.targetValue) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="danger" onClick={handleDelete} size="sm">
            {t('repertoire:deleteGoal')}
          </Button>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose}>
              {t('common:cancel')}
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isLoading}>
              {t('common:save')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
