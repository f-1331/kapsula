import { getSetting } from './auth.js';

export const DEFAULT_MINI_APP_URL = 'https://app9112886422.tgcloud.ai';

export async function getMiniAppUrl() {
  const configured = await getSetting('mini_app_url', '');
  return configured || DEFAULT_MINI_APP_URL;
}

export async function buildMainMenu(access) {
  const webAppUrl = await getMiniAppUrl();
  const rows = [
    [{ text: '✨ Kapsula Atelyeni ochish (2000+ kiyim)', web_app: { url: webAppUrl } }],
    [
      { text: '🌦 Ob-havo va tavsiya', callback_data: 'user:weather' },
      { text: '🏙 Shaharni tanlash', callback_data: 'user:city' },
    ],
    [{ text: '🧥 Tezkor obraz', callback_data: 'user:quick_outfit' }],
  ];

  if (access.isOwner) {
    rows.push([{ text: '👑 Owner boshqaruv markazi', callback_data: 'owner:menu' }]);
  } else if (access.isAdmin) {
    rows.push([{ text: '🛡 Admin panel (cheklangan)', callback_data: 'admin:menu' }]);
  }

  return { inline_keyboard: rows };
}

export function buildOwnerKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '👑 Adminlar boshqaruvi', callback_data: 'owner:admins' },
        { text: '📊 Toʻliq statistika', callback_data: 'owner:stats' },
      ],
      [
        { text: '📣 Ommaviy xabar (Broadcast)', callback_data: 'owner:broadcast' },
        { text: '👥 Foydalanuvchilar', callback_data: 'owner:users' },
      ],
      [
        { text: '🧥 Katalogga kiyim qoʻshish', callback_data: 'owner:catalog' },
        { text: '⚙️ Bot sozlamalari', callback_data: 'owner:settings' },
      ],
      [
        { text: '📜 Audit jurnali', callback_data: 'owner:audit' },
        { text: '💾 Eksport hisoboti', callback_data: 'owner:export' },
      ],
      [{ text: '← Asosiy menyu', callback_data: 'user:home' }],
    ],
  };
}

export function buildAdminKeyboard(perms) {
  const rows = [];
  if (perms.canViewStats) {
    rows.push([{ text: '📊 Qisqacha statistika', callback_data: 'admin:stats' }]);
  }
  if (perms.canManageCatalog) {
    rows.push([{ text: '🧥 Katalogga buyum qoʻshish', callback_data: 'admin:addgarment' }]);
  }
  if (perms.canModerateUsers) {
    rows.push([{ text: '👥 Foydalanuvchilarni koʻrish', callback_data: 'admin:users' }]);
  }
  if (perms.canBroadcast) {
    rows.push([{ text: '📣 Eʼlon yuborish', callback_data: 'admin:broadcast' }]);
  }
  rows.push([{ text: '← Asosiy menyu', callback_data: 'user:home' }]);
  return { inline_keyboard: rows };
}
