import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const BOTTLE_FORMATS = ['187ml', '375ml', '500ml', '750ml', '1L', '1.5L', '3L', '4.5L', '5L', '6L', '9L', '12L', '15L', '18L', 'other'] as const
export const PRIORITIES = ['low', 'medium', 'high'] as const
export const DRINKING_STATUSES = ['not_ready', 'ready', 'peak', 'past_peak', 'overdue', 'unknown'] as const

export type BottleFormat = typeof BOTTLE_FORMATS[number]
export type Priority = typeof PRIORITIES[number]
export type DrinkingStatus = typeof DRINKING_STATUSES[number]

export const users = sqliteTable('users', {
  id:            text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  username:      text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  last_seen:     integer('last_seen', { mode: 'timestamp' }),
  created_at:    integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export const wines = sqliteTable('wines', {
  id:                    text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id:               text('user_id').references(() => users.id),
  vintage:               integer('vintage'),
  non_vintage:           integer('non_vintage', { mode: 'boolean' }),
  winery:                text('winery').notNull(),
  wine_name:             text('wine_name').notNull(),
  varietal_blend:        text('varietal_blend'),
  country:               text('country'),
  region:                text('region'),
  format:                text('format').default('750ml'),
  quantity_added:        integer('quantity_added').notNull().default(1),
  quantity_remaining:    integer('quantity_remaining').notNull().default(1),
  cellar_section:        text('cellar_section'),
  drinking_window_start: integer('drinking_window_start'),
  drinking_window_end:   integer('drinking_window_end'),
  priority:              text('priority').default('medium'),
  price:                 real('price'),
  notes:                 text('notes'),
  why_interesting:       text('why_interesting'),
  ai_confidence:         text('ai_confidence', { mode: 'json' }).$type<Record<string, number>>(),
  last_verified:         integer('last_verified', { mode: 'timestamp' }),
  created_at:            integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updated_at:            integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (t) => ({
  cellarSectionIdx: index('wines_cellar_section_idx').on(t.cellar_section),
  vintageIdx: index('wines_vintage_idx').on(t.vintage),
  userIdx: index('wines_user_id_idx').on(t.user_id),
}))

export const drank_log = sqliteTable('drank_log', {
  id:         text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id:    text('user_id').references(() => users.id),
  wine_id:    text('wine_id').notNull().references(() => wines.id, { onDelete: 'cascade' }),
  date_drank: integer('date_drank', { mode: 'timestamp' }).notNull(),
  rating:     real('rating'),
  notes:      text('notes'),
  occasion:   text('occasion'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (t) => ({
  wineIdIdx: index('drank_log_wine_id_idx').on(t.wine_id),
}))

export const system_alerts = sqliteTable('system_alerts', {
  id:         text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  service:    text('service').notNull(), // 'anthropic' | 'vercel' | 'turso'
  message:    text('message').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  dismissed:  integer('dismissed', { mode: 'boolean' }).notNull().default(false),
})

export const collectionSummaries = sqliteTable('collection_summaries', {
  user_id:    text('user_id').primaryKey().references(() => users.id),
  summary:    text('summary').notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
  wine_count: integer('wine_count').notNull(),
})

export type Wine = typeof wines.$inferSelect
export type NewWine = typeof wines.$inferInsert
export type DrankLog = typeof drank_log.$inferSelect
export type NewDrankLog = typeof drank_log.$inferInsert
export type User = typeof users.$inferSelect
export type SystemAlert = typeof system_alerts.$inferSelect
export type CollectionSummary = typeof collectionSummaries.$inferSelect
