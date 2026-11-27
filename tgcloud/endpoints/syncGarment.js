import { EndpointError, db } from 'sdk';
import { and, eq } from 'sdk/db';
import { customGarments } from '../schema.js';
import { cleanUsername, getAccessContext } from '../lib/auth.js';

const VALID_CATS = new Set(['outerwear', 'top', 'bottom', 'dress', 'shoes', 'bag', 'accessory']);

export default async function (input, ctx) {
  const tgUser = ctx?.initData?.user;
  if (!tgUser) throw new EndpointError('Telegram foydalanuvchisi aniqlanmadi', { code: 'UNAUTH' });

  const access = await getAccessContext(tgUser);
  if (access.user?.isBlocked && !access.isOwner) {
    throw new EndpointError('Hisob cheklangan', { code: 'BLOCKED' });
  }

  const actorTag = cleanUsername(tgUser.username) || String(tgUser.id);
  const action = String(input?.action || 'save');

  if (action === 'delete') {
    const slug = String(input?.slug || '').trim();
    if (!slug) throw new EndpointError('Slug koʻrsatilmagan', { code: 'BAD_SLUG' });
    const whereClause = access.isOwner
      ? eq(customGarments.slug, slug)
      : and(eq(customGarments.slug, slug), eq(customGarments.addedByUsername, actorTag));
    await db.delete(customGarments).where(whereClause);
    return { deleted: true, slug };
  }

  const slug = String(input?.slug || `custom-${Date.now().toString(36)}`).slice(0, 80);
  const titleUz = String(input?.titleUz || 'Shaxsiy kiyim').slice(0, 90);
  const rawCat = String(input?.category || 'top').toLowerCase();
  const category = VALID_CATS.has(rawCat) ? rawCat : 'top';
  const colorHex = /^#[0-9a-fA-F]{6}$/.test(String(input?.colorHex || ''))
    ? String(input.colorHex).toUpperCase()
    : '#B98E5E';
  const palette = String(input?.palette || 'sand').slice(0, 32);
  const weather = String(input?.weather || 'cool').slice(0, 16);
  const occasion = String(input?.occasion || 'office').slice(0, 24);

  const [created] = await db
    .insert(customGarments)
    .values({
      slug,
      titleUz,
      category,
      colorHex,
      palette,
      weather,
      occasion,
      addedByUsername: actorTag,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: customGarments.slug,
      set: {
        titleUz,
        category,
        colorHex,
        palette,
        weather,
        occasion,
        isActive: true,
      },
    })
    .returning();

  return { garment: created };
}
