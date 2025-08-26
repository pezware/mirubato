import { LogbookEntry, DuplicateEntry, SyncData } from '../types/index.js'
import { logger } from '../utils/logger.js'
import chalk from 'chalk'

export class DuplicateDetector {
  /**
   * Generate a content signature for duplicate detection
   */
  private generateContentSignature(entry: LogbookEntry): string {
    const pieces = entry.pieces
      .map(
        p =>
          `${p.title?.toLowerCase().trim()}-${p.composer?.toLowerCase().trim() || ''}`
      )
      .sort()
      .join('|')

    const practiceDate = new Date(entry.timestamp)
    const dateKey = practiceDate.toISOString().split('T')[0]

    const typeKey = entry.type?.toLowerCase() || 'practice'
    const instrumentKey = entry.instrument?.toLowerCase() || 'unknown'

    // Round duration to nearest 5 minutes
    const durationKey = Math.round(entry.duration / 300) * 300

    return `${dateKey}_${durationKey}_${typeKey}_${instrumentKey}_${pieces}`
  }

  /**
   * Detect duplicates in logbook entries
   */
  detectDuplicates(entries: LogbookEntry[]): DuplicateEntry[] {
    const duplicates: DuplicateEntry[] = []
    const signatureMap = new Map<string, LogbookEntry>()
    const timeWindowMap = new Map<string, LogbookEntry>()

    logger.info(`Analyzing ${entries.length} entries for duplicates`)

    for (const entry of entries) {
      // Strategy 1: Exact content signature match
      const signature = this.generateContentSignature(entry)

      if (signatureMap.has(signature)) {
        const original = signatureMap.get(signature)!
        duplicates.push({
          id: `dup_${Date.now()}_${Math.random()}`,
          entry,
          duplicateOf: original.id,
          confidence: 0.95,
          reason: 'Identical content signature (same date, duration, pieces)',
        })
        logger.debug(`Found duplicate with signature: ${signature}`)
        continue
      }

      // Strategy 2: Near-identical timestamps (within 2 minutes)
      const timeWindow = Math.floor(
        new Date(entry.timestamp).getTime() / (2 * 60 * 1000)
      )
      const piecesKey = entry.pieces
        .map(p => `${p.title}-${p.composer}`)
        .sort()
        .join('|')
      const timeSignature = `${timeWindow}_${piecesKey}`

      if (timeWindowMap.has(timeSignature)) {
        const original = timeWindowMap.get(timeSignature)!
        const durationDiff = Math.abs(entry.duration - original.duration)

        if (durationDiff <= 30) {
          duplicates.push({
            id: `dup_${Date.now()}_${Math.random()}`,
            entry,
            duplicateOf: original.id,
            confidence: 0.85,
            reason: 'Near-identical timestamp and pieces (within 2 minutes)',
          })
          logger.debug(`Found time-window duplicate: ${timeSignature}`)
          continue
        }
      }

      // Strategy 3: Same scoreId with overlapping time
      if (entry.scoreId) {
        const sameDayEntries = entries.filter(e => {
          if (!e.scoreId || e.scoreId !== entry.scoreId || e.id === entry.id)
            return false
          const entryDate = new Date(e.timestamp).toDateString()
          const currentDate = new Date(entry.timestamp).toDateString()
          return entryDate === currentDate
        })

        for (const other of sameDayEntries) {
          const timeDiff = Math.abs(
            new Date(entry.timestamp).getTime() -
              new Date(other.timestamp).getTime()
          )

          // If entries are within 30 minutes and have similar duration
          if (timeDiff < 30 * 60 * 1000) {
            const durationDiff = Math.abs(entry.duration - other.duration)
            if (durationDiff <= 60) {
              duplicates.push({
                id: `dup_${Date.now()}_${Math.random()}`,
                entry,
                duplicateOf: other.id,
                confidence: 0.75,
                reason:
                  'Same score practiced within 30 minutes with similar duration',
              })
              logger.debug(`Found score-based duplicate: ${entry.scoreId}`)
              break
            }
          }
        }
      }

      // Add to maps for future comparison
      signatureMap.set(signature, entry)
      timeWindowMap.set(timeSignature, entry)
    }

    logger.info(`Found ${duplicates.length} potential duplicates`)
    return duplicates
  }

  /**
   * Detect duplicates in sync_data records
   */
  detectSyncDataDuplicates(records: SyncData[]): Array<{
    original: SyncData
    duplicates: SyncData[]
    confidence: number
    reason: string
  }> {
    const groups = new Map<string, SyncData[]>()
    const results: Array<{
      original: SyncData
      duplicates: SyncData[]
      confidence: number
      reason: string
    }> = []

    // Group by checksum
    for (const record of records) {
      const key = `${record.entity_type}_${record.checksum}`
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(record)
    }

    // Find groups with duplicates
    for (const [key, group] of groups) {
      if (group.length > 1) {
        // Sort by updated_at to determine original
        group.sort(
          (a, b) =>
            new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
        )

        const original = group[0]
        const duplicates = group.slice(1)

        results.push({
          original,
          duplicates,
          confidence: 1.0,
          reason: 'Identical checksum in sync_data',
        })

        logger.warn(
          `Found ${duplicates.length} duplicates for checksum: ${original.checksum}`
        )
      }
    }

    // Also check for entity_id duplicates
    const entityGroups = new Map<string, SyncData[]>()

    for (const record of records) {
      const key = `${record.entity_type}_${record.entity_id}`
      if (!entityGroups.has(key)) {
        entityGroups.set(key, [])
      }
      entityGroups.get(key)!.push(record)
    }

    for (const [key, group] of entityGroups) {
      if (group.length > 1) {
        // Check if these aren't already in checksum duplicates
        const checksums = new Set(group.map(r => r.checksum))
        if (checksums.size > 1) {
          // Different checksums but same entity_id - this is a problem
          group.sort(
            (a, b) =>
              new Date(a.updated_at).getTime() -
              new Date(b.updated_at).getTime()
          )

          const original = group[0]
          const duplicates = group.slice(1)

          results.push({
            original,
            duplicates,
            confidence: 0.9,
            reason: 'Same entity_id with different checksums',
          })

          logger.error(
            `Found conflicting records for entity_id: ${original.entity_id}`
          )
        }
      }
    }

    return results
  }

  /**
   * Generate a report of detected duplicates
   */
  generateReport(duplicates: DuplicateEntry[]): string {
    const highConfidence = duplicates.filter(d => d.confidence >= 0.9)
    const mediumConfidence = duplicates.filter(
      d => d.confidence >= 0.7 && d.confidence < 0.9
    )
    const lowConfidence = duplicates.filter(d => d.confidence < 0.7)

    const report: string[] = [
      chalk.bold('\n📊 Duplicate Detection Report'),
      '='.repeat(50),
      `Total duplicates found: ${chalk.yellow(duplicates.length)}`,
      '',
      chalk.bold('Confidence Breakdown:'),
      `  ${chalk.red('High')} (≥90%): ${highConfidence.length}`,
      `  ${chalk.yellow('Medium')} (70-89%): ${mediumConfidence.length}`,
      `  ${chalk.green('Low')} (<70%): ${lowConfidence.length}`,
      '',
    ]

    // Group by reason
    const byReason = new Map<string, number>()
    for (const dup of duplicates) {
      byReason.set(dup.reason, (byReason.get(dup.reason) || 0) + 1)
    }

    report.push(chalk.bold('Reasons for Duplicates:'))
    for (const [reason, count] of byReason) {
      report.push(`  • ${reason}: ${count}`)
    }

    // Add sample duplicates
    if (highConfidence.length > 0) {
      report.push('')
      report.push(chalk.bold('Sample High-Confidence Duplicates:'))

      for (const dup of highConfidence.slice(0, 3)) {
        const entry = dup.entry
        const pieces = entry.pieces.map(p => p.title).join(', ')
        const date = new Date(entry.timestamp).toLocaleString()

        report.push(`  Entry ID: ${entry.id}`)
        report.push(`    Duplicate of: ${dup.duplicateOf}`)
        report.push(`    Date: ${date}`)
        report.push(`    Pieces: ${pieces}`)
        report.push(`    Confidence: ${(dup.confidence * 100).toFixed(0)}%`)
        report.push('')
      }
    }

    return report.join('\n')
  }

  /**
   * Choose which entry to keep when merging duplicates
   */
  chooseBestEntry(
    original: LogbookEntry,
    duplicate: LogbookEntry
  ): LogbookEntry {
    let originalScore = 0
    let duplicateScore = 0

    // Score based on data completeness
    originalScore += original.pieces.length > 0 ? 2 : 0
    originalScore += original.duration > 0 ? 2 : 0
    originalScore += original.notes ? 1 : 0
    originalScore += original.mood ? 1 : 0
    originalScore += original.scoreId ? 1 : 0

    duplicateScore += duplicate.pieces.length > 0 ? 2 : 0
    duplicateScore += duplicate.duration > 0 ? 2 : 0
    duplicateScore += duplicate.notes ? 1 : 0
    duplicateScore += duplicate.mood ? 1 : 0
    duplicateScore += duplicate.scoreId ? 1 : 0

    // Prefer entry with more complete data
    if (originalScore !== duplicateScore) {
      return originalScore >= duplicateScore ? original : duplicate
    }

    // If equal, prefer more recent
    const originalTime = new Date(
      original.updatedAt || original.createdAt
    ).getTime()
    const duplicateTime = new Date(
      duplicate.updatedAt || duplicate.createdAt
    ).getTime()

    return duplicateTime > originalTime ? duplicate : original
  }
}
