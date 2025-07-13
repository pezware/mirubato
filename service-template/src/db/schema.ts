import { sql } from 'drizzle-orm'
import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core'

/**
 * Example: Items table
 * Replace with your own schema
 */
export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  metadata: text('metadata'), // JSON string
  status: text('status').notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

/**
 * Example: Categories table
 */
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  parentId: text('parent_id').references(() => categories.id),
  order: integer('order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

/**
 * Example: Item categories junction table
 */
export const itemCategories = sqliteTable('item_categories', {
  itemId: text('item_id')
    .notNull()
    .references(() => items.id, { onDelete: 'cascade' }),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

/**
 * Type exports for TypeScript
 */
export type Item = typeof items.$inferSelect
export type NewItem = typeof items.$inferInsert
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert

/**
 * Database indexes (add to migrations)
 */
// CREATE INDEX idx_items_user_id ON items(user_id);
// CREATE INDEX idx_items_status ON items(status);
// CREATE INDEX idx_items_created_at ON items(created_at);
// CREATE INDEX idx_categories_slug ON categories(slug);
// CREATE INDEX idx_item_categories_item ON item_categories(item_id);
// CREATE INDEX idx_item_categories_category ON item_categories(category_id);
