import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const BOTTLE_FORMATS = ['375ml', '750ml', '1.5L', '3L', '6L', '9L', '12L', 'other'] as const
export const PRIORITIES = ['low', 'medium', 'high'] as const
export const DRINKING_STATUSES = ['not_ready', 'ready', 'peak', 'past_peak', 'overdue', 'unknown'] as const

export type BottleFormat = typeof BOTTLE_FORMATS[number]
export type Priority = typeof PRIORITIES[number]
export type DrinkingStatus = typeof DRINKING_STATUSES[number]

export const wines = sqliteTable('wines', {
  id:                    text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  vintage:               integer('vintage'),
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
  notes:                 text('notes'),
  why_interesting:       text('why_interesting'),
  ai_confidence:         text('ai_confidence', { mode: 'json' }).$type<Record<string, number>>(),
  last_verified:         integer('last_verified', { mode: 'timestamp' }),
  created_at:            integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updated_at:            integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export const drank_log = sqliteTable('drank_log', {
  id:         text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  wine_id:    text('wine_id').notNull().references(() => wines.id, { onDelete: 'cascade' }),
  date_drank: integer('date_drank', { mode: 'timestamp' }).notNull(),
  rating:     real('rating'),
  notes:      text('notes'),
  occasion:   text('occasion'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export type Wine = typeof wines.$inferSelect
export type NewWine = typeof wines.$inferInsert
export type DrankLog = typeof drank_log.$inferSelect
export type NewDrankLog = typeof drank_log.$inferInsert
