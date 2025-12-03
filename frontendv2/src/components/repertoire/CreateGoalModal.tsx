import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRepertoireStore } from '@/stores/repertoireStore'
import { useScoreStore } from '@/stores/scoreStore'
import { Modal, Button, Input, Select, Card } from '@/components/ui'
import { showToast } from '@/utils/toastManager'
import { CreateGoalInput, GoalType, Milestone } from '@/api/goals'
import {
  Target,
  Calendar,
  Clock,
  Music,
  Zap,
  TrendingUp,
  Plus,
  X,
} from 'lucide-react'
import { nanoid } from 'nanoid'

interface CreateGoalModalProps {
  isOpen: boolean
  onClose: () => void
  scoreId?: string
}

interface GoalTemplate {
  type: GoalType
  title: string
  description: string
  icon: React.ReactNode
  suggestedMilestones?: string[]
}

export function CreateGoalModal({
  isOpen,
  onClose,
  scoreId,
}: CreateGoalModalProps) {
  const { t } = useTranslation(['repertoire', 'common', 'ui'])
  const { createGoal, initializeGoalWithHistory } = useRepertoireStore()
  const { userLibrary: scores, loadUserLibrary } = useScoreStore()

  const [selectedTemplate, setSelectedTemplate] =
    useState<GoalType>('repertoire')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetValue, setTargetValue] = useState<number | ''>('')
  const [targetDate, setTargetDate] = useState('')
  const [dailyMinutes, setDailyMinutes] = useState<number | ''>('')
  const [focusMeasures, setFocusMeasures] = useState('')
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [practiceNotes, setPracticeNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [historicalPractice, setHistoricalPractice] = useState<number>(0)

  // Load scores if not already loaded
  useEffect(() => {
    if (isOpen && scores.length === 0) {
      loadUserLibrary()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Calculate historical practice when modal opens
  useEffect(() => {
    const loadHistoricalData = async () => {
      if (isOpen && scoreId && selectedTemplate === 'practice_time') {
        const historical = await initializeGoalWithHistory(
          scoreId,
          selectedTemplate
        )
        setHistoricalPractice(historical)
      }
    }
    loadHistoricalData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, scoreId, selectedTemplate])

  // Get score info if scoreId provided
  const score = scores.find(s => s.id === scoreId)

  const goalTemplates: GoalTemplate[] = [
    {
      type: 'repertoire',
      title: t('repertoire:goal.performanceReady'),
      description: t('repertoire:goal.performanceDesc'),
      icon: <TrendingUp className="w-5 h-5 text-sage-600" />,
      suggestedMilestones: [
        'Learn all notes (hands separate)',
        'Play hands together at slow tempo',
        'Reach target tempo',
        'Memorize completely',
        'Perform without mistakes',
      ],
    },
    {
      type: 'practice_time',
      title: t('repertoire:goal.learnMemorize'),
      description: t('repertoire:goal.learnDesc'),
      icon: <Music className="w-5 h-5 text-stone-600" />,
      suggestedMilestones: [
        'Learn first section',
        'Learn second section',
        'Connect all sections',
        'Memorize by section',
        'Play from memory',
      ],
    },
    {
      type: 'accuracy',
      title: t('repertoire:goal.technicalMastery'),
      description: t('repertoire:goal.technicalDesc'),
      icon: <Zap className="w-5 h-5 text-stone-600" />,
      suggestedMilestones: [
        'Identify difficult passages',
        'Slow practice of technical sections',
        'Gradual tempo increase',
        'Consistent accuracy at tempo',
      ],
    },
    {
      type: 'custom',
      title: t('repertoire:goal.customGoal'),
      description: t('repertoire:goal.customDesc'),
      icon: <Target className="w-5 h-5 text-stone-600" />,
      suggestedMilestones: [],
    },
  ]

  // Set default title based on template and score
  useEffect(() => {
    if (score && selectedTemplate === 'repertoire') {
      setTitle(`Master ${score.title} for performance`)
    } else if (score && selectedTemplate === 'practice_time') {
      setTitle(`Learn and memorize ${score.title}`)
    } else if (score && selectedTemplate === 'accuracy') {
      setTitle(`Perfect technique in ${score.title}`)
    }
  }, [selectedTemplate, score])

  // Initialize milestones from template
  useEffect(() => {
    const template = goalTemplates.find(t => t.type === selectedTemplate)
    if (
      template?.suggestedMilestones &&
      template.suggestedMilestones.length > 0
    ) {
      setMilestones(
        template.suggestedMilestones.map(title => ({
          id: nanoid(),
          title,
          completed: false,
        }))
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate])

  const handleAddMilestone = () => {
    setMilestones([
      ...milestones,
      {
        id: nanoid(),
        title: '',
        completed: false,
      },
    ])
  }

  const handleUpdateMilestone = (
    id: string,
    field: keyof Milestone,
    value: string | boolean | undefined
  ) => {
    setMilestones(
      milestones.map(m => (m.id === id ? { ...m, [field]: value } : m))
    )
  }

  const handleRemoveMilestone = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id))
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast(t('repertoire:goal.enterTitle'), 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const goalData: CreateGoalInput = {
        title,
        description: description || undefined,
        type: selectedTemplate,
        targetValue: targetValue ? Number(targetValue) : undefined,
        targetDate: targetDate || undefined,
        scoreId,
        measures: focusMeasures
          ? focusMeasures.split(',').map(m => m.trim())
          : undefined,
        practicePlan: dailyMinutes
          ? {
              dailyMinutes: Number(dailyMinutes),
              focusAreas: focusMeasures ? ['measures'] : undefined,
            }
          : undefined,
        milestones:
          milestones.filter(m => m.title.trim()).length > 0
            ? milestones.filter(m => m.title.trim())
            : undefined,
      }

      // Create the goal - the store will handle initializing with historical data
      await createGoal(goalData)
      onClose()
    } catch (_error) {
      // Error handled in store
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('repertoire:goal.createGoal')}
      size="lg"
    >
      <div className="space-y-6">
        {/* Score Info */}
        {score && (
          <Card variant="bordered" className="p-3 bg-stone-50">
            <div className="text-sm text-stone-600">
              {t('repertoire:goal.goalFor')}:{' '}
              <span className="font-medium text-stone-800">{score.title}</span>
              {score.composer && (
                <span className="text-stone-600"> - {score.composer}</span>
              )}
            </div>
          </Card>
        )}

        {/* Goal Templates */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            {t('repertoire:goal.goalType')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            {goalTemplates.map(template => (
              <Card
                key={template.type}
                variant="bordered"
                className={`p-4 cursor-pointer hover:border-sage-500 transition-colors ${
                  selectedTemplate === template.type
                    ? 'border-2 border-sage-500 bg-sage-50'
                    : ''
                }`}
                onClick={() => setSelectedTemplate(template.type)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      selectedTemplate === template.type
                        ? 'bg-sage-100'
                        : 'bg-stone-100'
                    }`}
                  >
                    {template.icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-stone-800">
                      {template.title}
                    </h4>
                    <p className="text-sm text-stone-600 mt-1">
                      {template.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Goal Title */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            {t('repertoire:goal.goalTitle')}
          </label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('repertoire:goal.enterGoalTitle')}
            className="w-full"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            {t('common:description')} ({t('common:optional')})
          </label>
          <Input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('repertoire:goal.enterDescription')}
            className="w-full"
          />
        </div>

        {/* Target Value */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            {t('repertoire:targetValue')} ({t('common:optional')})
          </label>
          <Input
            type="number"
            value={targetValue}
            onChange={e =>
              setTargetValue(
                e.target.value === '' ? '' : Number(e.target.value)
              )
            }
            placeholder={t('repertoire:targetValuePlaceholder')}
            className="w-full"
          />
          <p className="mt-1 text-xs text-stone-500">
            {selectedTemplate === 'practice_time' &&
              t('repertoire:targetValueHelp.practiceTime')}
            {selectedTemplate === 'accuracy' &&
              t('repertoire:targetValueHelp.accuracy')}
            {selectedTemplate === 'repertoire' &&
              t('repertoire:targetValueHelp.repertoire')}
            {selectedTemplate === 'custom' &&
              t('repertoire:targetValueHelp.custom')}
          </p>
          {selectedTemplate === 'practice_time' && historicalPractice > 0 && (
            <p className="mt-1 text-xs text-green-600">
              {t('repertoire:alreadyPracticed', {
                minutes: historicalPractice,
              })}
            </p>
          )}
        </div>

        {/* Milestones */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            {t('repertoire:goal.milestones')} ({t('common:optional')})
          </label>
          <div className="space-y-2">
            {milestones.map((milestone, index) => (
              <div key={milestone.id} className="flex items-center gap-2">
                <input type="checkbox" className="rounded" disabled />
                <Input
                  value={milestone.title}
                  onChange={e =>
                    handleUpdateMilestone(milestone.id, 'title', e.target.value)
                  }
                  placeholder={`Milestone ${index + 1}`}
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={milestone.targetDate || ''}
                  onChange={e =>
                    handleUpdateMilestone(
                      milestone.id,
                      'targetDate',
                      e.target.value
                    )
                  }
                  className="w-32"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMilestone(milestone.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddMilestone}
              className="mt-2"
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('repertoire:goal.addMilestone')}
            </Button>
          </div>
        </div>

        {/* Time Commitment */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              {t('repertoire:goal.targetDate')}
            </label>
            <Input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-stone-500 mt-1">
              {t('repertoire:goal.optional')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              {t('repertoire:goal.dailyPractice')}
            </label>
            <Select
              value={dailyMinutes}
              onChange={value =>
                setDailyMinutes(value === '' ? '' : Number(value))
              }
              options={[
                {
                  value: '',
                  label: t('repertoire:goal.noSpecificRequirement'),
                },
                {
                  value: 15,
                  label: t('repertoire:goal.minutes', { count: 15 }),
                },
                {
                  value: 30,
                  label: t('repertoire:goal.minutes', { count: 30 }),
                },
                {
                  value: 45,
                  label: t('repertoire:goal.minutes', { count: 45 }),
                },
                { value: 60, label: t('repertoire:goal.hour') },
              ]}
              className="w-full"
            />
          </div>
        </div>

        {/* Focus Measures */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            {t('repertoire:goal.focusMeasures')} ({t('common:optional')})
          </label>
          <Input
            value={focusMeasures}
            onChange={e => setFocusMeasures(e.target.value)}
            placeholder={t('ui:components.goals.measuresPlaceholder')}
            className="w-full"
          />
          <p className="text-xs text-stone-500 mt-1">
            {t('repertoire:goal.measureHint')}
          </p>
        </div>

        {/* Practice Notes */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            {t('repertoire:goal.practiceNotes')} ({t('common:optional')})
          </label>
          <Input
            value={practiceNotes}
            onChange={e => setPracticeNotes(e.target.value)}
            placeholder={t('repertoire:goal.practiceNotesPlaceholder')}
            className="w-full"
          />
        </div>

        {/* Smart Suggestions */}
        {score && dailyMinutes && (
          <Card variant="bordered" className="p-4 bg-blue-50 border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              {t('repertoire:goal.smartSuggestions')}
            </h4>
            <ul className="space-y-1 text-sm text-blue-700">
              <li>
                •{' '}
                {t('repertoire:goal.basedOnHistory', {
                  time: `${dailyMinutes} min`,
                })}
              </li>
              <li>
                •{' '}
                {t('repertoire:goal.similarPieces', {
                  weeks: Math.ceil(dailyMinutes / 10),
                })}
              </li>
              {score.difficulty && (
                <li>
                  •{' '}
                  {t('repertoire:goal.considerAdding', {
                    suggestion:
                      score.difficulty === 'beginner' ? 'scales' : 'arpeggios',
                  })}
                </li>
              )}
            </ul>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>
            {t('common:cancel')}
          </Button>
          <Button variant="secondary">
            {t('repertoire:goal.saveAsDraft')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
          >
            <Target className="w-4 h-4 mr-2" />
            {t('repertoire:goal.createGoal')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
