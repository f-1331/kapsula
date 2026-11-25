import { EndpointError, db } from 'sdk';
import { desc } from 'sdk/db';
import { admins } from '../schema.js';
import {
  addAdminByOwner,
  getAccessContext,
  getSystemStats,
  removeAdminByOwner,
} from '../lib/auth.js';

export default async function (input, ctx) {
  const tgUser = ctx?.initData?.user;
  if (!tgUser) throw new EndpointError('Avtorizatsiya talab qilinadi', { code: 'UNAUTH' });

  const access = await getAccessContext(tgUser);
  const action = String(input?.action || '');

  if (action === 'stats') {
    if (!access.isOwner && !access.permissions.canViewStats) {
      throw new EndpointError('Statistika huquqi yoʻq', { code: 'FORBIDDEN' });
    }
    return { stats: await getSystemStats() };
  }

  if (action === 'list_admins') {
    if (!access.isOwner) throw new EndpointError('Faqat owner uchun', { code: 'OWNER_ONLY' });
    return { admins: await db.select().from(admins).orderBy(desc(admins.id)).all() };
  }

  if (action === 'add_admin') {
    if (!access.isOwner) throw new EndpointError('Faqat owner uchun', { code: 'OWNER_ONLY' });
    const res = await addAdminByOwner(tgUser, input?.target);
    if (!res.ok) throw new EndpointError(res.message, { code: 'ADMIN_ADD_ERROR' });
    return res;
  }

  if (action === 'remove_admin') {
    if (!access.isOwner) throw new EndpointError('Faqat owner uchun', { code: 'OWNER_ONLY' });
    const res = await removeAdminByOwner(tgUser, input?.target);
    if (!res.ok) throw new EndpointError(res.message, { code: 'ADMIN_REMOVE_ERROR' });
    return res;
  }

  throw new EndpointError('Nomaʼlum amal', { code: 'UNKNOWN_ACTION' });
}
