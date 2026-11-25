import { api, db } from 'sdk';
import { desc, eq } from 'sdk/db';
import { admins, auditLogs, customGarments, users } from '../schema.js';
import {
  getAccessContext,
  getSetting,
  getSystemStats,
  logAudit,
  removeAdminByOwner,
  setSetting,
  setUserStep,
} from '../lib/auth.js';
import {
  buildAdminKeyboard,
  buildMainMenu,
  buildOwnerKeyboard,
  getMiniAppUrl,
} from '../lib/menus.js';
import { getLiveWeatherForCoords } from '../lib/weather.js';

const PERM_LABELS = {
  canViewStats: 'Statistika',
  canManageCatalog: 'Katalog',
  canModerateUsers: 'Bloklash',
  canBroadcast: 'Broadcast',
  canEditSettings: 'Sozlamalar',
};

async function renderAdminManageView(chatId, messageId) {
  const list = await db.select().from(admins).orderBy(desc(admins.id)).all();
  const lines =
    list.length === 0
      ? 'Hozircha qoʻshimcha adminlar yoʻq.'
      : list
          .map((a) => {
            const perms = Object.entries(PERM_LABELS)
              .filter(([k]) => Boolean(a[k]))
              .map(([, label]) => label)
              .join(', ');
            return `• ${a.username ? '@' + a.username : a.tgId} — [${perms || 'huquqsiz'}]`;
          })
          .join('\n');

  const keyboard = [
    [{ text: '➕ Yangi admin qoʻshish', callback_data: 'owner:addadmin' }],
    ...list.slice(0, 8).map((a) => [
      {
        text: `⚙️ ${a.username ? '@' + a.username : a.tgId}`,
        callback_data: `owner:editadmin:${a.id}`,
      },
      {
        text: '🗑 Oʻchirish',
        callback_data: `owner:deladmin:${a.id}`,
      },
    ]),
    [{ text: '← Owner menyusi', callback_data: 'owner:menu' }],
  ];

  await api.editMessageText({
    chat_id: chatId,
    message_id: messageId,
    text: `👑 <b>Adminlar boshqaruvi</b>\n\n${lines}\n\nAdmin qoʻshganda unga faqat minimal huquqlar beriladi. Istalgan adminning huquqlarini shu yerdan boshqaring:`,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: keyboard },
  });
}

async function renderSingleAdminPerms(chatId, messageId, adminId) {
  const row = await db.select().from(admins).where(eq(admins.id, adminId)).get();
  if (!row) {
    await renderAdminManageView(chatId, messageId);
    return;
  }

  const keyboard = Object.entries(PERM_LABELS).map(([key, label]) => [
    {
      text: `${row[key] ? '✅' : '❌'} ${label}`,
      callback_data: `owner:perm:${row.id}:${key}`,
    },
  ]);
  keyboard.push([{ text: '← Adminlar roʻyxati', callback_data: 'owner:admins' }]);

  await api.editMessageText({
    chat_id: chatId,
    message_id: messageId,
    text: `🛡 <b>${row.username ? '@' + row.username : row.tgId}</b> huquqlari:`,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: keyboard },
  });
}

export default async function (cb) {
  const from = cb.from;
  const data = cb.data || '';
  const msg = cb.message;
  if (!from || !msg) return;

  const access = await getAccessContext(from);
  const chatId = msg.chat.id;
  const messageId = msg.message_id;

  const answer = async (text = '') => {
    try {
      await api.answerCallbackQuery({ callback_query_id: cb.id, text });
    } catch {
      // ignore expired callback
    }
  };

  if (access.user?.isBlocked && !access.isOwner) {
    await answer('Hisobingiz cheklangan.');
    return;
  }

  // ==================== USER CALLBACKS ====================
  if (data === 'user:home') {
    await answer();
    await api.editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text: '✨ <b>Kapsula — Garderob & Stilist</b>\nQuyidagi boʻlimlardan birini tanlang:',
      parse_mode: 'HTML',
      reply_markup: await buildMainMenu(access),
    });
    return;
  }

  if (data === 'user:weather' || data === 'user:quick_outfit') {
    await answer('Ob-havo tekshirilmoqda...');
    const u = access.user;
    const report = await getLiveWeatherForCoords(
      u.latitude,
      u.longitude,
      `${u.city}${u.country ? ', ' + u.country : ''}`,
    );
    if (!report) {
      await api.sendMessage({ chat_id: chatId, text: 'Ob-havo olib boʻlmadi.' });
      return;
    }
    const webAppUrl = await getMiniAppUrl();
    await api.sendMessage({
      chat_id: chatId,
      text: report.summaryText,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✨ Atelyeda ochish', web_app: { url: `${webAppUrl}/?wx=${report.band}#stilist` } }],
          [{ text: '← Bosh menyu', callback_data: 'user:home' }],
        ],
      },
    });
    return;
  }

  if (data === 'user:city') {
    await answer();
    await setUserStep(access.user.tgId, 'awaiting_city');
    await api.sendMessage({
      chat_id: chatId,
      text: '🏙 Shahar nomini yozing (masalan: <b>Samarqand</b>, <b>Buxoro</b>, <b>Istanbul</b>) yoki Telegram joylashuvingizni yuboring.',
      parse_mode: 'HTML',
    });
    return;
  }

  // ==================== OWNER ONLY CALLBACKS ====================
  if (data.startsWith('owner:')) {
    if (!access.isOwner) {
      await answer('⛔ Faqat @fayzbek1331 uchun!');
      return;
    }

    if (data === 'owner:menu') {
      await answer();
      const stats = await getSystemStats();
      await api.editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text:
          `👑 <b>Owner Boshqaruv Markazi</b> (@fayzbek1331)\n\n` +
          `👥 Foydalanuvchilar: <b>${stats.totalUsers}</b> (bugun faol: ${stats.activeToday})\n` +
          `🛡 Adminlar: <b>${stats.totalAdmins}</b> · Bloklangan: ${stats.blockedUsers}\n` +
          `🧥 Maxsus kiyimlar: <b>${stats.totalCustomGarments}</b> · Saqlanganlar: <b>${stats.totalOutfits}</b>`,
        parse_mode: 'HTML',
        reply_markup: buildOwnerKeyboard(),
      });
      return;
    }

    if (data === 'owner:admins') {
      await answer();
      await renderAdminManageView(chatId, messageId);
      return;
    }

    if (data === 'owner:addadmin') {
      await answer();
      await setUserStep(access.user.tgId, 'awaiting_add_admin');
      await api.sendMessage({
        chat_id: chatId,
        text: '➕ Yangi adminning <b>@username</b> yoki raqamli Telegram ID sini yuboring (bekor qilish uchun /cancel):',
        parse_mode: 'HTML',
      });
      return;
    }

    if (data.startsWith('owner:deladmin:')) {
      const idStr = data.replace('owner:deladmin:', '');
      const res = await removeAdminByOwner(from, idStr);
      await answer(res.ok ? 'Admin olib tashlandi' : res.message);
      await renderAdminManageView(chatId, messageId);
      return;
    }

    if (data.startsWith('owner:editadmin:')) {
      await answer();
      const adminId = Number(data.replace('owner:editadmin:', ''));
      await renderSingleAdminPerms(chatId, messageId, adminId);
      return;
    }

    if (data.startsWith('owner:perm:')) {
      const [, , idStr, permKey] = data.split(':');
      const adminId = Number(idStr);
      const row = await db.select().from(admins).where(eq(admins.id, adminId)).get();
      if (row && permKey in PERM_LABELS) {
        const nextVal = !row[permKey];
        await db.update(admins).set({ [permKey]: nextVal }).where(eq(admins.id, adminId));
        await logAudit(
          from,
          'owner',
          'TOGGLE_ADMIN_PERM',
          `${row.username ? '@' + row.username : row.tgId}: ${permKey}=${nextVal}`,
        );
      }
      await answer('Yangilandi');
      await renderSingleAdminPerms(chatId, messageId, adminId);
      return;
    }

    if (data === 'owner:stats') {
      await answer();
      const s = await getSystemStats();
      await api.editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text:
          `📊 <b>Kengaytirilgan Tizim Statistikasi</b>\n\n` +
          `• Jami foydalanuvchilar: <b>${s.totalUsers}</b>\n` +
          `• Bugun faollar (24s): <b>${s.activeToday}</b>\n` +
          `• Bloklanganlar: <b>${s.blockedUsers}</b>\n` +
          `• Faol adminlar: <b>${s.totalAdmins}</b>\n` +
          `• Saqlangan obrazlar: <b>${s.totalOutfits}</b>\n` +
          `• Qoʻshilgan maxsus kiyimlar: <b>${s.totalCustomGarments}</b>`,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '← Orqaga', callback_data: 'owner:menu' }]] },
      });
      return;
    }

    if (data === 'owner:broadcast') {
      await answer();
      await setUserStep(access.user.tgId, 'awaiting_broadcast');
      await api.sendMessage({
        chat_id: chatId,
        text: '📣 Barcha foydalanuvchilarga yuboriladigan xabar matnini yozing (/cancel — bekor qilish):',
      });
      return;
    }

    if (data === 'owner:users') {
      await answer();
      const recent = await db.select().from(users).orderBy(desc(users.lastActiveAt)).limit(8).all();
      const lines = recent
        .map(
          (u) =>
            `• ${u.firstName} (${u.username ? '@' + u.username : u.tgId}) [${u.role}] ${u.isBlocked ? '🚫' : ''} — ${u.city}`,
        )
        .join('\n');
      const toggleRows = recent
        .filter((u) => u.role !== 'owner')
        .slice(0, 5)
        .map((u) => [
          {
            text: `${u.isBlocked ? '✅ Blokdan chiqarish' : '🚫 Bloklash'}: ${u.username ? '@' + u.username : u.tgId}`,
            callback_data: `owner:toggleblock:${u.tgId}`,
          },
        ]);
      toggleRows.push([{ text: '← Orqaga', callback_data: 'owner:menu' }]);

      await api.editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text: `👥 <b>Soʻnggi foydalanuvchilar:</b>\n\n${lines || 'Hozircha yoʻq.'}`,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: toggleRows },
      });
      return;
    }

    if (data.startsWith('owner:toggleblock:')) {
      const targetId = Number(data.replace('owner:toggleblock:', ''));
      const target = await db.select().from(users).where(eq(users.tgId, targetId)).get();
      if (target && target.role !== 'owner') {
        const nextBlock = !target.isBlocked;
        await db.update(users).set({ isBlocked: nextBlock }).where(eq(users.tgId, targetId));
        await logAudit(from, 'owner', nextBlock ? 'BLOCK_USER' : 'UNBLOCK_USER', String(targetId));
      }
      await answer('Yangilandi');
      // Re-render users view
      const recent = await db.select().from(users).orderBy(desc(users.lastActiveAt)).limit(8).all();
      const lines = recent
        .map(
          (u) =>
            `• ${u.firstName} (${u.username ? '@' + u.username : u.tgId}) [${u.role}] ${u.isBlocked ? '🚫' : ''} — ${u.city}`,
        )
        .join('\n');
      const toggleRows = recent
        .filter((u) => u.role !== 'owner')
        .slice(0, 5)
        .map((u) => [
          {
            text: `${u.isBlocked ? '✅ Blokdan chiqarish' : '🚫 Bloklash'}: ${u.username ? '@' + u.username : u.tgId}`,
            callback_data: `owner:toggleblock:${u.tgId}`,
          },
        ]);
      toggleRows.push([{ text: '← Orqaga', callback_data: 'owner:menu' }]);
      await api.editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text: `👥 <b>Soʻnggi foydalanuvchilar:</b>\n\n${lines}`,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: toggleRows },
      });
      return;
    }

    if (data === 'owner:settings') {
      await answer();
      const maint = await getSetting('maintenance_mode', 'off');
      const appUrl = await getMiniAppUrl();
      await api.editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text:
          `⚙️ <b>Bot Sozlamalari</b>\n\n` +
          `• Texnik rejim: <b>${maint === 'on' ? 'YOQILGAN 🛠' : 'Oʻchirilgan'}</b>\n` +
          `• Mini App havolasi: <code>${appUrl}</code>`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: maint === 'on' ? '✅ Texnik rejimni oʻchirish' : '🛠 Texnik rejimni yoqish',
                callback_data: 'owner:toggle_maint',
              },
            ],
            [{ text: '✏️ /start matnini oʻzgartirish', callback_data: 'owner:set_welcome' }],
            [{ text: '🌐 Mini App URL oʻzgartirish', callback_data: 'owner:set_miniapp' }],
            [{ text: '← Orqaga', callback_data: 'owner:menu' }],
          ],
        },
      });
      return;
    }

    if (data === 'owner:toggle_maint') {
      const cur = await getSetting('maintenance_mode', 'off');
      const next = cur === 'on' ? 'off' : 'on';
      await setSetting('maintenance_mode', next);
      await logAudit(from, 'owner', 'MAINTENANCE_MODE', next);
      await answer(`Texnik rejim: ${next}`);
      await api.editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text: `⚙️ Texnik rejim holati: <b>${next === 'on' ? 'YOQILGAN 🛠' : 'Oʻchirilgan'}</b>`,
        parse_mode: 'HTML',
        reply_markup: buildOwnerKeyboard(),
      });
      return;
    }

    if (data === 'owner:set_welcome') {
      await answer();
      await setUserStep(access.user.tgId, 'awaiting_welcome_text');
      await api.sendMessage({ chat_id: chatId, text: '✏️ Yangi /start salomlashish matnini yuboring:' });
      return;
    }

    if (data === 'owner:set_miniapp') {
      await answer();
      await setUserStep(access.user.tgId, 'awaiting_miniapp_url');
      await api.sendMessage({ chat_id: chatId, text: '🌐 Yangi Mini App HTTPS havolasini yuboring:' });
      return;
    }

    if (data === 'owner:catalog') {
      await answer();
      await setUserStep(access.user.tgId, 'awaiting_custom_garment');
      await api.sendMessage({
        chat_id: chatId,
        text: '🧥 Yangi kiyim qoʻshish formati:\n<code>Nomi | kategoriya | #HEX</code>\nMasalan: <code>Qora kashmir hudi | top | #121212</code>',
        parse_mode: 'HTML',
      });
      return;
    }

    if (data === 'owner:audit') {
      await answer();
      const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(12).all();
      const lines =
        logs.length === 0
          ? 'Jurnal boʻsh.'
          : logs
              .map(
                (l) =>
                  `• [${l.actorRole}] ${l.actorUsername ? '@' + l.actorUsername : l.actorTgId}: <b>${l.action}</b>${l.details ? ' — ' + l.details : ''}`,
              )
              .join('\n');
      await api.editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text: `📜 <b>Audit Jurnali (Oxirgi 12 ta)</b>\n\n${lines}`,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '← Orqaga', callback_data: 'owner:menu' }]] },
      });
      return;
    }

    if (data === 'owner:export') {
      await answer();
      const allU = await db.select().from(users).all();
      const allA = await db.select().from(admins).all();
      const allG = await db.select().from(customGarments).all();
      await api.sendMessage({
        chat_id: chatId,
        text:
          `💾 <b>Eksport Hisoboti</b>\n` +
          `Jami foydalanuvchilar: ${allU.length}\n` +
          `Adminlar: ${allA.map((a) => (a.username ? '@' + a.username : a.tgId)).join(', ') || 'yoʻq'}\n` +
          `Maxsus kiyimlar: ${allG.length}\n` +
          `Shaharlar: ${Array.from(new Set(allU.map((u) => u.city))).slice(0, 10).join(', ')}`,
        parse_mode: 'HTML',
      });
      return;
    }
  }

  // ==================== RESTRICTED ADMIN CALLBACKS ====================
  if (data.startsWith('admin:')) {
    if (!access.isAdmin && !access.isOwner) {
      await answer('⛔ Ruxsat yoʻq');
      return;
    }

    if (data === 'admin:menu') {
      await answer();
      await api.editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text: '🛡 <b>Admin Panel (Cheklangan huquqlar)</b>',
        parse_mode: 'HTML',
        reply_markup: buildAdminKeyboard(access.permissions),
      });
      return;
    }

    if (data === 'admin:stats') {
      if (!access.isOwner && !access.permissions.canViewStats) {
        await answer('⛔ Statistika koʻrish huquqi berilmagan.');
        return;
      }
      await answer();
      const s = await getSystemStats();
      await logAudit(from, access.role, 'ADMIN_VIEW_STATS');
      await api.editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text: `📊 Foydalanuvchilar: <b>${s.totalUsers}</b> · Saqlangan obrazlar: <b>${s.totalOutfits}</b>`,
        parse_mode: 'HTML',
        reply_markup: buildAdminKeyboard(access.permissions),
      });
      return;
    }

    if (data === 'admin:addgarment') {
      if (!access.isOwner && !access.permissions.canManageCatalog) {
        await answer('⛔ Katalog huquqi berilmagan.');
        return;
      }
      await answer();
      await setUserStep(access.user.tgId, 'awaiting_custom_garment');
      await api.sendMessage({
        chat_id: chatId,
        text: '🧥 Kiyim nomini yuboring (format: <code>Nomi | top | #121212</code>):',
        parse_mode: 'HTML',
      });
      return;
    }

    if (data === 'admin:broadcast') {
      if (!access.isOwner && !access.permissions.canBroadcast) {
        await answer('⛔ Ommaviy xabar huquqi faqat egasi ruxsati bilan ochiladi.');
        return;
      }
      await answer();
      await setUserStep(access.user.tgId, 'awaiting_broadcast');
      await api.sendMessage({ chat_id: chatId, text: '📣 Eʼlon matnini yuboring:' });
      return;
    }

    if (data === 'admin:users') {
      if (!access.isOwner && !access.permissions.canModerateUsers) {
        await answer('⛔ Foydalanuvchilarni koʻrish huquqi berilmagan.');
        return;
      }
      await answer();
      const recent = await db.select().from(users).orderBy(desc(users.lastActiveAt)).limit(6).all();
      const lines = recent.map((u) => `• ${u.firstName} — ${u.city}`).join('\n');
      await api.sendMessage({ chat_id: chatId, text: `👥 Faol foydalanuvchilar:\n${lines}` });
    }
  }
}
