import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import { DictionaryCategoriesProps, TermType } from '@/types/dictionary'
import {
  Clock,
  Volume2,
  Music2,
  Layout,
  Theater,
  Piano,
  Guitar,
  BookOpen,
  User,
  Calendar,
  FileText,
  Book,
  FolderOpen,
} from 'lucide-react'

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
    icon: React.ReactNode
    description: string
  }> = [
    {
      type: 'tempo',
      icon: <Clock className="w-6 h-6" />,
      description: t('toolbox:dictionary.categoryDescriptions.tempo'),
    },
    {
      type: 'dynamics',
      icon: <Volume2 className="w-6 h-6" />,
      description: t('toolbox:dictionary.categoryDescriptions.dynamics'),
    },
    {
      type: 'articulation',
      icon: <Music2 className="w-6 h-6" />,
      description: t('toolbox:dictionary.categoryDescriptions.articulation'),
    },
    {
      type: 'form',
      icon: <Layout className="w-6 h-6" />,
      description: t('toolbox:dictionary.categoryDescriptions.form'),
    },
    {
      type: 'genre',
      icon: <Theater className="w-6 h-6" />,
      description: t('toolbox:dictionary.categoryDescriptions.genre'),
    },
    {
      type: 'instrument',
      icon: <Piano className="w-6 h-6" />,
      description: t('toolbox:dictionary.categoryDescriptions.instrument'),
    },
    {
      type: 'technique',
      icon: <Guitar className="w-6 h-6" />,
      description: t('toolbox:dictionary.categoryDescriptions.technique'),
    },
    {
      type: 'theory',
      icon: <BookOpen className="w-6 h-6" />,
      description: t('toolbox:dictionary.categoryDescriptions.theory'),
    },
    {
      type: 'composer',
      icon: <User className="w-6 h-6" />,
      description: t('toolbox:dictionary.categoryDescriptions.composer'),
    },
    {
      type: 'period',
      icon: <Calendar className="w-6 h-6" />,
      description: t('toolbox:dictionary.categoryDescriptions.period'),
    },
    {
      type: 'notation',
      icon: <FileText className="w-6 h-6" />,
      description: t('toolbox:dictionary.categoryDescriptions.notation'),
    },
    {
      type: 'general',
      icon: <Book className="w-6 h-6" />,
      description: t('toolbox:dictionary.categoryDescriptions.general'),
    },
  ]

  return (
    <div className="bg-white rounded-lg p-6 border-l-4 border-morandi-sage-300">
      <h3 className="text-lg font-semibold mb-4 text-stone-800 flex items-center">
        <FolderOpen className="w-5 h-5 mr-2 text-morandi-sage-500" />
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
            <div className="text-morandi-sage-500 mb-2">{category.icon}</div>
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
    </div>
  )
}

export default DictionaryCategories
