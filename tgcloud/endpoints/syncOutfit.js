import { EndpointError, db } from 'sdk';
import { and, eq } from 'sdk/db';
import { savedOutfits } from '../schema.js';
import { getAccessContext } from '../lib/auth.js';

export default async function (input, ctx) {
  const tgUser = ctx?.initData?.user;
  if (!tgUser) throw new EndpointError('Telegram foydalanuvchisi aniqlanmadi', { code: 'UNAUTH' });

  const access = await getAccessContext(tgUser);
  if (access.user?.isBlocked && !access.isOwner) {
    throw new EndpointError('Hisob cheklangan', { code: 'BLOCKED' });
  }

  const action = input?.action || 'save';

  if (action === 'delete') {
    const id = Number(input?.id);
    if (!Number.isFinite(id)) throw new EndpointError('Notoʻgʻri ID', { code: 'BAD_ID' });
    await db
      .delete(savedOutfits)
      .where(and(eq(savedOutfits.id, id), eq(savedOutfits.userTgId, tgUser.id)));
    return { deleted: true, id };
  }

  const items = Array.isArray(input?.items) ? input.items.slice(0, 10) : [];
  if (items.length === 0) {
    throw new EndpointError('Kiyimlar roʻyxati boʻsh', { code: 'EMPTY_ITEMS' });
  }

  const [created] = await db
    .insert(savedOutfits)
    .values({
      userTgId: tgUser.id,
      title: String(input?.title || 'Kapsula obrazi').slice(0, 80),
      items,
      score: Math.max(0, Math.min(100, Number(input?.score) || 85)),
      weather: String(input?.weather || 'cool'),
      occasion: String(input?.occasion || 'office'),
      palette: String(input?.palette || 'any'),
    })
    .returning();

  return { outfit: created };
}
