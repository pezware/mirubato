/**
 * Debug version of search to troubleshoot empty results
 */
import { D1Database } from '@cloudflare/workers-types'

export async function debugSearch(db: D1Database, query: string) {
  console.warn('Debug search for:', query)

  // First, let's see all entries
  const allEntries = await db
    .prepare(
      'SELECT id, term, normalized_term, type, overall_score FROM dictionary_entries'
    )
    .all()
  console.warn('All entries in database:', allEntries.results)

  // Try exact normalized match
  const normalized = query.toLowerCase().trim()
  const exactMatch = await db
    .prepare(
      'SELECT id, term, normalized_term FROM dictionary_entries WHERE normalized_term = ?'
    )
    .bind(normalized)
    .all()
  console.warn('Exact normalized match:', exactMatch.results)

  // Try LIKE match
  const likeMatch = await db
    .prepare(
      'SELECT id, term, normalized_term FROM dictionary_entries WHERE normalized_term LIKE ?'
    )
    .bind(`%${normalized}%`)
    .all()
  console.warn('LIKE match:', likeMatch.results)

  // Try the original complex query
  const complexQuery = await db
    .prepare(
      `
      SELECT id, term, normalized_term 
      FROM dictionary_entries 
      WHERE (normalized_term LIKE ? OR term LIKE ?)
    `
    )
    .bind(`%${normalized}%`, `%${query}%`)
    .all()
  console.warn('Complex query match:', complexQuery.results)

  return {
    allEntries: allEntries.results,
    exactMatch: exactMatch.results,
    likeMatch: likeMatch.results,
    complexQuery: complexQuery.results,
  }
}
