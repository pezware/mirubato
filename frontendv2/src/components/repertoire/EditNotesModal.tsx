import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { showToast } from '@/utils/toastManager'
import { Link, Plus, X } from 'lucide-react'

interface EditNotesModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (notes: string, links: string[]) => Promise<void>
  currentNotes?: string
  currentLinks?: string[]
  pieceTitle: string
}

export function EditNotesModal({
  isOpen,
  onClose,
  onSave,
  currentNotes = '',
  currentLinks = [],
  pieceTitle,
}: EditNotesModalProps) {
  const { t } = useTranslation(['repertoire', 'common'])
  const [notes, setNotes] = useState(currentNotes)
  const [links, setLinks] = useState<string[]>(currentLinks)
  const [newLink, setNewLink] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleAddLink = () => {
    if (newLink.trim()) {
      // Basic URL validation
      try {
        const url = new URL(newLink.trim())
        // Only allow http and https protocols for security
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          showToast(t('repertoire:invalidUrl'), 'error')
          return
        }
        setLinks([...links, newLink.trim()])
        setNewLink('')
      } catch {
        showToast(t('repertoire:invalidUrl'), 'error')
      }
    }
  }

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onSave(notes, links)
      onClose()
    } catch (error) {
      console.error('Error saving notes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('repertoire:editNotes')}
      size="lg"
    >
      <div className="space-y-4">
        <div className="text-sm text-stone-600">
          {t('repertoire:editingNotesFor', { piece: pieceTitle })}
        </div>

        {/* Personal Notes */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            {t('repertoire:personalNotes')}
          </label>
          <Textarea
            value={notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setNotes(e.target.value)
            }
            placeholder={t('repertoire:notesPlaceholder')}
            rows={6}
            className="w-full"
          />
          <p className="mt-1 text-xs text-stone-500">
            {t('repertoire:notesHelpText')}
          </p>
        </div>

        {/* Reference Links */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            {t('repertoire:referenceLinks')}
          </label>

          {/* Existing Links */}
          {links.length > 0 && (
            <div className="space-y-2 mb-3">
              {links.map((link, index) => (
                <Card key={index} variant="ghost" className="p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Link className="w-4 h-4 text-stone-500 flex-shrink-0" />
                      {/* Safe: URLs are validated in handleAddLink to only allow http/https protocols */}
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline truncate"
                      >
                        {link}
                      </a>
                    </div>
                    <button
                      onClick={() => handleRemoveLink(index)}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Add New Link */}
          <div className="flex gap-2">
            <Input
              type="url"
              value={newLink}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewLink(e.target.value)
              }
              placeholder={t('repertoire:linkPlaceholder')}
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) =>
                e.key === 'Enter' && handleAddLink()
              }
              className="flex-1"
            />
            <Button
              variant="secondary"
              onClick={handleAddLink}
              disabled={!newLink.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            {t('repertoire:linksHelpText')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>
            {t('common:cancel')}
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isLoading}>
            {t('common:save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
