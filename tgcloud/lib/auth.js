import { db } from 'sdk';
import { eq, or, sql } from 'sdk/db';
import { admins, auditLogs, botSettings, users } from '../schema.js';

export const OWNER_USERNAME = 'fayzbek1331';

export function cleanUsername(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/^@+/, '').toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function isOwnerUsername(username) {
  return cleanUsername(username) === OWNER_USERNAME;
}

export async function getSetting(key, fallback = '') {
  const row = await db.select().from(botSettings).where(eq(botSettings.key, key)).get();
  return row ? row.value : fallback;
}

export async function setSetting(key, value) {
  await db
    .insert(botSettings)
    .values({ key, value: String(value), updatedAt: new Date() })
    .onConflictDoUpdate({
      target: botSettings.key,
      set: { value: String(value), updatedAt: new Date() },
    });
}

export async function logAudit(actor, role, action, details = '') {
  try {
    await db.insert(auditLogs).values({
      actorTgId: actor.id,
      actorUsername: actor.username ? cleanUsername(actor.username) : null,
      actorRole: role,
      action,
      details: details ? String(details).slice(0, 400) : null,
    });
  } catch {
    // Audit logging never blocks bot interaction
  }
}

/**
 * Ensures Telegram user exists in SQLite and keeps @fayzbek1331 locked as 'owner'.
 */
export async function ensureUser(tgUser) {
  if (!tgUser || !tgUser.id) return null;
  const uname = cleanUsername(tgUser.username);
  const ownerFlag = isOwnerUsername(uname);

  const existing = await db.select().from(users).where(eq(users.tgId, tgUser.id)).get();
  const now = new Date();

  if (!existing) {
    const [inserted] = await db
      .insert(users)
      .values({
        tgId: tgUser.id,
        username: uname,
        firstName: tgUser.first_name || 'Foydalanuvchi',
        lastName: tgUser.last_name || null,
        role: ownerFlag ? 'owner' : 'user',
        isBlocked: false,
        lastActiveAt: now,
      })
      .returning();
    return inserted;
  }

  const nextRole = ownerFlag ? 'owner' : existing.role;
  const [updated] = await db
    .update(users)
    .set({
      username: uname ?? existing.username,
      firstName: tgUser.first_name || existing.firstName,
      lastName: tgUser.last_name || existing.lastName,
      role: nextRole,
      isBlocked: ownerFlag ? false : existing.isBlocked,
      lastActiveAt: now,
    })
    .where(eq(users.tgId, tgUser.id))
    .returning();

  return updated;
}

/**
 * Resolves effective role & granular permissions for a user.
 * Owner (@fayzbek1331) holds unrestricted privileges.
 * Admins hold ONLY the limited capabilities granted in the `admins` table.
 */
export async function getAccessContext(tgUser) {
  const userRow = await ensureUser(tgUser);
  if (!userRow) {
    return {
      user: null,
      role: 'user',
      isOwner: false,
      isAdmin: false,
      permissions: {
        canViewStats: false,
        canManageCatalog: false,
        canModerateUsers: false,
        canBroadcast: false,
        canEditSettings: false,
      },
    };
  }

  if (userRow.role === 'owner' || isOwnerUsername(userRow.username)) {
    return {
      user: userRow,
      role: 'owner',
      isOwner: true,
      isAdmin: true,
      permissions: {
        canViewStats: true,
        canManageCatalog: true,
        canModerateUsers: true,
        canBroadcast: true,
        canEditSettings: true,
      },
    };
  }

  // Match admin either by tgId or lowercase @username
  const adminCond = userRow.username
    ? or(eq(admins.tgId, userRow.tgId), eq(admins.username, userRow.username))
    : eq(admins.tgId, userRow.tgId);

  const adminRow = await db.select().from(admins).where(adminCond).get();

  if (adminRow) {
    // Bind tgId automatically if admin was pre-added by @username
    if (!adminRow.tgId || (userRow.username && adminRow.username !== userRow.username)) {
      await db
        .update(admins)
        .set({ tgId: userRow.tgId, username: userRow.username ?? adminRow.username })
        .where(eq(admins.id, adminRow.id));
    }
    if (userRow.role !== 'admin') {
      await db.update(users).set({ role: 'admin' }).where(eq(users.tgId, userRow.tgId));
    }

    return {
      user: { ...userRow, role: 'admin' },
      role: 'admin',
      isOwner: false,
      isAdmin: true,
      adminRecord: adminRow,
      permissions: {
        canViewStats: Boolean(adminRow.canViewStats),
        canManageCatalog: Boolean(adminRow.canManageCatalog),
        canModerateUsers: Boolean(adminRow.canModerateUsers),
        canBroadcast: Boolean(adminRow.canBroadcast),
        canEditSettings: Boolean(adminRow.canEditSettings),
      },
    };
  }

  // Demote stale 'admin' role if owner removed them from admins table
  if (userRow.role === 'admin') {
    await db.update(users).set({ role: 'user' }).where(eq(users.tgId, userRow.tgId));
  }

  return {
    user: userRow,
    role: 'user',
    isOwner: false,
    isAdmin: false,
    permissions: {
      canViewStats: false,
      canManageCatalog: false,
      canModerateUsers: false,
      canBroadcast: false,
      canEditSettings: false,
    },
  };
}

export async function addAdminByOwner(ownerTgUser, targetInput) {
  const raw = String(targetInput || '').trim();
  const isNumeric = /^\d+$/.test(raw);
  const tgId = isNumeric ? Number(raw) : null;
  const username = isNumeric ? null : cleanUsername(raw);

  if (!tgId && !username) {
    return { ok: false, message: 'Toʻgʻri @username yoki raqamli Telegram ID kiriting.' };
  }
  if (username === OWNER_USERNAME) {
    return { ok: false, message: '@fayzbek1331 allaqachon tizim egasi (Owner).' };
  }

  const existingUser = tgId
    ? await db.select().from(users).where(eq(users.tgId, tgId)).get()
    : await db.select().from(users).where(eq(users.username, username)).get();

  const resolvedTgId = tgId ?? existingUser?.tgId ?? null;
  const resolvedUsername = username ?? existingUser?.username ?? null;

  const existingAdmin = resolvedTgId
    ? await db.select().from(admins).where(eq(admins.tgId, resolvedTgId)).get()
    : await db.select().from(admins).where(eq(admins.username, resolvedUsername)).get();

  if (existingAdmin) {
    return {
      ok: false,
      message: `${resolvedUsername ? '@' + resolvedUsername : resolvedTgId} allaqachon admin roʻyxatida.`,
    };
  }

  // Admins start with minimal restricted permissions: stats + catalog only
  const [created] = await db
    .insert(admins)
    .values({
      tgId: resolvedTgId,
      username: resolvedUsername,
      addedByTgId: ownerTgUser.id,
      canViewStats: true,
      canManageCatalog: true,
      canModerateUsers: false,
      canBroadcast: false,
      canEditSettings: false,
    })
    .returning();

  if (resolvedTgId) {
    await db.update(users).set({ role: 'admin' }).where(eq(users.tgId, resolvedTgId));
  }

  await logAudit(
    ownerTgUser,
    'owner',
    'ADD_ADMIN',
    `Admin qoʻshildi: ${resolvedUsername ? '@' + resolvedUsername : resolvedTgId}`,
  );

  return { ok: true, admin: created };
}

export async function removeAdminByOwner(ownerTgUser, identifier) {
  const raw = String(identifier || '').trim();
  const isNumeric = /^\d+$/.test(raw);
  const target = isNumeric
    ? await db.select().from(admins).where(eq(admins.tgId, Number(raw))).get()
    : await db
        .select()
        .from(admins)
        .where(or(eq(admins.username, cleanUsername(raw)), eq(admins.id, Number(raw) || -1)))
        .get();

  if (!target) {
    return { ok: false, message: 'Bunday admin topilmadi.' };
  }

  await db.delete(admins).where(eq(admins.id, target.id));
  if (target.tgId) {
    await db.update(users).set({ role: 'user' }).where(eq(users.tgId, target.tgId));
  }

  await logAudit(
    ownerTgUser,
    'owner',
    'REMOVE_ADMIN',
    `Admin olib tashlandi: ${target.username ? '@' + target.username : target.tgId}`,
  );

  return { ok: true, removed: target };
}

export async function setUserStep(tgId, step, payload = null) {
  await db
    .update(users)
    .set({ stateStep: step, statePayload: payload })
    .where(eq(users.tgId, tgId));
}

export async function getSystemStats() {
  const totalUsers = await db.$count(users);
  const blockedUsers = await db.$count(users, eq(users.isBlocked, true));
  const totalAdmins = await db.$count(admins);
  const totalOutfits = await db.$count(savedOutfits);
  const totalCustomGarments = await db.$count(customGarments);
  const dayAgo = Math.floor(Date.now() / 1000) - 86400;
  const activeTodayRow = await db.get(
    sql`SELECT COUNT(*) as c FROM users WHERE last_active_at >= ${dayAgo}`,
  );
  return {
    totalUsers,
    blockedUsers,
    activeToday: activeTodayRow?.c ?? 0,
    totalAdmins,
    totalOutfits,
    totalCustomGarments,
  };
}
