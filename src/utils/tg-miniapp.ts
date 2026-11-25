export interface TelegramMiniAppSession {
  role: 'owner' | 'admin' | 'user' | 'guest';
  city?: string | null;
  lastView?: string | null;
  perms?: Record<string, boolean>;
}

const API_BASE = 'https://app9112886422.tgcloud.ai/api';

export function getTelegramWebApp() {
  if (typeof window === 'undefined') return null;
  return (window as unknown as {
    Telegram?: {
      WebApp?: {
        ready?: () => void;
        expand?: () => void;
        initData?: string;
        colorScheme?: 'light' | 'dark';
      };
    };
  }).Telegram?.WebApp ?? null;
}

export async function syncMiniAppHeartbeat(params: {
  view: string;
  city?: string;
  gender?: string;
}): Promise<TelegramMiniAppSession | null> {
  const tg = getTelegramWebApp();
  const initData = tg?.initData;
  if (!initData) return null;

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${API_BASE}/heartbeat`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData,
      },
      body: JSON.stringify(params),
    });
    window.clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as TelegramMiniAppSession;
  } catch {
    return null;
  }
}
