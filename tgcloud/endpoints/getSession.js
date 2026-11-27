import { db } from 'sdk';
import { desc, eq } from 'sdk/db';
import { customGarments, savedOutfits } from '../schema.js';
import { getAccessContext, getSystemStats } from '../lib/auth.js';

export default async function (_input, ctx) {
  const tgUser = ctx?.initData?.user;
  if (!tgUser) {
    return { role: 'guest', permissions: {}, outfits: [], customGarments: [] };
  }

  const access = await getAccessContext(tgUser);
  const outfits = await db
    .select()
    .from(savedOutfits)
    .where(eq(savedOutfits.userTgId, tgUser.id))
    .orderBy(desc(savedOutfits.id))
    .limit(24)
    .all();

  const garments = await db
    .select()
    .from(customGarments)
    .where(eq(customGarments.isActive, true))
    .orderBy(desc(customGarments.id))
    .limit(50)
    .all();

  const stats = access.isOwner || access.permissions.canViewStats ? await getSystemStats() : null;

  return {
    user: {
      tgId: access.user.tgId,
      username: access.user.username,
      firstName: access.user.firstName,
      city: access.user.city,
      country: access.user.country,
      latitude: access.user.latitude,
      longitude: access.user.longitude,
      genderPref: access.user.genderPref,
      lastView: access.user.lastView,
    },
    role: access.role,
    isOwner: access.isOwner,
    isAdmin: access.isAdmin,
    permissions: access.permissions,
    outfits,
    customGarments: garments,
    stats,
  };
}
