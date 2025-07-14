import React from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Button } from '@/components/ui'
import { DictionaryCategoriesProps, TermType } from '@/types/dictionary'

/**
 * Display dictionary categories for browsing
 */
const DictionaryCategories: React.FC<DictionaryCategoriesProps> = ({
  onCategorySelect,
}) => {
  const { t } = useTranslation(['toolbox'])

  // Define categories with icons and descriptions
  const categories: Array<{
    type: TermType
    icon: string
    description: string
  }> = [
    {
      type: 'tempo',
      icon: '🎵',
      description: t('toolbox:dictionary.categoryDescriptions.tempo'),
    },
    {
      type: 'dynamics',
      icon: '🔊',
      description: t('toolbox:dictionary.categoryDescriptions.dynamics'),
    },
    {
      type: 'articulation',
      icon: '🎼',
      description: t('toolbox:dictionary.categoryDescriptions.articulation'),
    },
    {
      type: 'form',
      icon: '🏗️',
      description: t('toolbox:dictionary.categoryDescriptions.form'),
    },
    {
      type: 'genre',
      icon: '🎭',
      description: t('toolbox:dictionary.categoryDescriptions.genre'),
    },
    {
      type: 'instrument',
      icon: '🎹',
      description: t('toolbox:dictionary.categoryDescriptions.instrument'),
    },
    {
      type: 'technique',
      icon: '🎸',
      description: t('toolbox:dictionary.categoryDescriptions.technique'),
    },
    {
      type: 'theory',
      icon: '📚',
      description: t('toolbox:dictionary.categoryDescriptions.theory'),
    },
    {
      type: 'composer',
      icon: '👨‍🎼',
      description: t('toolbox:dictionary.categoryDescriptions.composer'),
    },
    {
      type: 'period',
      icon: '🏰',
      description: t('toolbox:dictionary.categoryDescriptions.period'),
    },
    {
      type: 'notation',
      icon: '🎶',
      description: t('toolbox:dictionary.categoryDescriptions.notation'),
    },
    {
      type: 'general',
      icon: '📖',
      description: t('toolbox:dictionary.categoryDescriptions.general'),
    },
  ]

  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4 text-stone-800 flex items-center">
        <span className="mr-2">🗂️</span>
        {t('toolbox:dictionary.browseByCategory')}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {categories.map(category => (
          <Button
            key={category.type}
            variant="ghost"
            className="h-auto p-3 flex flex-col items-center text-center hover:bg-sage-50 hover:border-sage-200 border border-transparent transition-colors"
            onClick={() => onCategorySelect(category.type)}
          >
            <span className="text-2xl mb-1">{category.icon}</span>
            <span className="font-medium text-stone-800">
              {t(`toolbox:dictionary.types.${category.type}`)}
            </span>
            <span className="text-xs text-stone-600 mt-1">
              {category.description}
            </span>
          </Button>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-stone-200">
        <p className="text-sm text-stone-600 text-center">
          {t('toolbox:dictionary.categoryBrowseNote')}
        </p>
      </div>
    </Card>
  )
}

export default DictionaryCategories
