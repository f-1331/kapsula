import type { Category, Occasion, PaletteId, WeatherBand } from '../data/schema';

export interface TelegramCloudOutfit {
  id: number;
  title: string;
  items: string[];
  score: number;
  weather: string;
  occasion: string;
  palette: string;
  createdAt?: string | number;
}

export interface TelegramCloudCustomGarment {
  id: number;
  slug: string;
  titleUz: string;
  category: Category;
  colorHex: string;
  palette: PaletteId;
  weather: WeatherBand;
  occasion: Occasion;
  addedByUsername?: string | null;
}

export interface TelegramMiniAppSession {
  user?: {
    tgId: number;
    username?: string | null;
    firstName: string;
    city: string;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    genderPref?: 'w' | 'm' | 'all';
    lastView?: string | null;
  };
  role: 'owner' | 'admin' | 'user' | 'guest';
  isOwner?: boolean;
  isAdmin?: boolean;
  city?: string | null;
  lastView?: string | null;
  perms?: Record<string, boolean>;
  outfits?: TelegramCloudOutfit[];
  customGarments?: TelegramCloudCustomGarment[];
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

async function callTelegramEndpoint<T>(endpoint: string, body: unknown = {}, timeoutMs = 4500): Promise<T | null> {
  const tg = getTelegramWebApp();
  const initData = tg?.initData;
  if (!initData) return null;

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData,
      },
      body: JSON.stringify(body),
    });
    window.clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchTelegramSession(): Promise<TelegramMiniAppSession | null> {
  return callTelegramEndpoint<TelegramMiniAppSession>('getSession', {}, 5000);
}

export async function syncMiniAppHeartbeat(params: {
  view: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  tempC?: number;
  gender?: string;
}): Promise<TelegramMiniAppSession | null> {
  return callTelegramEndpoint<TelegramMiniAppSession>('heartbeat', params, 3500);
}

export async function syncOutfitToCloud(
  params:
    | { action: 'save'; title: string; items: string[]; score?: number; weather?: string; occasion?: string; palette?: string }
    | { action: 'delete'; id: number },
): Promise<{ outfit?: TelegramCloudOutfit; deleted?: boolean } | null> {
  return callTelegramEndpoint('syncOutfit', params, 4500);
}

export async function syncCustomGarmentToCloud(
  params:
    | {
        action: 'save';
        slug: string;
        titleUz: string;
        category: Category;
        colorHex: string;
        palette?: string;
        weather?: string;
        occasion?: string;
      }
    | { action: 'delete'; slug: string },
): Promise<{ garment?: TelegramCloudCustomGarment; deleted?: boolean } | null> {
  return callTelegramEndpoint('syncGarment', params, 4500);
}
