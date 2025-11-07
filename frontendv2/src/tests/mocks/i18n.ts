import type { ReactNode } from 'react'

/**
 * Mock for react-i18next that provides key-based translations
 * Used consistently across all component tests
 */
export const i18nMock = {
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      // Common translations
      if (key === 'common:previous') return 'Previous'
      if (key === 'common:next') return 'Next'
      if (key === 'common:save') return 'Save'
      if (key === 'common:cancel') return 'Cancel'
      if (key === 'common:delete') return 'Delete'
      if (key === 'common:edit') return 'Edit'
      if (key === 'common:create') return 'Create'
      if (key === 'common:close') return 'Close'
      if (key === 'common:loading') return 'Loading...'
      if (key === 'common:error') return 'Error'
      if (key === 'common:retry') return 'Retry'

      // Planning specific translations
      if (key === 'reports:planning.title') return 'Practice Planning'
      if (key === 'reports:planning.createPlan') return 'Create Practice Plan'
      if (key === 'reports:planning.editPlan') return 'Edit Practice Plan'
      if (key === 'reports:planning.deletePlan') return 'Delete Practice Plan'
      if (key === 'reports:planning.confirmDelete')
        return 'Are you sure you want to delete this plan?'
      if (key === 'reports:planning.emptyState.title')
        return 'No practice plans yet'
      if (key === 'reports:planning.emptyState.description')
        return 'Create your first practice plan to get started'
      if (key === 'reports:planning.emptyState.createButton')
        return 'Create Your First Plan'

      // Plan editor translations
      if (key === 'reports:planningEditor.title') return 'Practice Plan'
      if (key === 'reports:planningEditor.planTitle') return 'Plan Title'
      if (key === 'reports:planningEditor.planTitlePlaceholder')
        return 'Enter plan title'
      if (key === 'reports:planningEditor.description') return 'Description'
      if (key === 'reports:planningEditor.descriptionPlaceholder')
        return 'Describe your practice plan'
      if (key === 'reports:planningEditor.schedule') return 'Schedule'
      if (key === 'reports:planningEditor.startDate') return 'Start Date'
      if (key === 'reports:planningEditor.endDate') return 'End Date'
      if (key === 'reports:planningEditor.timeOfDay') return 'Time of Day'
      if (key === 'reports:planningEditor.duration') return 'Duration (minutes)'
      if (key === 'reports:planningEditor.flexibility') return 'Flexibility'
      if (key === 'reports:planningEditor.flexibility.fixed')
        return 'Fixed Time'
      if (key === 'reports:planningEditor.flexibility.sameDay')
        return 'Same Day'
      if (key === 'reports:planningEditor.flexibility.anytime') return 'Anytime'
      if (key === 'reports:planningEditor.segments') return 'Practice Segments'
      if (key === 'reports:planningEditor.addSegment') return 'Add Segment'
      if (key === 'reports:planningEditor.removeSegment')
        return 'Remove Segment'
      if (key === 'reports:planningEditor.segmentLabel') return 'Segment Name'
      if (key === 'reports:planningEditor.segmentDuration') return 'Duration'
      if (key === 'reports:planningEditor.segmentInstructions')
        return 'Instructions'
      if (key === 'reports:planningEditor.techniques') return 'Techniques'
      if (key === 'reports:planningEditor.reflectionPrompts')
        return 'Reflection Prompts'
      if (key === 'reports:planningEditor.addPrompt') return 'Add Prompt'
      if (key === 'reports:planningEditor.createPlan') return 'Create Plan'
      if (key === 'reports:planningEditor.updatePlan') return 'Update Plan'
      if (key === 'reports:planningEditor.cancel') return 'Cancel'
      if (key === 'reports:planningEditor.validation.titleRequired')
        return 'Title is required'
      if (key === 'reports:planningEditor.validation.segmentRequired')
        return 'At least one segment is required'
      if (key === 'reports:planningEditor.validation.invalidSchedule')
        return 'Invalid schedule'

      // Check-in modal translations
      if (key === 'reports:planningCheckIn.title')
        return 'Check in and log practice'
      if (key === 'reports:planningCheckIn.upcomingSession')
        return 'Next session details'
      if (key === 'reports:planningCheckIn.actualDuration')
        return 'Actual duration (minutes)'
      if (key === 'reports:planningCheckIn.notes') return 'Notes'
      if (key === 'reports:planningCheckIn.notesPlaceholder')
        return 'What stood out about this session?'
      if (key === 'reports:planningCheckIn.reflection') return 'Reflection'
      if (key === 'reports:planningCheckIn.noPrompts')
        return 'No prompts configured for this session.'
      if (key === 'reports:planningCheckIn.promptPlaceholder')
        return 'Add your thoughts here'
      if (key === 'reports:planningCheckIn.complete') return 'Check off'
      if (key === 'reports:planningCheckIn.cancel') return 'Cancel'
      if (key === 'reports:planningCheckIn.defaultNote')
        return 'Logged from practice plan'
      if (key === 'reports:planningCheckIn.genericError')
        return 'Unable to complete check-in'

      // Planning view translations
      if (key === 'reports:planningView.loading') return 'Loading plans...'
      if (key === 'reports:planningView.error') return 'Failed to load plans'
      if (key === 'reports:planningView.retry') return 'Retry'
      if (key === 'reports:planningView.emptyState.title') return 'No plans yet'
      if (key === 'reports:planningView.emptyState.description')
        return 'Start scheduling your practice sessions'
      if (key === 'reports:planningView.emptyState.createPlan')
        return 'Create Your First Plan'
      if (key === 'reports:planningView.heading') return 'Practice planning'
      if (key === 'reports:planningView.headingDescription')
        return 'Schedule upcoming sessions and track progress as you go.'
      if (key === 'reports:planningView.createPlan') return 'Create plan'
      if (key === 'reports:planningView.checkIn') return 'Check In'
      if (key === 'reports:planningView.editPlan') return 'Edit plan'
      if (key === 'reports:planningView.nextSession') return 'Next session'
      if (key === 'reports:planningView.noUpcoming')
        return 'No upcoming session'
      if (key === 'reports:planningView.durationLabel') return 'Duration'
      if (key === 'reports:planningView.flexibilityLabel') return 'Flexibility'
      if (key === 'reports:planningView.segmentsLabel') return 'Segments'
      if (key === 'reports:planningView.upcomingOccurrences')
        return 'Upcoming Sessions'
      if (key === 'reports:planningView.activePlans') return 'Active Plans'
      if (key === 'reports:planningView.completedOccurrences')
        return 'Completed Sessions'
      if (key === 'reports:planningView.occurrence.scheduled')
        return 'Scheduled'
      if (key === 'reports:planningView.occurrence.completed')
        return 'Completed'
      if (key === 'reports:planningView.occurrence.skipped') return 'Skipped'
      if (key === 'reports:planningView.occurrence.expired') return 'Expired'

      // Handle dynamic translations with options
      if (options?.count !== undefined) {
        if (key === 'reports:planning.plansCount') {
          return options.count === 1
            ? `${options.count} plan`
            : `${options.count} plans`
        }
        if (key === 'reports:planning.occurrencesCount') {
          return options.count === 1
            ? `${options.count} occurrence`
            : `${options.count} occurrences`
        }
        if (key === 'reports:planningView.segmentCount') {
          return options.count === 1
            ? `${options.count} segment`
            : `${options.count} segments`
        }
        if (key === 'reports:planningView.scheduledSessions') {
          return options.count === 1
            ? `${options.count} scheduled session`
            : `${options.count} scheduled sessions`
        }
      }

      // Default: return the key itself for unhandled translations
      return key
    },
    i18n: {
      changeLanguage: () => new Promise(() => {}),
      language: 'en',
    },
  }),
  Trans: ({ children }: { children: ReactNode }) => children,
  I18nextProvider: ({ children }: { children: ReactNode }) => children,
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}

export default i18nMock
