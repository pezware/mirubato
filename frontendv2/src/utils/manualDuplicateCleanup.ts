/**
 * Manual duplicate cleanup utility for production use
 * This can be run once to clean up existing duplicates
 */

import { useLogbookStore } from '../stores/logbookStore'
import { toast } from './toastManager'
import type { DuplicateEntry } from './duplicateCleanup'

/**
 * Clean up duplicates and provide user feedback
 * This is a one-time operation for existing users
 */
export async function performManualDuplicateCleanup(): Promise<{
  success: boolean
  duplicatesRemoved: number
  message: string
}> {
  try {
    console.log('[ManualCleanup] Starting duplicate cleanup...')

    const logbookStore = useLogbookStore.getState()
    const result = await logbookStore.cleanupDuplicates()

    if (result.duplicatesRemoved === 0) {
      const message =
        'No duplicate entries found. Your logbook is already clean!'
      toast.success(message)
      return { success: true, duplicatesRemoved: 0, message }
    }

    const message = `Cleaned up ${result.duplicatesRemoved} duplicate entries from your logbook`
    toast.success(message)

    // Log detailed report for debugging
    console.log('[ManualCleanup] Cleanup completed:', {
      duplicatesRemoved: result.duplicatesRemoved,
      report: result.report,
    })

    return {
      success: true,
      duplicatesRemoved: result.duplicatesRemoved,
      message,
    }
  } catch (error) {
    const message = 'Failed to clean up duplicates. Please try again.'
    console.error('[ManualCleanup] Error during cleanup:', error)
    toast.error(message)

    return {
      success: false,
      duplicatesRemoved: 0,
      message,
    }
  }
}

/**
 * Get a report of potential duplicates without removing them
 */
export function getDuplicateAnalysis(): {
  hasDuplicates: boolean
  totalEntries: number
  duplicatesFound: number
  highConfidenceDuplicates: number
  report: {
    duplicates: DuplicateEntry[]
    summary: {
      totalEntries: number
      duplicatesFound: number
      highConfidence: number
      mediumConfidence: number
      lowConfidence: number
    }
  }
} {
  const logbookStore = useLogbookStore.getState()
  const report = logbookStore.getDuplicateReport()

  return {
    hasDuplicates: report.summary.duplicatesFound > 0,
    totalEntries: report.summary.totalEntries,
    duplicatesFound: report.summary.duplicatesFound,
    highConfidenceDuplicates: report.summary.highConfidence,
    report,
  }
}

/**
 * Browser console helper for manual duplicate analysis
 * Users can run this in the browser console to check for duplicates
 */
export function debugDuplicates() {
  const analysis = getDuplicateAnalysis()

  console.group('🔍 Mirubato Duplicate Analysis')
  console.log(`Total entries: ${analysis.totalEntries}`)
  console.log(`Duplicates found: ${analysis.duplicatesFound}`)
  console.log(
    `High confidence duplicates: ${analysis.highConfidenceDuplicates}`
  )

  if (analysis.hasDuplicates) {
    console.warn('⚠️ Duplicates detected in your logbook')
    console.log('Duplicate details:', analysis.report.duplicates)
    console.log('💡 Run cleanupDuplicates() to remove them')
  } else {
    console.log('✅ No duplicates found - your logbook is clean!')
  }

  console.groupEnd()

  return analysis
}

/**
 * Browser console helper for manual duplicate cleanup
 */
export async function cleanupDuplicates() {
  const confirmation = confirm(
    'This will remove duplicate entries from your logbook. This action cannot be undone. Continue?'
  )

  if (!confirmation) {
    console.log('Duplicate cleanup cancelled by user')
    return { success: false, cancelled: true }
  }

  const result = await performManualDuplicateCleanup()

  if (result.success) {
    console.log(`✅ ${result.message}`)
  } else {
    console.error(`❌ ${result.message}`)
  }

  return result
}

// Make functions available in global scope for console usage
if (typeof window !== 'undefined') {
  interface MirubutoWindow {
    mirubato?: {
      debugDuplicates: typeof debugDuplicates
      cleanupDuplicates: typeof cleanupDuplicates
      getDuplicateAnalysis: typeof getDuplicateAnalysis
    }
  }
  ;(window as MirubutoWindow).mirubato = {
    ...(window as MirubutoWindow).mirubato,
    debugDuplicates,
    cleanupDuplicates,
    getDuplicateAnalysis,
  }
}
