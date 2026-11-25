import { getAccessContext, touchPresence } from '../lib/auth.js';

export default async function (input, ctx) {
  const tgUser = ctx?.initData?.user;
  if (!tgUser) {
    return { ok: false, role: 'guest' };
  }

  const access = await getAccessContext(tgUser);
  const view = typeof input?.view === 'string' ? input.view : undefined;
  const city = typeof input?.city === 'string' ? input.city : undefined;
  const gender = typeof input?.gender === 'string' ? input.gender : undefined;

  await touchPresence(tgUser.id, { view, city, gender });

  return {
    ok: true,
    role: access.role,
    city: city || access.user.city,
    lastView: view || access.user.lastView || 'cover',
    perms: access.permissions,
  };
}
