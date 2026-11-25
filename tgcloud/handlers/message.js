import { api, db } from 'sdk';
import { desc, eq, or } from 'sdk/db';
import { auditLogs, customGarments, users } from '../schema.js';
import {
  addAdminByOwner,
  cleanUsername,
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
  buildReplyKeyboard,
  getMiniAppUrl,
} from '../lib/menus.js';
import { geocodeCity, getLiveWeatherForCoords } from '../lib/weather.js';

async function sendWeatherSummary(chatId, user, lat, lon, cityLabel) {
  const report = await getLiveWeatherForCoords(lat, lon, cityLabel);
  if (!report) {
    await api.sendMessage({
      chat_id: chatId,
      text: 'Ob-havo maʼlumotlarini olishda vaqtinchalik xatolik yuz berdi. Keyinroq urinib koʻring.',
    });
    return;
  }

  await db
    .update(users)
    .set({
      city: cityLabel,
      latitude: lat,
      longitude: lon,
      lastTempC: report.temp,
    })
    .where(eq(users.tgId, user.tgId));

  const webAppUrl = await getMiniAppUrl();
  const deepUrl = `${webAppUrl}/?wx=${report.band}#stilist`;

  await api.sendMessage({
    chat_id: chatId,
    text: report.summaryText,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '✨ Shu ob-havoga mos obrazni Atelyeda ochish', web_app: { url: deepUrl } }],
        [{ text: '🏙 Shaharni almashtirish', callback_data: 'user:city' }],
      ],
    },
  });
}

async function runBroadcast(actor, role, messageText) {
  const allUsers = await db.select().from(users).where(eq(users.isBlocked, false)).all();
  let sent = 0;
  let failed = 0;
  for (const u of allUsers) {
    try {
      await api.sendMessage({
        chat_id: u.tgId,
        text: `📣 <b>Kapsula xabari</b>\n\n${messageText}`,
        parse_mode: 'HTML',
      });
      sent++;
    } catch {
      failed++;
    }
  }
  await logAudit(actor, role, 'BROADCAST', `Yuborildi: ${sent}, Xato: ${failed}`);
  return { sent, failed, total: allUsers.length };
}

export default async function (message) {
  const from = message.from;
  if (!from) return;

  const access = await getAccessContext(from);
  const user = access.user;
  if (!user) return;

  // Blocked check (Owner is never blocked)
  if (user.isBlocked && !access.isOwner) {
    await api.sendMessage({
      chat_id: message.chat.id,
      text: 'Sizning hisobingiz cheklangan. Murojaat uchun @fayzbek1331 ga yozing.',
    });
    return;
  }

  // Maintenance mode check (Owner and Admins bypass)
  const maint = await getSetting('maintenance_mode', 'off');
  if (maint === 'on' && !access.isOwner && !access.isAdmin) {
    await api.sendMessage({
      chat_id: message.chat.id,
      text: '🛠 Tizimda texnik yangilanish ketmoqda. Birozdan soʻng urinib koʻring.',
    });
    return;
  }

  const chatId = message.chat.id;
  const text = (message.text || '').trim();

  // Location sharing -> auto-detect weather & save coordinates
  if (message.location) {
    const { latitude, longitude } = message.location;
    await setUserStep(user.tgId, null);
    await sendWeatherSummary(chatId, user, latitude, longitude, 'Joriy joylashuv');
    return;
  }

  // Cancel multi-step state
  if (text === '/cancel' || text === 'Bekor qilish') {
    await setUserStep(user.tgId, null);
    await api.sendMessage({ chat_id: chatId, text: 'Amal bekor qilindi.' });
    return;
  }

  // Handle multi-step conversation states
  if (user.stateStep && text && !text.startsWith('/')) {
    const step = user.stateStep;
    await setUserStep(user.tgId, null);

    if (step === 'awaiting_city') {
      const geo = await geocodeCity(text);
      if (!geo) {
        await api.sendMessage({
          chat_id: chatId,
          text: `"${text}" shahri topilmadi. Iltimos, aniqroq nom kiriting (masalan: Toshkent, Samarqand, Dubay).`,
        });
        return;
      }
      const label = geo.country ? `${geo.city}, ${geo.country}` : geo.city;
      await db
        .update(users)
        .set({ city: geo.city, country: geo.country || 'Oʻzbekiston', latitude: geo.latitude, longitude: geo.longitude })
        .where(eq(users.tgId, user.tgId));
      await sendWeatherSummary(chatId, user, geo.latitude, geo.longitude, label);
      return;
    }

    if (step === 'awaiting_add_admin' && access.isOwner) {
      const res = await addAdminByOwner(from, text);
      await api.sendMessage({
        chat_id: chatId,
        text: res.ok
          ? `✅ Admin qoʻshildi: ${res.admin.username ? '@' + res.admin.username : res.admin.tgId}\nBoshlangʻich cheklangan huquqlar: Statistika + Katalog.`
          : `⚠️ ${res.message}`,
        reply_markup: buildOwnerKeyboard(),
      });
      return;
    }

    if (step === 'awaiting_broadcast' && (access.isOwner || access.permissions.canBroadcast)) {
      const stats = await runBroadcast(from, access.role, text);
      await api.sendMessage({
        chat_id: chatId,
        text: `✅ Ommaviy xabar yakunlandi.\nYuborildi: <b>${stats.sent}</b> / ${stats.total}\nXatolar: ${stats.failed}`,
        parse_mode: 'HTML',
        reply_markup: access.isOwner ? buildOwnerKeyboard() : buildAdminKeyboard(access.permissions),
      });
      return;
    }

    if (step === 'awaiting_welcome_text' && access.isOwner) {
      await setSetting('welcome_text', text);
      await logAudit(from, 'owner', 'EDIT_WELCOME', text.slice(0, 80));
      await api.sendMessage({
        chat_id: chatId,
        text: '✅ /start salomlashish matni yangilandi.',
        reply_markup: buildOwnerKeyboard(),
      });
      return;
    }

    if (step === 'awaiting_miniapp_url' && access.isOwner) {
      if (!text.startsWith('https://')) {
        await api.sendMessage({ chat_id: chatId, text: 'URL https:// bilan boshlanishi shart.' });
        return;
      }
      await setSetting('mini_app_url', text);
      await logAudit(from, 'owner', 'EDIT_MINIAPP_URL', text);
      await api.sendMessage({
        chat_id: chatId,
        text: `✅ Mini App havolasi yangilandi: ${text}`,
        reply_markup: buildOwnerKeyboard(),
      });
      return;
    }

    if (step === 'awaiting_custom_garment' && (access.isOwner || access.permissions.canManageCatalog)) {
      // Expected format: "Nomi | category | #HEX" (defaults gracefully if only name provided)
      const parts = text.split('|').map((s) => s.trim());
      const titleUz = parts[0] || text;
      const validCats = ['outerwear', 'top', 'bottom', 'dress', 'shoes', 'bag', 'accessory'];
      const category = validCats.includes((parts[1] || '').toLowerCase())
        ? parts[1].toLowerCase()
        : 'top';
      const colorHex = /^#[0-9a-fA-F]{6}$/.test(parts[2] || '') ? parts[2].toUpperCase() : '#B98E5E';
      const slug = `custom-${Date.now().toString(36)}`;

      await db.insert(customGarments).values({
        slug,
        titleUz,
        category,
        colorHex,
        addedByUsername: cleanUsername(from.username) || String(from.id),
      });
      await logAudit(from, access.role, 'ADD_GARMENT', `${titleUz} (${category} · ${colorHex})`);
      await api.sendMessage({
        chat_id: chatId,
        text: `✅ Yangi kiyim qoʻshildi:\n<b>${titleUz}</b>\nKategoriya: ${category} · Rang: ${colorHex}`,
        parse_mode: 'HTML',
        reply_markup: access.isOwner ? buildOwnerKeyboard() : buildAdminKeyboard(access.permissions),
      });
      return;
    }
  }

  // ==================== COMMANDS & PERSISTENT MENU SHORTCUTS ====================
  if (text.startsWith('/start')) {
    const customWelcome = await getSetting('welcome_text', '');
    const webAppUrl = await getMiniAppUrl();
    try {
      await api.setChatMenuButton({
        chat_id: chatId,
        menu_button: {
          type: 'web_app',
          text: '✨ Kapsula',
          web_app: { url: webAppUrl },
        },
      });
    } catch {
      // Non-fatal if Telegram menu button update fails
    }

    const greeting =
      customWelcome ||
      `Assalomu alaykum, <b>${from.first_name || 'doʻst'}</b>!\n\n` +
        `<b>Kapsula — Garderob & Stilist</b> Mini App va Telegram botiga xush kelibsiz.\n` +
        `• Shahringizdagi jonli ob-havoga qarab tayyor kiyim tavsiyasi oling\n` +
        `• <b>6,240+ brend buyumlari</b> (18 brend, 65 xil 3D kiyim turi, 16 rang palitrasi, 10 dizayn, 5 til)\n` +
        `• <b>Foto-tahlil</b>: kiyimingizni rasmga olib nima bilan kiyish va qaysi aksessuarni qoʻshishni bilib oling`;

    await api.sendMessage({
      chat_id: chatId,
      text: greeting,
      parse_mode: 'HTML',
      reply_markup: buildReplyKeyboard(access),
    });

    await api.sendMessage({
      chat_id: chatId,
      text: '👇 Quyidagi Mini App boʻlimlaridan birini toʻgʻridan-toʻgʻri ochishingiz mumkin:',
      reply_markup: await buildMainMenu(access),
    });
    return;
  }

  // Persistent Reply Keyboard button handlers
  if (text === '🎯 Stilist') {
    const webAppUrl = await getMiniAppUrl();
    await api.sendMessage({
      chat_id: chatId,
      text: '🎯 <b>Shaxsiy Stilist</b> — ob-havo, ofis, universitet, maktab va sayr uchun tayyor obrazlar:',
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '🎯 Stilistni ochish', web_app: { url: `${webAppUrl}/?tab=stilist` } }]],
      },
    });
    return;
  }

  if (text === '📸 Foto-tahlil') {
    const webAppUrl = await getMiniAppUrl();
    await api.sendMessage({
      chat_id: chatId,
      text: '📸 <b>Foto & Kamera Tahlili</b> — kiyimingiz rasmini yuklang va qaysi kiyimlar bilan kiyishni bitta bosishda koʻring:',
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '📸 Kamerada / Rasmda tekshirish', web_app: { url: `${webAppUrl}/?tab=skaner` } }]],
      },
    });
    return;
  }

  if (text === '🏷 Brendlar') {
    const webAppUrl = await getMiniAppUrl();
    await api.sendMessage({
      chat_id: chatId,
      text: '🏷 <b>16 ta Brend Katalogi</b> (Zara, Massimo Dutti, COS, Uniqlo, Nike, Adidas, 7SABER, Terra Pro...):',
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '🏷 Brendlarni koʻrish', web_app: { url: `${webAppUrl}/?tab=brendlar` } }]],
      },
    });
    return;
  }

  if (text === '🏫 Maktab / Universitet') {
    const webAppUrl = await getMiniAppUrl();
    await api.sendMessage({
      chat_id: chatId,
      text: '🏫 <b>Talaba va oʻquvchilar kapsulasi</b> — Maktab/Litsey yoki Universitet uslubini darhol oching:',
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🎓 Universitet', web_app: { url: `${webAppUrl}/?oc=university#stilist` } },
            { text: '📚 Maktab / Litsey', web_app: { url: `${webAppUrl}/?oc=school#stilist` } },
          ],
          [{ text: '🏃 Sport / Fitnes', web_app: { url: `${webAppUrl}/?oc=sport#stilist` } }],
        ],
      },
    });
    return;
  }

  if (text === '🏙 Shahar') {
    await setUserStep(user.tgId, 'awaiting_city');
    await api.sendMessage({
      chat_id: chatId,
      text: '🏙 Shahar nomini yozing (masalan: <b>Samarqand</b>, <b>Andijon</b>, <b>Istanbul</b>) yoki Telegram joylashuvingizni yuboring.',
      parse_mode: 'HTML',
    });
    return;
  }

  if (text === '🌦 Ob-havo' || text.startsWith('/obhavo') || text.startsWith('/weather')) {
    const arg = text.startsWith('/') ? text.replace(/^\/(obhavo|weather)\s*/i, '').trim() : '';
    if (arg) {
      const geo = await geocodeCity(arg);
      if (geo) {
        const label = geo.country ? `${geo.city}, ${geo.country}` : geo.city;
        await sendWeatherSummary(chatId, user, geo.latitude, geo.longitude, label);
        return;
      }
    }
    await sendWeatherSummary(
      chatId,
      user,
      user.latitude,
      user.longitude,
      `${user.city}${user.country ? ', ' + user.country : ''}`,
    );
    return;
  }

  if (text.startsWith('/tavsiya')) {
    await sendWeatherSummary(
      chat_id,
      user,
      user.latitude,
      user.longitude,
      `${user.city}${user.country ? ', ' + user.country : ''}`,
    );
    return;
  }

  // OWNER EXCLUSIVE COMMANDS (@fayzbek1331)
  if (text === '🟢 Hozir Online' || text.startsWith('/online')) {
    if (!access.isOwner) {
      await api.sendMessage({ chat_id: chatId, text: '⛔ Bu boʻlim faqat bot egasi (@fayzbek1331) uchun.' });
      return;
    }
    const s = await getSystemStats();
    const nowSec = Math.floor(Date.now() / 1000);
    const listText =
      s.onlineUsersList.length === 0
        ? 'Soʻnggi 1 soatda faol foydalanuvchi yoʻq.'
        : s.onlineUsersList
            .map((u) => {
              const secs = Math.max(0, nowSec - Number(u.last_active_at || nowSec));
              const ago = secs < 60 ? 'hozir' : `${Math.floor(secs / 60)} daq`;
              const who = u.username ? `@${u.username}` : u.first_name || u.tg_id;
              return `🟢 ${who} · ${u.city || 'Toshkent'} · [${u.last_view || 'bot'}] (${ago})`;
            })
            .join('\n');
    await api.sendMessage({
      chat_id: chatId,
      text:
        `🟢 <b>Hozirgi Faollik</b>\n` +
        `• 5 daqiqada: <b>${s.online5m}</b> ta\n` +
        `• 1 soatda: <b>${s.online1h}</b> ta\n` +
        `• Jami: <b>${s.totalUsers}</b> ta\n\n` +
        listText,
      parse_mode: 'HTML',
      reply_markup: buildOwnerKeyboard(),
    });
    return;
  }

  if (text === '👑 Owner Panel' || text.startsWith('/owner')) {
    if (!access.isOwner) {
      await api.sendMessage({ chat_id: chatId, text: '⛔ Bu boʻlim faqat bot egasi (@fayzbek1331) uchun.' });
      return;
    }
    const stats = await getSystemStats();
    await api.sendMessage({
      chat_id: chatId,
      text:
        `👑 <b>Owner Boshqaruv Markazi</b> (@fayzbek1331)\n\n` +
        `🟢 Hozir onlayn (5 daq): <b>${stats.online5m}</b> · 1 soatda: <b>${stats.online1h}</b>\n` +
        `👥 Foydalanuvchilar: <b>${stats.totalUsers}</b> (bugun: ${stats.activeToday})\n` +
        `🛡 Adminlar: <b>${stats.totalAdmins}</b>\n` +
        `🧥 Maxsus kiyimlar: <b>${stats.totalCustomGarments}</b> · Saqlangan obrazlar: <b>${stats.totalOutfits}</b>`,
      parse_mode: 'HTML',
      reply_markup: buildOwnerKeyboard(),
    });
    return;
  }

  if (text.startsWith('/addadmin')) {
    if (!access.isOwner) {
      await api.sendMessage({ chat_id: chatId, text: '⛔ Faqat bot egasi admin qoʻsha oladi.' });
      return;
    }
    const target = text.replace(/^\/addadmin\s*/i, '').trim();
    if (!target) {
      await api.sendMessage({ chat_id: chatId, text: 'Foydalanish: /addadmin @username yoki /addadmin 123456789' });
      return;
    }
    const res = await addAdminByOwner(from, target);
    await api.sendMessage({
      chat_id: chatId,
      text: res.ok
        ? `✅ Admin qoʻshildi: ${res.admin.username ? '@' + res.admin.username : res.admin.tgId}`
        : `⚠️ ${res.message}`,
    });
    return;
  }

  if (text.startsWith('/deladmin')) {
    if (!access.isOwner) {
      await api.sendMessage({ chat_id: chatId, text: '⛔ Faqat bot egasi adminni olib tashlay oladi.' });
      return;
    }
    const target = text.replace(/^\/deladmin\s*/i, '').trim();
    if (!target) {
      await api.sendMessage({ chat_id: chatId, text: 'Foydalanish: /deladmin @username yoki ID' });
      return;
    }
    const res = await removeAdminByOwner(from, target);
    await api.sendMessage({
      chat_id: chatId,
      text: res.ok ? '✅ Admin lavozimidan olib tashlandi.' : `⚠️ ${res.message}`,
    });
    return;
  }

  if (text.startsWith('/block ') || text.startsWith('/unblock ')) {
    if (!access.isOwner && !access.permissions.canModerateUsers) {
      await api.sendMessage({ chat_id: chatId, text: '⛔ Sizda foydalanuvchini bloklash huquqi yoʻq.' });
      return;
    }
    const isBlock = text.startsWith('/block ');
    const targetRaw = text.replace(/^\/(unblock|block)\s+/i, '').trim();
    const isNum = /^\d+$/.test(targetRaw);
    const uname = cleanUsername(targetRaw);
    const targetUser = isNum
      ? await db.select().from(users).where(eq(users.tgId, Number(targetRaw))).get()
      : await db.select().from(users).where(eq(users.username, uname)).get();

    if (!targetUser) {
      await api.sendMessage({ chat_id: chatId, text: 'Foydalanuvchi topilmadi.' });
      return;
    }
    if (targetUser.role === 'owner' || targetUser.username === 'fayzbek1331') {
      await api.sendMessage({ chat_id: chatId, text: '⛔ Tizim egasini bloklash mumkin emas.' });
      return;
    }

    await db.update(users).set({ isBlocked: isBlock }).where(eq(users.tgId, targetUser.tgId));
    await logAudit(from, access.role, isBlock ? 'BLOCK_USER' : 'UNBLOCK_USER', targetRaw);
    await api.sendMessage({
      chat_id: chatId,
      text: isBlock ? `🚫 ${targetRaw} bloklandi.` : `✅ ${targetRaw} blokdan chiqarildi.`,
    });
    return;
  }

  if (text.startsWith('/broadcast ')) {
    if (!access.isOwner && !access.permissions.canBroadcast) {
      await api.sendMessage({ chat_id: chatId, text: '⛔ Sizda ommaviy xabar yuborish huquqi yoʻq.' });
      return;
    }
    const body = text.replace(/^\/broadcast\s+/i, '').trim();
    if (!body) return;
    const res = await runBroadcast(from, access.role, body);
    await api.sendMessage({
      chat_id: chatId,
      text: `✅ Yuborildi: ${res.sent}/${res.total} (xato: ${res.failed})`,
    });
    return;
  }

  if (text.startsWith('/audit')) {
    if (!access.isOwner) {
      await api.sendMessage({ chat_id: chatId, text: '⛔ Audit jurnali faqat bot egasi uchun.' });
      return;
    }
    const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(15).all();
    const lines =
      logs.length === 0
        ? 'Jurnal boʻsh.'
        : logs
            .map(
              (l) =>
                `• [${l.actorRole}] ${l.actorUsername ? '@' + l.actorUsername : l.actorTgId}: <b>${l.action}</b> ${l.details ? '— ' + l.details : ''}`,
            )
            .join('\n');
    await api.sendMessage({
      chat_id: chatId,
      text: `📜 <b>Soʻnggi harakatlar:</b>\n\n${lines}`,
      parse_mode: 'HTML',
    });
    return;
  }

  // RESTRICTED ADMIN PANEL
  if (text === '🛡 Admin Panel' || text.startsWith('/admin')) {
    if (!access.isAdmin && !access.isOwner) {
      await api.sendMessage({ chat_id: chatId, text: '⛔ Siz admin emassiz.' });
      return;
    }
    if (access.isOwner) {
      await api.sendMessage({
        chat_id: chatId,
        text: '👑 Siz Tizim Egasisiz — barcha huquqlar ochiq:',
        reply_markup: buildOwnerKeyboard(),
      });
      return;
    }
    await api.sendMessage({
      chat_id: chatId,
      text: '🛡 <b>Admin Panel (Cheklangan huquqlar)</b>\nFaqat egasi ruxsat bergan boʻlimlardan foydalanishingiz mumkin.',
      parse_mode: 'HTML',
      reply_markup: buildAdminKeyboard(access.permissions),
    });
    return;
  }

  // Any plain city name sent -> instant weather & outfit recommendation!
  if (text && !text.startsWith('/')) {
    const geo = await geocodeCity(text);
    if (geo) {
      const label = geo.country ? `${geo.city}, ${geo.country}` : geo.city;
      await sendWeatherSummary(chatId, user, geo.latitude, geo.longitude, label);
      return;
    }
  }

  await api.sendMessage({
    chat_id: chatId,
    text: 'Shahar nomini yozing (masalan, <i>Toshkent</i> yoki <i>Samarqand</i>) yoki quyidagi tugmalardan foydalaning:',
    parse_mode: 'HTML',
    reply_markup: await buildMainMenu(access),
  });
}
