import { boolean, date, index, integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// user_id queda nullable y sin FK por ahora: se enlaza con la tabla de usuarios cuando se añada el auth.
export const links = pgTable('links', {
  id: uuid('id').primaryKey().defaultRandom(),
  url: text('url').notNull(),
  type: text('type'),
  genre: text('genre'),
  username: text('username'),
  title: text('title'),
  dateAdded: timestamp('date_added', { withTimezone: true }),
  userId: text('user_id'),
  isPublic: boolean('is_public').notNull().default(true),
}, (t) => [
  index('links_date_added_idx').on(t.dateAdded),
  index('links_user_id_idx').on(t.userId),
]);

export const combinations = pgTable('combinations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  userId: text('user_id'),
  isPublic: boolean('is_public').notNull().default(true),
}, (t) => [index('combinations_user_id_idx').on(t.userId)]);

export const combinationLinks = pgTable('combination_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  combinationId: uuid('combination_id').references(() => combinations.id, { onDelete: 'cascade' }),
  linkId: uuid('link_id').references(() => links.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('combination_links_combination_idx').on(t.combinationId),
  index('combination_links_link_idx').on(t.linkId),
]);
export * from './auth-schema';

// Contador diario de llamadas a APIs externas (YouTube Data API: 1 unidad de cuota por llamada)
export const apiUsage = pgTable('api_usage', {
  day: date('day').notNull(),
  service: text('service').notNull(),
  calls: integer('calls').notNull().default(0),
}, (t) => [primaryKey({ columns: [t.day, t.service] })]);
