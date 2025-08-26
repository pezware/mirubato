import {
  LogbookEntry,
  RepertoireItem,
  ScoreIdMismatch,
} from '../types/index.js'
import { logger } from '../utils/logger.js'
import chalk from 'chalk'

export class ScoreIdDetector {
  private readonly LEGACY_DELIMITER = '-'
  private readonly NEW_DELIMITER = '||'

  /**
   * Normalize a piece title for score ID
   */
  private normalizePieceTitle(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/['']/g, "'")
      .replace(/[""]/g, '"')
      .replace(/[–—]/g, '-')
  }

  /**
   * Normalize a composer name for score ID
   */
  private normalizeComposer(composer: string): string {
    return composer
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/['']/g, "'")
      .replace(/\./g, '')
  }

  /**
   * Parse a score ID to extract title and composer
   */
  parseScoreId(scoreId: string): { title: string; composer: string } {
    const normalized = scoreId.toLowerCase().trim()

    // Try new format first
    if (normalized.includes(this.NEW_DELIMITER)) {
      const parts = normalized.split(this.NEW_DELIMITER)
      return {
        title: parts[0].trim(),
        composer: parts.slice(1).join(this.NEW_DELIMITER).trim(),
      }
    }

    // Fall back to legacy format
    if (normalized.includes(this.LEGACY_DELIMITER)) {
      const parts = normalized.split(this.LEGACY_DELIMITER)
      if (parts.length >= 2) {
        return {
          title: parts[0].trim(),
          composer: parts.slice(1).join(this.LEGACY_DELIMITER).trim(),
        }
      }
    }

    // No delimiter found
    return {
      title: normalized,
      composer: '',
    }
  }

  /**
   * Generate the correct score ID format
   */
  generateScoreId(title: string, composer?: string | null): string {
    const normalizedTitle = this.normalizePieceTitle(title)

    if (composer) {
      const normalizedComposer = this.normalizeComposer(composer)

      // Smart delimiter selection
      const needsSpecialDelimiter =
        normalizedTitle.includes('-') || normalizedComposer.includes('-')

      const delimiter = needsSpecialDelimiter
        ? this.NEW_DELIMITER
        : this.LEGACY_DELIMITER

      return `${normalizedTitle}${delimiter}${normalizedComposer}`
    }

    return normalizedTitle
  }

  /**
   * Detect score ID format mismatches
   */
  detectMismatches(
    entries: LogbookEntry[],
    repertoire: RepertoireItem[]
  ): ScoreIdMismatch[] {
    const mismatches: ScoreIdMismatch[] = []
    const scoreIdMap = new Map<
      string,
      {
        formats: Set<string>
        entries: string[]
        repertoire: string[]
      }
    >()

    logger.info('Detecting score ID format mismatches')

    // Analyze logbook entries
    for (const entry of entries) {
      if (entry.scoreId) {
        const parsed = this.parseScoreId(entry.scoreId)
        const canonicalId = this.generateScoreId(parsed.title, parsed.composer)

        if (!scoreIdMap.has(canonicalId)) {
          scoreIdMap.set(canonicalId, {
            formats: new Set(),
            entries: [],
            repertoire: [],
          })
        }

        const data = scoreIdMap.get(canonicalId)!
        data.formats.add(entry.scoreId)
        data.entries.push(entry.id)
      }

      // Also check pieces array
      for (const piece of entry.pieces) {
        if (piece.id) {
          const parsed = this.parseScoreId(piece.id)
          const canonicalId = this.generateScoreId(
            parsed.title,
            parsed.composer
          )

          if (!scoreIdMap.has(canonicalId)) {
            scoreIdMap.set(canonicalId, {
              formats: new Set(),
              entries: [],
              repertoire: [],
            })
          }

          const data = scoreIdMap.get(canonicalId)!
          data.formats.add(piece.id)
          data.entries.push(entry.id)
        }
      }
    }

    // Analyze repertoire items
    for (const item of repertoire) {
      const parsed = this.parseScoreId(item.scoreId)
      const canonicalId = this.generateScoreId(parsed.title, parsed.composer)

      if (!scoreIdMap.has(canonicalId)) {
        scoreIdMap.set(canonicalId, {
          formats: new Set(),
          entries: [],
          repertoire: [],
        })
      }

      const data = scoreIdMap.get(canonicalId)!
      data.formats.add(item.scoreId)
      data.repertoire.push(item.scoreId)
    }

    // Find mismatches (same piece with different formats)
    for (const [canonicalId, data] of scoreIdMap) {
      if (data.formats.size > 1) {
        const formats = Array.from(data.formats)
        const oldFormat = formats.find(
          f =>
            f.includes(this.LEGACY_DELIMITER) && !f.includes(this.NEW_DELIMITER)
        )
        const newFormat = formats.find(f => f.includes(this.NEW_DELIMITER))

        if (oldFormat && newFormat) {
          mismatches.push({
            oldId: oldFormat,
            newId: newFormat,
            affectedEntries: data.entries,
            affectedRepertoire: data.repertoire,
          })

          logger.warn(`Found format mismatch: "${oldFormat}" vs "${newFormat}"`)
        } else if (formats.length > 1) {
          // Multiple variations of the same format
          for (let i = 1; i < formats.length; i++) {
            mismatches.push({
              oldId: formats[i],
              newId: canonicalId,
              affectedEntries: data.entries,
              affectedRepertoire: data.repertoire,
            })

            logger.warn(
              `Found variation: "${formats[i]}" should be "${canonicalId}"`
            )
          }
        }
      }
    }

    logger.info(`Found ${mismatches.length} score ID mismatches`)
    return mismatches
  }

  /**
   * Check if two score IDs refer to the same piece
   */
  isSameScore(scoreId1: string, scoreId2: string): boolean {
    const normalized1 = scoreId1.toLowerCase().trim()
    const normalized2 = scoreId2.toLowerCase().trim()

    // Direct match
    if (normalized1 === normalized2) {
      return true
    }

    // Parse and compare
    const piece1 = this.parseScoreId(scoreId1)
    const piece2 = this.parseScoreId(scoreId2)

    // Check if they're the same piece
    if (piece1.title === piece2.title && piece1.composer === piece2.composer) {
      return true
    }

    // Check for reversed order (legacy support)
    if (piece1.title === piece2.composer && piece1.composer === piece2.title) {
      return true
    }

    return false
  }

  /**
   * Generate a report of score ID issues
   */
  generateReport(mismatches: ScoreIdMismatch[]): string {
    const report: string[] = [
      chalk.bold('\n🆔 Score ID Format Report'),
      '='.repeat(50),
      `Total mismatches found: ${chalk.yellow(mismatches.length)}`,
      '',
    ]

    // Count affected records
    const totalEntries = new Set(mismatches.flatMap(m => m.affectedEntries))
      .size
    const totalRepertoire = new Set(
      mismatches.flatMap(m => m.affectedRepertoire)
    ).size

    report.push(chalk.bold('Affected Records:'))
    report.push(`  Logbook entries: ${totalEntries}`)
    report.push(`  Repertoire items: ${totalRepertoire}`)
    report.push('')

    // Categorize mismatches
    const legacyToNew = mismatches.filter(
      m =>
        m.oldId.includes(this.LEGACY_DELIMITER) &&
        !m.oldId.includes(this.NEW_DELIMITER) &&
        m.newId.includes(this.NEW_DELIMITER)
    )

    const variations = mismatches.filter(m => !legacyToNew.includes(m))

    if (legacyToNew.length > 0) {
      report.push(chalk.bold('Legacy Format → New Format:'))
      for (const mismatch of legacyToNew.slice(0, 5)) {
        report.push(
          `  ${chalk.red(mismatch.oldId)} → ${chalk.green(mismatch.newId)}`
        )
        report.push(
          `    Affects ${mismatch.affectedEntries.length} entries, ${mismatch.affectedRepertoire.length} repertoire items`
        )
      }
      if (legacyToNew.length > 5) {
        report.push(`  ... and ${legacyToNew.length - 5} more`)
      }
      report.push('')
    }

    if (variations.length > 0) {
      report.push(chalk.bold('Format Variations:'))
      for (const mismatch of variations.slice(0, 5)) {
        report.push(
          `  ${chalk.yellow(mismatch.oldId)} → ${chalk.green(mismatch.newId)}`
        )
        report.push(
          `    Affects ${mismatch.affectedEntries.length} entries, ${mismatch.affectedRepertoire.length} repertoire items`
        )
      }
      if (variations.length > 5) {
        report.push(`  ... and ${variations.length - 5} more`)
      }
    }

    return report.join('\n')
  }

  /**
   * Detect pieces with dashes that might cause issues
   */
  detectProblematicTitles(
    entries: LogbookEntry[],
    repertoire: RepertoireItem[]
  ): Array<{
    title: string
    composer: string
    currentId: string
    suggestedId: string
    reason: string
  }> {
    const problematic: Array<{
      title: string
      composer: string
      currentId: string
      suggestedId: string
      reason: string
    }> = []

    const checkPiece = (
      title: string,
      composer: string | null | undefined,
      currentId: string
    ) => {
      if (title.includes('-') || (composer && composer.includes('-'))) {
        const suggestedId = this.generateScoreId(title, composer)

        if (currentId !== suggestedId) {
          problematic.push({
            title,
            composer: composer || '',
            currentId,
            suggestedId,
            reason: 'Title or composer contains dash, needs special delimiter',
          })
        }
      }
    }

    // Check logbook entries
    for (const entry of entries) {
      for (const piece of entry.pieces) {
        if (piece.id) {
          checkPiece(piece.title, piece.composer, piece.id)
        }
      }

      if (entry.scoreId && entry.scoreTitle) {
        checkPiece(entry.scoreTitle, entry.scoreComposer, entry.scoreId)
      }
    }

    // Check repertoire
    for (const item of repertoire) {
      checkPiece(item.title, item.composer, item.scoreId)
    }

    return problematic
  }
}
