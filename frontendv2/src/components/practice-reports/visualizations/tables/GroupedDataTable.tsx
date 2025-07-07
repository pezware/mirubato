import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronRight,
  ChevronDown,
  Download,
  Maximize2,
  Filter,
} from 'lucide-react'
import { Card } from '../../../ui/Card'
import Button from '../../../ui/Button'
import { GroupedData } from '../../../../types/reporting'
import { LogbookEntry } from '../../../../api/logbook'
import { format } from 'date-fns'

interface GroupedDataTableProps {
  data: GroupedData[]
  showAggregates?: boolean
  onEntryClick?: (entry: LogbookEntry) => void
  onExport?: () => void
  className?: string
}

export function GroupedDataTable({
  data,
  showAggregates = true,
  onEntryClick,
  onExport,
  className,
}: GroupedDataTableProps) {
  const { t } = useTranslation(['reports'])
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey)
    } else {
      newExpanded.add(groupKey)
    }
    setExpandedGroups(newExpanded)
  }

  const toggleEntry = (entryId: string) => {
    const newExpanded = new Set(expandedEntries)
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId)
    } else {
      newExpanded.add(entryId)
    }
    setExpandedEntries(newExpanded)
  }

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)

    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  return (
    <Card className={className}>
      <div className="p-4 border-b border-morandi-stone-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-morandi-stone-800">
            {t('reports:table.title')}
          </h3>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Expand all groups
                const allKeys = new Set<string>()
                const collectKeys = (groups: GroupedData[]) => {
                  groups.forEach(g => {
                    allKeys.add(g.key)
                    if (g.children) collectKeys(g.children)
                  })
                }
                collectKeys(data)
                setExpandedGroups(allKeys)
              }}
            >
              {t('reports:table.expandAll')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedGroups(new Set())}
            >
              {t('reports:table.collapseAll')}
            </Button>
            {onExport && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onExport}
                leftIcon={<Download className="w-4 h-4" />}
              >
                {t('reports:table.export')}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-morandi-stone-50">
            <tr>
              <th className="text-left p-3 font-medium text-morandi-stone-700">
                {t('reports:table.group')}
              </th>
              <th className="text-right p-3 font-medium text-morandi-stone-700">
                {t('reports:table.sessions')}
              </th>
              <th className="text-right p-3 font-medium text-morandi-stone-700">
                {t('reports:table.totalTime')}
              </th>
              <th className="text-right p-3 font-medium text-morandi-stone-700">
                {t('reports:table.avgTime')}
              </th>
              {showAggregates && (
                <>
                  <th className="text-right p-3 font-medium text-morandi-stone-700">
                    {t('reports:table.pieces')}
                  </th>
                  <th className="text-right p-3 font-medium text-morandi-stone-700">
                    {t('reports:table.composers')}
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map(group => (
              <GroupRow
                key={group.key}
                group={group}
                level={0}
                expanded={expandedGroups.has(group.key)}
                expandedEntries={expandedEntries}
                showAggregates={showAggregates}
                onToggle={() => toggleGroup(group.key)}
                onToggleEntry={toggleEntry}
                onEntryClick={onEntryClick}
                formatDuration={formatDuration}
              />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

interface GroupRowProps {
  group: GroupedData
  level: number
  expanded: boolean
  expandedEntries: Set<string>
  showAggregates: boolean
  onToggle: () => void
  onToggleEntry: (id: string) => void
  onEntryClick?: (entry: LogbookEntry) => void
  formatDuration: (minutes: number) => string
}

function GroupRow({
  group,
  level,
  expanded,
  expandedEntries,
  showAggregates,
  onToggle,
  onToggleEntry,
  onEntryClick,
  formatDuration,
}: GroupRowProps) {
  const { t } = useTranslation(['reports'])
  const hasChildren = group.children && group.children.length > 0
  const indent = level * 24

  return (
    <>
      <tr
        className={`
          border-b border-morandi-stone-100 hover:bg-morandi-stone-50 transition-colors
          ${level === 0 ? 'font-medium' : ''}
        `}
      >
        <td className="p-3">
          <div
            className="flex items-center"
            style={{ paddingLeft: `${indent}px` }}
          >
            {(hasChildren || group.entries.length > 0) && (
              <button
                onClick={onToggle}
                className="p-1 hover:bg-morandi-stone-200 rounded transition-colors"
              >
                {expanded ? (
                  <ChevronDown className="w-4 h-4 text-morandi-stone-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-morandi-stone-600" />
                )}
              </button>
            )}
            <span className="ml-2">{group.label}</span>
          </div>
        </td>
        <td className="p-3 text-right text-morandi-stone-700">{group.count}</td>
        <td className="p-3 text-right text-morandi-stone-700">
          {formatDuration(group.totalDuration)}
        </td>
        <td className="p-3 text-right text-morandi-stone-700">
          {formatDuration(group.avgDuration)}
        </td>
        {showAggregates && (
          <>
            <td className="p-3 text-right text-morandi-stone-700">
              {group.aggregates.uniquePieces}
            </td>
            <td className="p-3 text-right text-morandi-stone-700">
              {group.aggregates.uniqueComposers}
            </td>
          </>
        )}
      </tr>

      {expanded && hasChildren && (
        <>
          {group.children!.map(child => (
            <GroupRow
              key={child.key}
              group={child}
              level={level + 1}
              expanded={expandedEntries.has(child.key)}
              expandedEntries={expandedEntries}
              showAggregates={showAggregates}
              onToggle={() => onToggleEntry(child.key)}
              onToggleEntry={onToggleEntry}
              onEntryClick={onEntryClick}
              formatDuration={formatDuration}
            />
          ))}
        </>
      )}

      {expanded && !hasChildren && group.entries.length > 0 && (
        <>
          {group.entries.map(entry => (
            <EntryRow
              key={entry.id}
              entry={entry}
              level={level + 1}
              expanded={expandedEntries.has(entry.id)}
              onToggle={() => onToggleEntry(entry.id)}
              onClick={() => onEntryClick?.(entry)}
              formatDuration={formatDuration}
            />
          ))}
        </>
      )}
    </>
  )
}

interface EntryRowProps {
  entry: LogbookEntry
  level: number
  expanded: boolean
  onToggle: () => void
  onClick?: () => void
  formatDuration: (minutes: number) => string
}

function EntryRow({
  entry,
  level,
  expanded,
  onToggle,
  onClick,
  formatDuration,
}: EntryRowProps) {
  const indent = level * 24

  return (
    <>
      <tr
        className="border-b border-morandi-stone-50 hover:bg-morandi-stone-50 transition-colors cursor-pointer text-sm"
        onClick={onClick}
      >
        <td className="p-2" colSpan={6}>
          <div
            className="flex items-start"
            style={{ paddingLeft: `${indent}px` }}
          >
            <button
              onClick={e => {
                e.stopPropagation()
                onToggle()
              }}
              className="p-1 hover:bg-morandi-stone-200 rounded transition-colors mt-0.5"
            >
              {expanded ? (
                <ChevronDown className="w-3 h-3 text-morandi-stone-600" />
              ) : (
                <ChevronRight className="w-3 h-3 text-morandi-stone-600" />
              )}
            </button>
            <div className="ml-2 flex-1">
              <div className="flex items-center gap-3">
                <span className="text-morandi-stone-700">
                  {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}
                </span>
                <span className="text-morandi-stone-500">•</span>
                <span className="text-morandi-stone-700">
                  {formatDuration(entry.duration)}
                </span>
                <span className="text-morandi-stone-500">•</span>
                <span className="text-morandi-stone-700">{entry.type}</span>
                {entry.mood && (
                  <>
                    <span className="text-morandi-stone-500">•</span>
                    <span className="text-base">
                      {entry.mood === 'FRUSTRATED'
                        ? '😣'
                        : entry.mood === 'NEUTRAL'
                          ? '😐'
                          : entry.mood === 'SATISFIED'
                            ? '😊'
                            : entry.mood === 'EXCITED'
                              ? '🤩'
                              : ''}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-morandi-stone-50">
          <td className="p-3" colSpan={6}>
            <div style={{ paddingLeft: `${indent + 24}px` }}>
              {entry.pieces.length > 0 && (
                <div className="mb-2">
                  <span className="text-sm font-medium text-morandi-stone-700">
                    Pieces:
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {entry.pieces.map((piece, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-morandi-sky-100 text-morandi-stone-700 rounded-full text-xs"
                      >
                        {piece.title}
                        {piece.composer && ` - ${piece.composer}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {entry.techniques.length > 0 && (
                <div className="mb-2">
                  <span className="text-sm font-medium text-morandi-stone-700">
                    Techniques:
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {entry.techniques.map((technique, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-morandi-peach-100 text-morandi-stone-700 rounded-full text-xs"
                      >
                        {technique}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {entry.notes && (
                <div>
                  <span className="text-sm font-medium text-morandi-stone-700">
                    Notes:
                  </span>
                  <p className="mt-1 text-sm text-morandi-stone-600">
                    {entry.notes}
                  </p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
