import { Score, ScoreVersion, Collection } from '../types/score'

/**
 * Database utility functions for common operations
 */

export function parseScoreFromRow(row: any): Score {
  return {
    id: row.id,
    title: row.title,
    composer: row.composer,
    opus: row.opus || undefined,
    movement: row.movement || undefined,
    instrument: row.instrument,
    difficulty: row.difficulty,
    difficultyLevel: row.difficulty_level || undefined,
    gradeLevel: row.grade_level || undefined,
    durationSeconds: row.duration_seconds || undefined,
    timeSignature: row.time_signature || undefined,
    keySignature: row.key_signature || undefined,
    tempoMarking: row.tempo_marking || undefined,
    suggestedTempo: row.suggested_tempo || undefined,
    stylePeriod: row.style_period || undefined,
    source: row.source,
    imslpUrl: row.imslp_url || undefined,
    tags: row.tags ? JSON.parse(row.tags) : [],
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export function parseVersionFromRow(row: any): ScoreVersion {
  return {
    id: row.id,
    scoreId: row.score_id,
    format: row.format,
    r2Key: row.r2_key,
    fileSizeBytes: row.file_size_bytes || undefined,
    pageCount: row.page_count || undefined,
    resolution: row.resolution || undefined,
    processingStatus: row.processing_status,
    processingError: row.processing_error || undefined,
    createdAt: new Date(row.created_at),
  }
}

export function parseCollectionFromRow(row: any): Collection {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || undefined,
    instrument: row.instrument || undefined,
    difficulty: row.difficulty || undefined,
    scoreIds: row.score_ids ? JSON.parse(row.score_ids) : [],
    displayOrder: row.display_order,
    isFeatured: Boolean(row.is_featured),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export function buildScoreUpdateQuery(updates: Partial<Score>): {
  query: string
  params: any[]
} {
  const fields: string[] = []
  const params: any[] = []

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
