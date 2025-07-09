import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EnhancedAnalyticsData } from '../../../types/reporting'
import { ComparativeChart } from '../visualizations/charts/ComparativeChart'
import { PracticeTrendChart } from '../visualizations/charts/PracticeTrendChart'
import { FilterBuilder } from '../advanced/FilterBuilder'
import { GroupingPanel } from '../advanced/GroupingPanel'
import { SortingPanel } from '../advanced/SortingPanel'
import { Tabs } from '../../ui/Tabs'
import { Card } from '../../ui/Card'

interface AnalyticsViewProps {
  analytics: EnhancedAnalyticsData
}

export default function AnalyticsView({ analytics }: AnalyticsViewProps) {
  const { t } = useTranslation(['reports', 'common'])
  const [activeTab, setActiveTab] = useState('filters')

  return (
    <div className="p-4 sm:p-6" data-testid="analytics-content">
      {/* Advanced Controls */}
      <Card className="mb-6">
        <Tabs
          tabs={[
            { id: 'filters', label: t('reports:filters.title') },
            { id: 'grouping', label: t('reports:grouping.title') },
            { id: 'sorting', label: t('reports:sorting.title') },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="mb-4"
        />

        <div className="p-4">
          {activeTab === 'filters' && <FilterBuilder />}

          {activeTab === 'grouping' && <GroupingPanel />}

          {activeTab === 'sorting' && <SortingPanel />}
        </div>
      </Card>

      {/* Analytics Visualizations */}
      <div className="space-y-6">
        {/* Trend Analysis */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-morandi-stone-700 mb-3">
            {t('reports:trendAnalysis')}
          </h3>
          <PracticeTrendChart
            data={analytics.timeSeriesData || []}
            period="week"
            showMovingAverage
          />
        </div>

        {/* Comparative Analysis */}
        {analytics.comparativeData && (
          <div>
            <h3 className="text-lg font-semibold text-morandi-stone-700 mb-3">
              {t('reports:comparativeAnalysis')}
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ComparativeChart
                data={analytics.comparativeData.weekOverWeek}
                title={t('reports:weekOverWeek')}
                type="bar"
              />
              <ComparativeChart
                data={analytics.comparativeData.monthOverMonth}
                title={t('reports:monthOverMonth')}
                type="bar"
              />
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div>
          <h3 className="text-lg font-semibold text-morandi-stone-700 mb-3">
            {t('reports:keyMetrics')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-sm text-morandi-stone-600">
                {t('reports:averageSessionDuration')}
              </div>
              <div className="text-2xl font-bold text-morandi-purple-600 mt-1">
                {Math.round(analytics.summaryStats.averageDuration)} min
              </div>
              <div className="text-xs text-morandi-stone-500 mt-1">
                {t('reports:basedOnSessions', {
                  count: analytics.filteredEntries.length,
                })}
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-sm text-morandi-stone-600">
                {t('reports:practiceFrequency')}
              </div>
              <div className="text-2xl font-bold text-morandi-sage-600 mt-1">
                {analytics.summaryStats.practiceFrequency.toFixed(1)}x
              </div>
              <div className="text-xs text-morandi-stone-500 mt-1">
                {t('reports:perWeek')}
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-sm text-morandi-stone-600">
                {t('reports:consistencyScore')}
              </div>
              <div className="text-2xl font-bold text-morandi-rust-600 mt-1">
                {Math.round(analytics.summaryStats.consistencyScore)}%
              </div>
              <div className="text-xs text-morandi-stone-500 mt-1">
                {t('reports:last30Days')}
              </div>
            </Card>
          </div>
        </div>

        {/* Insights */}
        {analytics.insights && analytics.insights.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-morandi-stone-700 mb-3">
              {t('reports:insights')}
            </h3>
            <div className="space-y-2">
              {analytics.insights.map((insight, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{insight.icon}</div>
                    <div>
                      <div className="font-medium text-morandi-stone-700">
                        {insight.title}
                      </div>
                      <div className="text-sm text-morandi-stone-600 mt-1">
                        {insight.description}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
