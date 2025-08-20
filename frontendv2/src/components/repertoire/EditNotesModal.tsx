import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enUS, es, fr, de, zhCN, zhTW } from 'date-fns/locale'
import { Modal } from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { showToast } from '@/utils/toastManager'
import { Link, Plus, X } from 'lucide-react'
import DOMPurify from 'dompurify'

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
  const { t, i18n } = useTranslation(['repertoire', 'common'])

  // Get date-fns locale based on current language
  const getDateLocale = () => {
    switch (i18n.language) {
      case 'es':
        return es
      case 'fr':
        return fr
      case 'de':
        return de
      case 'zh-CN':
        return zhCN
      case 'zh-TW':
        return zhTW
      default:
        return enUS
    }
  }

  // Extract user notes and status changes
  const { userNotes, statusChanges } = useMemo(() => {
    const statusChangeRegex =
      /\[STATUS_CHANGE:(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z):([^:]+):([^\]]+)\]/g
    const changes: Array<{
      timestamp: string
      oldStatus: string
      newStatus: string
    }> = []
    let userText = currentNotes
    let match

    // Extract all status changes
    while ((match = statusChangeRegex.exec(currentNotes)) !== null) {
      changes.push({
        timestamp: match[1],
        oldStatus: match[2],
        newStatus: match[3],
      })
    }

    // Remove status changes from the text to get only user notes
    userText = currentNotes.replace(statusChangeRegex, '').trim()

    return { userNotes: userText, statusChanges: changes }
  }, [currentNotes])

  const [notes, setNotes] = useState(userNotes)
  const [links, setLinks] = useState<string[]>(currentLinks)
  const [newLink, setNewLink] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [removedStatusChanges, setRemovedStatusChanges] = useState<number[]>([])

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
        // Sanitize the URL before storing
        const sanitizedUrl = DOMPurify.sanitize(newLink.trim())
        setLinks([...links, sanitizedUrl])
        setNewLink('')
      } catch {
        showToast(t('repertoire:invalidUrl'), 'error')
      }
    }
  }

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index))
  }

  const handleRemoveStatusChange = (index: number) => {
    setRemovedStatusChanges([...removedStatusChanges, index])
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Combine user notes with status changes
      let combinedNotes = notes.trim()

      // Filter out removed status changes
      const keptStatusChanges = statusChanges.filter(
        (_, index) => !removedStatusChanges.includes(index)
      )

      // If there are status changes to keep, append them back
      if (keptStatusChanges.length > 0) {
        // Add separator if there are user notes
        if (combinedNotes) {
          combinedNotes += '\n'
        }

        // Re-add only the status changes that weren't removed
        keptStatusChanges.forEach(change => {
          combinedNotes += `[STATUS_CHANGE:${change.timestamp}:${change.oldStatus}:${change.newStatus}]\n`
        })

        // Remove trailing newline
        combinedNotes = combinedNotes.trimEnd()
      }

      await onSave(combinedNotes, links)
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

        {/* Status Change History (with remove option) */}
        {statusChanges.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              {t('repertoire:statusHistory', 'Status History')}
              <span className="ml-2 text-xs text-stone-500 font-normal">
                {t('repertoire:clickToRemove', '(Click × to remove)')}
              </span>
            </label>
            <Card variant="ghost" className="p-3 bg-stone-50">
              <div className="space-y-2">
                {statusChanges.map((change, index) => {
                  // Skip if this status change was removed
                  if (removedStatusChanges.includes(index)) return null

                  const date = new Date(change.timestamp)
                  const formattedDate = format(date, 'MMM d, yyyy h:mm a', {
                    locale: getDateLocale(),
                  })
                  const oldStatusLabel = t(
                    `repertoire:status.${change.oldStatus}`,
                    change.oldStatus
                  )
                  const newStatusLabel = t(
                    `repertoire:status.${change.newStatus}`,
                    change.newStatus
                  )

                  return (
                    <div
                      key={index}
                      className="flex justify-between items-center group hover:bg-stone-100 px-2 py-1 rounded"
                    >
                      <span className="text-sm text-stone-600 italic">
                        [{formattedDate}]{' '}
                        {t('repertoire:status.statusChangeEntry', {
                          oldStatus: oldStatusLabel,
                          newStatus: newStatusLabel,
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveStatusChange(index)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-stone-200 rounded"
                        aria-label={t('common:remove')}
                      >
                        <X className="w-4 h-4 text-stone-500" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        )}

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
                      {/* Safe: URLs are validated and sanitized in handleAddLink */}
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
