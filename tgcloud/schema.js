import { table, integer, text, real, boolean, json, index, sql } from 'sdk/db';

export const users = table(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tgId: integer('tg_id').notNull().unique(),
    username: text('username'),
    firstName: text('first_name').notNull().default('Foydalanuvchi'),
    lastName: text('last_name'),
    role: text('role').notNull().default('user'), // 'owner' | 'admin' | 'user'
    isBlocked: boolean('is_blocked').notNull().default(false),
    city: text('city').notNull().default('Toshkent'),
    country: text('country').notNull().default('Oʻzbekiston'),
    latitude: real('latitude').notNull().default(41.2995),
    longitude: real('longitude').notNull().default(69.2401),
    lastTempC: integer('last_temp_c'),
    genderPref: text('gender_pref').notNull().default('all'),
    stateStep: text('state_step'),
    statePayload: json('state_payload'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
    lastActiveAt: integer('last_active_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  },
  (t) => ({
    usernameIdx: index('idx_users_username').on(t.username),
    roleIdx: index('idx_users_role').on(t.role),
  }),
);

export const admins = table(
  'admins',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tgId: integer('tg_id'),
    username: text('username'),
    addedByTgId: integer('added_by_tg_id').notNull(),
    canViewStats: boolean('can_view_stats').notNull().default(true),
    canManageCatalog: boolean('can_manage_catalog').notNull().default(true),
    canModerateUsers: boolean('can_moderate_users').notNull().default(false),
    canBroadcast: boolean('can_broadcast').notNull().default(false),
    canEditSettings: boolean('can_edit_settings').notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  },
  (t) => ({
    adminTgIdx: index('idx_admins_tg_id').on(t.tgId),
    adminUsernameIdx: index('idx_admins_username').on(t.username),
  }),
);

export const savedOutfits = table(
  'saved_outfits',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userTgId: integer('user_tg_id').notNull(),
    title: text('title').notNull(),
    items: json('items').notNull(),
    score: integer('score').notNull().default(85),
    weather: text('weather').notNull().default('cool'),
    occasion: text('occasion').notNull().default('office'),
    palette: text('palette').notNull().default('any'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  },
  (t) => ({
    outfitUserIdx: index('idx_saved_outfits_user').on(t.userTgId),
  }),
);

export const customGarments = table('custom_garments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  titleUz: text('title_uz').notNull(),
  category: text('category').notNull(),
  colorHex: text('color_hex').notNull(),
  palette: text('palette').notNull().default('sand'),
  weather: text('weather').notNull().default('cool'),
  occasion: text('occasion').notNull().default('office'),
  addedByUsername: text('added_by_username'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const botSettings = table('bot_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const auditLogs = table(
  'audit_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    actorTgId: integer('actor_tg_id').notNull(),
    actorUsername: text('actor_username'),
    actorRole: text('actor_role').notNull(),
    action: text('action').notNull(),
    details: text('details'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  },
  (t) => ({
    auditActorIdx: index('idx_audit_actor').on(t.actorTgId),
  }),
);
