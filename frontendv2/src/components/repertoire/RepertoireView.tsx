import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useRepertoireStore } from '@/stores/repertoireStore'
import { useScoreStore } from '@/stores/scoreStore'
import { EnhancedAnalyticsData } from '@/types/reporting'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
import { RepertoireCard } from './RepertoireCard'
import { AddToRepertoireModal } from './AddToRepertoireModal'
import { CreateGoalModal } from './CreateGoalModal'
import { formatDuration, formatRelativeTime } from '@/utils/dateUtils'
import { Search, Music, Target, TrendingUp, Clock } from 'lucide-react'

interface RepertoireViewProps {
  analytics: EnhancedAnalyticsData
}

export default function RepertoireView({ analytics }: RepertoireViewProps) {
  const { t } = useTranslation(['repertoire', 'common'])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [selectedScoreId, setSelectedScoreId] = useState<string | null>(null)

  const {
    repertoire,
    goals,
    repertoireLoading,
    statusFilter,
    goalFilter,
    searchQuery,
    loadRepertoire,
    loadGoals,
    setStatusFilter,
    setGoalFilter,
    setSearchQuery,
    getFilteredRepertoire,
    getActiveGoalsByScore,
  } = useRepertoireStore()

  const { scores, loadScores } = useScoreStore()

  // Load data on mount
  useEffect(() => {
    loadRepertoire()
    loadGoals()
    loadScores()
  }, [])

  // Get filtered repertoire items
  const filteredItems = getFilteredRepertoire()

  // Calculate stats
  const stats = useMemo(() => {
    const activeGoals = Array.from(goals.values()).filter(
      g => g.status === 'active'
    )
    const totalPracticeTime = filteredItems.reduce(
      (sum, item) => sum + item.totalPracticeTime,
      0
    )
    const performanceReady = filteredItems.filter(
      item => item.status === 'performance_ready'
    ).length

    // Practice this week
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const practiceThisWeek = analytics.filteredEntries
      .filter(entry => new Date(entry.timestamp).getTime() > oneWeekAgo)
      .reduce((sum, entry) => sum + entry.duration, 0)

    return {
      totalPieces: filteredItems.length,
      activeGoals: activeGoals.length,
      practiceThisWeek,
      performanceReady,
    }
  }, [filteredItems, goals, analytics])

  // Merge repertoire data with score metadata
  const enrichedRepertoire = useMemo(() => {
    return filteredItems.map(item => {
      const score = scores.find(s => s.id === item.scoreId)
      const scoreGoals = getActiveGoalsByScore(item.scoreId)

      // Get practice data from analytics
      const practiceSessions = analytics.filteredEntries.filter(
        entry => entry.scoreId === item.scoreId
      )

      return {
        ...item,
        scoreTitle: score?.title || 'Unknown Score',
        scoreComposer: score?.composer || '',
        activeGoals: scoreGoals,
        recentPractice: practiceSessions.slice(0, 5),
      }
    })
  }, [filteredItems, scores, analytics])

  if (repertoireLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loading type="spinner" size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-stone-800">
          {t('repertoire:myRepertoire')}
        </h2>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <Music className="w-4 h-4 mr-2" />
          {t('repertoire:addToRepertoire')}
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 w-4 h-4" />
            <Input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('repertoire:searchPieces')}
              className="pl-10"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="flex-1"
            >
              <option value="all">{t('repertoire:allPieces')}</option>
              <option value="planned">{t('repertoire:status.planned')}</option>
              <option value="learning">
                {t('repertoire:status.learning')}
              </option>
              <option value="working">{t('repertoire:status.working')}</option>
              <option value="polished">
                {t('repertoire:status.polished')}
              </option>
              <option value="performance_ready">
                {t('repertoire:status.performance_ready')}
              </option>
            </Select>

            <Select
              value={goalFilter}
              onChange={e => setGoalFilter(e.target.value as any)}
              className="flex-1"
            >
              <option value="all">{t('repertoire:allGoals')}</option>
              <option value="active">{t('repertoire:activeGoals')}</option>
              <option value="completed">
                {t('repertoire:completedGoals')}
              </option>
              <option value="no-goals">{t('repertoire:noGoals')}</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card variant="elevated" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-stone-600">
                {t('repertoire:totalRepertoire')}
              </div>
              <div className="text-2xl font-bold text-sage-700">
                {stats.totalPieces}
              </div>
            </div>
            <Music className="w-8 h-8 text-sage-200" />
          </div>
        </Card>

        <Card variant="elevated" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-stone-600">
                {t('repertoire:activeGoals')}
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.activeGoals}
              </div>
            </div>
            <Target className="w-8 h-8 text-blue-200" />
          </div>
        </Card>

        <Card variant="elevated" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-stone-600">
                {t('repertoire:practiceThisWeek')}
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatDuration(stats.practiceThisWeek)}
              </div>
            </div>
            <Clock className="w-8 h-8 text-green-200" />
          </div>
        </Card>

        <Card variant="elevated" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-stone-600">
                {t('repertoire:performanceReady')}
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {stats.performanceReady}
              </div>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-200" />
          </div>
        </Card>
      </div>

      {/* Repertoire Items */}
      <div className="space-y-4">
        {enrichedRepertoire.length === 0 ? (
          <Card className="p-8 text-center">
            <Music className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-600 mb-4">
              {t('repertoire:emptyRepertoire')}
            </p>
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              {t('repertoire:addFirstPiece')}
            </Button>
          </Card>
        ) : (
          enrichedRepertoire.map(item => (
            <RepertoireCard
              key={item.scoreId}
              item={item}
              onCreateGoal={() => {
                setSelectedScoreId(item.scoreId)
                setShowGoalModal(true)
              }}
            />
          ))
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddToRepertoireModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showGoalModal && selectedScoreId && (
        <CreateGoalModal
          isOpen={showGoalModal}
          onClose={() => {
            setShowGoalModal(false)
            setSelectedScoreId(null)
          }}
          scoreId={selectedScoreId}
        />
      )}
    </div>
  )
}
