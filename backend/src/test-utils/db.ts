import type { D1Database } from '@cloudflare/workers-types'

// Mock D1 database for testing
export class MockD1Database implements Partial<D1Database> {
  private data: Map<string, any[]> = new Map()

  // Helper method for debugging
  getAllData(tableName: string) {
    return this.data.get(tableName) || []
  }

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
          // Handle equality comparison
          const whereMatch = query.match(/WHERE\s+(\w+)\s*=\s*\?/i)
          if (whereMatch) {
            const field = whereMatch[1]
            // For queries with ORDER BY LIMIT OFFSET, the first param is still the WHERE value
            rows = rows.filter((r: any) => r[field] === boundValues[0])
          }

          // Handle multiple conditions with AND
          const multiMatch = query.match(
            /WHERE\s+(\w+)\s*=\s*\?\s+AND\s+(\w+)\s*>\s*\?/i
          )
          if (multiMatch) {
            const field1 = multiMatch[1]
            const field2 = multiMatch[2]
            rows = rows.filter((r: any) => {
              const matches = r[field1] === boundValues[0]
              const afterDate = new Date(r[field2]) > new Date(boundValues[1])
              return matches && afterDate
            })
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

        // Handle LIMIT and OFFSET
        if (query.toUpperCase().includes('LIMIT')) {
          const limitMatch = query.match(/LIMIT\s+\?\s*(?:OFFSET\s+\?)?/i)
          if (limitMatch) {
            // Get limit and offset from the last bound values
            const limit = boundValues[boundValues.length - 2]
            const offset = boundValues[boundValues.length - 1]

            if (offset !== undefined) {
              rows = rows.slice(offset, offset + limit)
            } else {
              rows = rows.slice(0, limit)
            }
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
              // For goals table, handle the specific update pattern
              if (tableName === 'goals') {
                // The sync resolver binds values in this order for goals:
                // title, description, target_value, current_value, unit, deadline,
                // completed, completed_at, sync_version, checksum, id
                data[recordIndex].title = boundValues[0]
                data[recordIndex].description = boundValues[1]
                data[recordIndex].targetValue = data[recordIndex].target_value =
                  boundValues[2]
                data[recordIndex].currentValue = data[
                  recordIndex
                ].current_value = boundValues[3]
                data[recordIndex].unit = boundValues[4]
                data[recordIndex].deadline = boundValues[5]
                data[recordIndex].completed = boundValues[6]
                data[recordIndex].completedAt = boundValues[7]
                data[recordIndex].sync_version = boundValues[8]
                data[recordIndex].checksum = boundValues[9]
                data[recordIndex].updated_at = new Date().toISOString()
              } else {
                // Generic update handling for other tables
                const setMatch = query.match(/SET\s+(.+?)\s+WHERE/i)
                if (setMatch) {
                  const setPart = setMatch[1]
                  const fields = setPart.split(',').map(f => f.trim())

                  fields.forEach((field, index) => {
                    const fieldName = field.split('=')[0].trim()

                    // Skip fields that use SQL functions like CURRENT_TIMESTAMP
                    if (
                      !field.includes('CURRENT_TIMESTAMP') &&
                      field.includes('?')
                    ) {
                      data[recordIndex][fieldName] = boundValues[index]
                    }
                  })

                  // Always update the updated_at field
                  data[recordIndex].updated_at = new Date().toISOString()
                }
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

            // Handle INSERT OR REPLACE
            if (query.toUpperCase().includes('INSERT OR REPLACE')) {
              // Find existing record by id
              const idIndex = columns.indexOf('id')
              if (idIndex >= 0) {
                const id = boundValues[idIndex]
                const existingIndex = existingData.findIndex(
                  (r: any) => r.id === id
                )
                if (existingIndex >= 0) {
                  // Replace existing record
                  existingData[existingIndex] = newRecord
                  self.data.set(tableName, existingData)
                } else {
                  // Add new record
                  self.data.set(tableName, [...existingData, newRecord])
                }
              } else {
                // No id column, just add
                self.data.set(tableName, [...existingData, newRecord])
              }
            } else {
              // Regular INSERT
              self.data.set(tableName, [...existingData, newRecord])
            }
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

  getMockData(tableName: string): any[] | undefined {
    return this.data.get(tableName)
  }

  clearMockData() {
    this.data.clear()
  }
}

export function createMockDB(): D1Database {
  return new MockD1Database() as unknown as D1Database
}
