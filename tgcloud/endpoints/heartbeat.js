import { getAccessContext, touchPresence } from '../lib/auth.js';

export default async function (input, ctx) {
  const tgUser = ctx?.initData?.user;
  if (!tgUser) {
    return { ok: false, role: 'guest' };
  }

  const access = await getAccessContext(tgUser);
  const view = typeof input?.view === 'string' ? input.view : undefined;
  const city = typeof input?.city === 'string' ? input.city : undefined;
  const country = typeof input?.country === 'string' ? input.country : undefined;
  const latitude = typeof input?.latitude === 'number' ? input.latitude : undefined;
  const longitude = typeof input?.longitude === 'number' ? input.longitude : undefined;
  const tempC = typeof input?.tempC === 'number' ? input.tempC : undefined;
  const gender = typeof input?.gender === 'string' ? input.gender : undefined;

  await touchPresence(tgUser.id, {
    view,
    city,
    country,
    latitude,
    longitude,
    tempC,
    gender,
  });

  return {
    ok: true,
    role: access.role,
    city: city || access.user.city,
    country: country || access.user.country,
    latitude: latitude ?? access.user.latitude,
    longitude: longitude ?? access.user.longitude,
    genderPref: gender || access.user.genderPref || 'all',
    lastView: view || access.user.lastView || 'cover',
    perms: access.permissions,
  };
}
