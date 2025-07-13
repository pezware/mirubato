import type { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, desc } from 'drizzle-orm'
import { items, type Item, type NewItem } from '../db/schema'
import { generateId } from '../utils/id'

/**
 * Example service showing common patterns
 */
export class ExampleService {
  private db: ReturnType<typeof drizzle>

  constructor(d1: D1Database) {
    this.db = drizzle(d1)
  }

  /**
   * Create a new item
   */
  async createItem(userId: string, data: Omit<NewItem, 'id' | 'userId'>): Promise<Item> {
    const newItem: NewItem = {
      ...data,
      id: generateId(),
      userId,
    }

    const [created] = await this.db.insert(items).values(newItem).returning()

    return created
  }

  /**
   * Get item by ID
   */
  async getItemById(id: string, userId?: string): Promise<Item | null> {
    const conditions = userId ? and(eq(items.id, id), eq(items.userId, userId)) : eq(items.id, id)

    const item = await this.db.select().from(items).where(conditions).limit(1)

    return item[0] || null
  }

  /**
   * List items with pagination
   */
  async listItems(
    userId: string,
    options: {
      page?: number
      limit?: number
      status?: string
    } = {}
  ): Promise<{ items: Item[]; total: number }> {
    const { page = 1, limit = 20, status } = options
    const offset = (page - 1) * limit

    // Build conditions
    const conditions = status
      ? and(eq(items.userId, userId), eq(items.status, status))
      : eq(items.userId, userId)

    // Get items
    const results = await this.db
      .select()
      .from(items)
      .where(conditions)
      .orderBy(desc(items.createdAt))
      .limit(limit)
      .offset(offset)

    // Get total count
    const countResult = await this.db
      .select({ count: sql`count(*)` })
      .from(items)
      .where(conditions)

    const total = Number(countResult[0]?.count || 0)

    return { items: results, total }
  }

  /**
   * Update item
   */
  async updateItem(
    id: string,
    userId: string,
    data: Partial<Omit<Item, 'id' | 'userId' | 'createdAt'>>
  ): Promise<Item | null> {
    const [updated] = await this.db
      .update(items)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(items.id, id), eq(items.userId, userId)))
      .returning()

    return updated || null
  }

  /**
   * Delete item
   */
  async deleteItem(id: string, userId: string): Promise<boolean> {
    const result = await this.db
      .delete(items)
      .where(and(eq(items.id, id), eq(items.userId, userId)))

    return result.meta.changes > 0
  }

  /**
   * Bulk operations example
   */
  async bulkUpdateStatus(userId: string, itemIds: string[], status: string): Promise<number> {
    const result = await this.db
      .update(items)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(items.userId, userId),
          sql`${items.id} IN (${itemIds.map(() => '?').join(', ')})`,
          ...itemIds
        )
      )

    return result.meta.changes
  }

  /**
   * Search items (example with full-text search)
   */
  async searchItems(userId: string, query: string, limit = 10): Promise<Item[]> {
    // Note: For better search, consider using FTS5 virtual tables
    const results = await this.db
      .select()
      .from(items)
      .where(
        and(
          eq(items.userId, userId),
          sql`(${items.name} LIKE '%' || ? || '%' OR ${items.description} LIKE '%' || ? || '%')`,
          query,
          query
        )
      )
      .limit(limit)

    return results
  }
}

// Import for sql template literal
import { sql } from 'drizzle-orm'
