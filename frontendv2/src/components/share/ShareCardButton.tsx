import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Share2 } from 'lucide-react'
import { ShareCardModal } from './ShareCardModal'

interface ShareCardButtonProps {
  isCollapsed?: boolean
  className?: string
}

export function ShareCardButton({
  isCollapsed = false,
  className = '',
}: ShareCardButtonProps) {
  const { t } = useTranslation(['share'])
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`
          w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} ${
            isCollapsed ? 'px-2 py-2.5' : 'px-3 py-2.5'
          } rounded-lg text-sm font-medium transition-all
          text-morandi-sage-600 hover:bg-morandi-sage-50 hover:text-morandi-sage-700
          ${className}
        `}
        title={isCollapsed ? t('share:shareToday', 'Share Today') : undefined}
      >
        <Share2 className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
        {!isCollapsed && t('share:shareToday', 'Share Today')}
      </button>

      <ShareCardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
