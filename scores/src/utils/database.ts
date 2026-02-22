import {
  Score,
  ScoreVersion,
  Collection,
  type StylePeriod,
  type ScoreSource,
  type ScoreFormat,
} from '../types/score'

/**
 * Database utility functions for common operations
 */

// D1 row type - all values come back as unknown from the database
type D1Row = Record<string, unknown>

export function parseScoreFromRow(row: D1Row): Score {
  return {
    id: row.id as string,
    title: row.title as string,
    composer: row.composer as string,
    opus: (row.opus as string) || undefined,
    movement: (row.movement as string) || undefined,
    instrument: row.instrument as Score['instrument'],
    difficulty: row.difficulty as Score['difficulty'],
    difficultyLevel: (row.difficulty_level as number) || undefined,
    gradeLevel: (row.grade_level as string) || undefined,
    durationSeconds: (row.duration_seconds as number) || undefined,
    timeSignature: (row.time_signature as string) || undefined,
    keySignature: (row.key_signature as string) || undefined,
    tempoMarking: (row.tempo_marking as string) || undefined,
    suggestedTempo: (row.suggested_tempo as number) || undefined,
    stylePeriod: (row.style_period as StylePeriod) || undefined,
    source: row.source as ScoreSource,
    imslpUrl: (row.imslp_url as string) || undefined,
    tags: row.tags ? JSON.parse(row.tags as string) : [],
    metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export function parseVersionFromRow(row: D1Row): ScoreVersion {
  return {
    id: row.id as string,
    scoreId: row.score_id as string,
    format: row.format as ScoreFormat,
    r2Key: row.r2_key as string,
    fileSizeBytes: (row.file_size_bytes as number) || undefined,
    pageCount: (row.page_count as number) || undefined,
    resolution: (row.resolution as string) || undefined,
    processingStatus: row.processing_status as ScoreVersion['processingStatus'],
    processingError: (row.processing_error as string) || undefined,
    createdAt: new Date(row.created_at as string),
  }
}

export function parseCollectionFromRow(row: D1Row): Collection {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    description: (row.description as string) || undefined,
    instrument: (row.instrument as Collection['instrument']) || undefined,
    difficulty: (row.difficulty as Collection['difficulty']) || undefined,
    scoreIds: row.score_ids ? JSON.parse(row.score_ids as string) : [],
    displayOrder: row.display_order as number,
    isFeatured: Boolean(row.is_featured),
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export function buildScoreUpdateQuery(updates: Partial<Score>): {
  query: string
  params: unknown[]
} {
  const fields: string[] = []
  const params: unknown[] = []

  const fieldMap: Record<string, string> = {
    title: 'title',
    composer: 'composer',
    opus: 'opus',
    movement: 'movement',
    instrument: 'instrument',
    difficulty: 'difficulty',
    difficultyLevel: 'difficulty_level',
    gradeLevel: 'grade_level',
    durationSeconds: 'duration_seconds',
    timeSignature: 'time_signature',
    keySignature: 'key_signature',
    tempoMarking: 'tempo_marking',
    suggestedTempo: 'suggested_tempo',
    stylePeriod: 'style_period',
    source: 'source',
    imslpUrl: 'imslp_url',
  }

  Object.entries(updates).forEach(([key, value]) => {
    if (key === 'tags' || key === 'metadata') {
      fields.push(`${key} = ?`)
      params.push(JSON.stringify(value))
    } else if (fieldMap[key]) {
      fields.push(`${fieldMap[key]} = ?`)
      params.push(value ?? null)
    }
  })

  return {
    query: fields.join(', '),
    params,
  }
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100) // Limit length
}

export async function checkScoreExists(
  db: D1Database,
  scoreId: string
): Promise<boolean> {
  const result = await db
    .prepare('SELECT 1 FROM scores WHERE id = ?')
    .bind(scoreId)
    .first()

  return result !== null
}

export async function checkScoresExist(
  db: D1Database,
  scoreIds: string[]
): Promise<boolean> {
  if (scoreIds.length === 0) return true

  const placeholders = scoreIds.map(() => '?').join(',')
  const query = `SELECT COUNT(*) as count FROM scores WHERE id IN (${placeholders})`
  const result = await db
    .prepare(query)
    .bind(...scoreIds)
    .first()

  return result?.count === scoreIds.length
}
