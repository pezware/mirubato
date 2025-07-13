import { Hono } from 'hono'
import type { Env } from '../../types/env'
import { DictionaryDatabase } from '../../services/storage/dictionary-database'
import { createApiResponse } from '../../utils/errors'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

export const exportHandler = new Hono<{ Bindings: Env }>()

// Export query schema
const exportQuerySchema = z.object({
  format: z.enum(['json', 'csv', 'sqlite']).default('json'),
  min_quality: z.coerce.number().min(0).max(100).optional(),
  types: z.string().optional(), // comma-separated term types
  limit: z.coerce.number().min(1).max(10000).optional()
})

/**
 * Export dictionary data
 * GET /api/v1/export
 */
exportHandler.get('/', zValidator('query', exportQuerySchema), async (c) => {
  const { format, min_quality, types, limit } = c.req.valid('query')
  
  const db = new DictionaryDatabase(c.env.DB)
  
  // Parse types if provided
  const termTypes = types ? types.split(',').map(t => t.trim()) : undefined
  
  // Get filtered entries
  const entries = await db.exportEntries({
    minQuality: min_quality,
    types: termTypes,
    limit
  })

  // Handle different export formats
  switch (format) {
    case 'json':
      return c.json(createApiResponse({
        format: 'json',
        count: entries.length,
        data: entries,
        exported_at: new Date().toISOString()
      }))
    
    case 'csv':
      const csv = await generateCSV(entries)
      const csvBlob = new Blob([csv], { type: 'text/csv' })
      
      // Upload to R2 for download
      const exportId = `export_${Date.now()}_${crypto.randomUUID()}`
      const key = `exports/${exportId}.csv`
      
      await c.env.STORAGE.put(key, csvBlob, {
        httpMetadata: {
          contentType: 'text/csv',
          contentDisposition: `attachment; filename="mirubato-dictionary-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
      
      // Generate presigned URL (valid for 1 hour)
      const expiresIn = 3600
      const downloadUrl = `https://storage.mirubato.com/${key}?expires=${Date.now() + expiresIn * 1000}`
      
      return c.json(createApiResponse({
        export_id: exportId,
        format: 'csv',
        download_url: downloadUrl,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        size_bytes: csvBlob.size,
        entry_count: entries.length
      }))
    
    case 'sqlite':
      // Generate SQLite database file
      const sqliteData = await generateSQLite(entries)
      const sqliteBlob = new Blob([sqliteData], { type: 'application/x-sqlite3' })
      
      const sqliteExportId = `export_${Date.now()}_${crypto.randomUUID()}`
      const sqliteKey = `exports/${sqliteExportId}.db`
      
      await c.env.STORAGE.put(sqliteKey, sqliteBlob, {
        httpMetadata: {
          contentType: 'application/x-sqlite3',
          contentDisposition: `attachment; filename="mirubato-dictionary-${new Date().toISOString().split('T')[0]}.db"`
        }
      })
      
      const sqliteDownloadUrl = `https://storage.mirubato.com/${sqliteKey}?expires=${Date.now() + 3600 * 1000}`
      
      return c.json(createApiResponse({
        export_id: sqliteExportId,
        format: 'sqlite',
        download_url: sqliteDownloadUrl,
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        size_bytes: sqliteBlob.size,
        entry_count: entries.length
      }))
    
    default:
      return c.json(createApiResponse({
        error: 'Unsupported format'
      }), 400)
  }
})

/**
 * Get export status/download
 * GET /api/v1/export/:exportId
 */
exportHandler.get('/:exportId', async (c) => {
  const exportId = c.req.param('exportId')
  
  // Check if export exists in R2
  const formats = ['csv', 'db']
  let found = false
  let exportInfo: any = null
  
  for (const ext of formats) {
    const key = `exports/${exportId}.${ext}`
    try {
      const object = await c.env.STORAGE.head(key)
      if (object) {
        found = true
        const expiresIn = 3600 // 1 hour
        const downloadUrl = `https://storage.mirubato.com/${key}?expires=${Date.now() + expiresIn * 1000}`
        
        exportInfo = {
          export_id: exportId,
          status: 'ready',
          download_url: downloadUrl,
          expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
          size_bytes: object.size,
          format: ext === 'csv' ? 'csv' : 'sqlite',
          created_at: object.uploaded.toISOString()
        }
        break
      }
    } catch (error) {
      // Continue checking other formats
    }
  }
  
  if (!found) {
    return c.json(createApiResponse({
      error: 'Export not found'
    }), 404)
  }
  
  return c.json(createApiResponse(exportInfo))
})

/**
 * Generate CSV from dictionary entries
 */
async function generateCSV(entries: any[]): Promise<string> {
  const headers = [
    'ID',
    'Term',
    'Type',
    'Concise Definition',
    'Detailed Definition',
    'Etymology',
    'Pronunciation (IPA)',
    'Usage Example',
    'Wikipedia URL',
    'Quality Score',
    'Categories',
    'Related Terms',
    'Created At',
    'Updated At'
  ]
  
  const rows = entries.map(entry => [
    entry.id,
    entry.term,
    entry.type,
    escapeCSV(entry.definition.concise || ''),
    escapeCSV(entry.definition.detailed || ''),
    escapeCSV(entry.definition.etymology || ''),
    entry.definition.pronunciation?.ipa || '',
    escapeCSV(entry.definition.usage_example || ''),
    entry.references.wikipedia?.url || '',
    entry.quality_score.overall,
    (entry.metadata.categories || []).join('; '),
    (entry.metadata.related_terms || []).join('; '),
    entry.created_at,
    entry.updated_at
  ])
  
  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')
}

/**
 * Escape CSV values
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Generate SQLite database file
 */
async function generateSQLite(entries: any[]): Promise<ArrayBuffer> {
  // For a real implementation, you would use a SQLite library
  // This is a placeholder that creates a simple SQL dump
  const sqlStatements = [
    `CREATE TABLE IF NOT EXISTS dictionary_entries (
      id TEXT PRIMARY KEY,
      term TEXT NOT NULL,
      normalized_term TEXT NOT NULL,
      type TEXT NOT NULL,
      definition TEXT NOT NULL,
      references TEXT NOT NULL,
      metadata TEXT NOT NULL,
      quality_score TEXT NOT NULL,
      overall_score REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    );`,
    '',
    ...entries.map(entry => 
      `INSERT INTO dictionary_entries VALUES (
        '${entry.id}',
        '${escapeSQLString(entry.term)}',
        '${escapeSQLString(entry.normalized_term)}',
        '${entry.type}',
        '${escapeSQLString(JSON.stringify(entry.definition))}',
        '${escapeSQLString(JSON.stringify(entry.references))}',
        '${escapeSQLString(JSON.stringify(entry.metadata))}',
        '${escapeSQLString(JSON.stringify(entry.quality_score))}',
        ${entry.quality_score.overall},
        '${entry.created_at}',
        '${entry.updated_at}',
        ${entry.version}
      );`
    )
  ]
  
  const sqlDump = sqlStatements.join('\n')
  return new TextEncoder().encode(sqlDump)
}

/**
 * Escape SQL string values
 */
function escapeSQLString(value: string): string {
  return value.replace(/'/g, "''")
}