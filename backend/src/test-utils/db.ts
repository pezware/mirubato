import type { D1Database } from '@cloudflare/workers-types'

// Mock D1 database for testing
export class MockD1Database implements Partial<D1Database> {
  private data: Map<string, any[]> = new Map()

  prepare(query: string) {
    const self = this
    let boundValues: any[] = []

    const statement = {
      bind(...values: any[]) {
        boundValues = values
        return statement
      },
      async first(colName?: string) {
        const tableName = self.extractTableName(query)
        const rows = self.data.get(tableName) || []

        // Handle aggregate queries
        if (
          query.toUpperCase().includes('COUNT(') ||
          query.toUpperCase().includes('SUM(') ||
          query.toUpperCase().includes('AVG(')
        ) {
          // Mock aggregate results for practice stats
          if (tableName === 'practice_sessions') {
            const userSessions = rows.filter((r: any) => {
              const whereMatch = query.match(/WHERE\s+user_id\s*=\s*\?/i)
              return whereMatch && boundValues[0]
                ? r.user_id === boundValues[0]
                : true
            })

            const totalSessions = userSessions.length
            const totalTime = userSessions.reduce(
              (sum: number, session: any) => {
                if (session.completed_at && session.started_at) {
                  const start = new Date(session.started_at).getTime()
                  const end = new Date(session.completed_at).getTime()
                  return sum + (end - start) / 1000 // Convert to seconds
                }
                return sum
              },
              0
            )

            const avgAccuracy =
              userSessions.reduce((sum: number, session: any) => {
                return sum + (session.accuracy_percentage || 0)
              }, 0) / (totalSessions || 1)

            return {
              total_sessions: totalSessions,
              total_time: totalTime,
              avg_accuracy: avgAccuracy,
            }
          }
        }

        const result = rows[0]
        return colName && result ? result[colName] : result
      },
      async all() {
        const tableName = self.extractTableName(query)
        let rows = self.data.get(tableName) || []

        // Handle WHERE clause filtering
        if (query.toUpperCase().includes('WHERE') && boundValues.length > 0) {
          const whereMatch = query.match(/WHERE\s+(\w+)\s*=\s*\?/i)
          if (whereMatch) {
            const field = whereMatch[1]
            rows = rows.filter((r: any) => r[field] === boundValues[0])
          }
        }

        // Handle SELECT DISTINCT
        if (query.toUpperCase().includes('SELECT DISTINCT')) {
          const distinctMatch = query.match(
            /SELECT\s+DISTINCT\s+([^F]+)\s+as\s+(\w+)/i
          )
          if (distinctMatch) {
            const dateField = distinctMatch[1].trim()
            const dateFieldClean = dateField.replace(/DATE\(|\)/g, '')

            // Extract unique dates
            const uniqueDates = new Set()
            rows.forEach((r: any) => {
              if (r[dateFieldClean]) {
                const date = r[dateFieldClean].split('T')[0]
                uniqueDates.add(date)
              }
            })

            rows = Array.from(uniqueDates).map(date => ({
              practice_date: date,
            }))
          }
        }

        // Handle ORDER BY
        if (query.toUpperCase().includes('ORDER BY')) {
          const orderMatch = query.match(
            /ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i
          )
          if (orderMatch) {
            const field = orderMatch[1]
            const direction = orderMatch[2]?.toUpperCase() || 'ASC'

            rows = [...rows].sort((a: any, b: any) => {
              const aVal = a[field]
              const bVal = b[field]
              if (direction === 'DESC') {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
              }
              return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
            })
          }
        }

        return {
          results: rows,
          success: true as const,
          meta: {
            duration: 0,
            size_after: 0,
            rows_read: rows.length,
            rows_written: 0,
            changed_db: false,
            last_row_id: 0,
            changes: 0,
          },
        }
      },
      async run() {
        // Handle UPDATE queries
        if (query.toUpperCase().includes('UPDATE')) {
          const tableName = self.extractTableName(query)
          const data = self.data.get(tableName) || []

          // Simple mock update - just update the first matching record
          if (data.length > 0 && boundValues.length > 0) {
            // Extract the ID from the values (it's usually the last parameter)
            const id = boundValues[boundValues.length - 1]
            const recordIndex = data.findIndex(
              (r: any) => r.id === id || r.user_id === id
            )

            if (recordIndex >= 0) {
              // Update fields based on the query
              if (query.includes('display_name')) {
                data[recordIndex].display_name = boundValues[0]
              }
              if (query.includes('primary_instrument')) {
                const instrumentIndex = query.includes('display_name') ? 1 : 0
                data[recordIndex].primary_instrument =
                  boundValues[instrumentIndex]
              }
              if (
                query.includes('preferences') &&
                tableName === 'user_preferences'
              ) {
                data[recordIndex].preferences = boundValues[0]
              }
              if (query.includes('updated_at')) {
                const updateIndex = boundValues.length - 2
                data[recordIndex].updated_at = boundValues[updateIndex]
              }
            }
          }
        }

        // Handle INSERT queries
        if (query.toUpperCase().includes('INSERT')) {
          const tableName = self.extractTableName(query)
          const existingData = self.data.get(tableName) || []

          // Create a new record from the values
          const columnMatch = query.match(/\(([^)]+)\)\s*VALUES/i)
          if (columnMatch) {
            const columns = columnMatch[1].split(',').map(c => c.trim())
            const newRecord: any = {}
            columns.forEach((col, index) => {
              newRecord[col] = boundValues[index]
            })
            self.data.set(tableName, [...existingData, newRecord])
          }
        }

        return {
          success: true as const,
          results: [],
          meta: {
            changes: 1,
            last_row_id: 1,
            duration: 0,
            size_after: 0,
            rows_read: 0,
            rows_written: 1,
            changed_db: false,
          },
        }
      },
      async raw() {
        const tableName = self.extractTableName(query)
        const rows = self.data.get(tableName) || []
        if (rows.length === 0) {
          return [[], []] as [string[], ...any[]]
        }
        const headers = Object.keys(rows[0])
        const values = rows.map(row => Object.values(row))
        return [headers, ...values] as [string[], ...any[]]
      },
    }

    return statement
  }

  batch(statements: any[]) {
    return Promise.all(statements.map(stmt => stmt.all()))
  }

  exec(_query: string) {
    return Promise.resolve({
      count: 0,
      duration: 0,
    })
  }

  // Helper methods for testing
  private extractTableName(query: string): string {
    // Handle SELECT/DELETE queries
    let match = query.match(/FROM\s+(\w+)/i)
    if (match) return match[1]

    // Handle UPDATE queries
    match = query.match(/UPDATE\s+(\w+)/i)
    if (match) return match[1]

    // Handle INSERT queries
    match = query.match(/INSERT\s+INTO\s+(\w+)/i)
    if (match) return match[1]

    return 'unknown'
  }

  setMockData(tableName: string, data: any[]) {
    this.data.set(tableName, data)
  }

  clearMockData() {
    this.data.clear()
  }
}

export function createMockDB(): D1Database {
  return new MockD1Database() as unknown as D1Database
}
