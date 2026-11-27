import { create } from 'zustand';
import {
  OccasionSchema,
  PaletteIdSchema,
  WeatherBandSchema,
  type Category,
  type Garment,
  type Manifest,
  type Occasion,
  type PaletteId,
  type UserGenderFilter,
  type WeatherBand,
} from '../data/schema';
import { SAMPLE_MANIFEST } from '../data/sample-manifest';
import { analyzeGarmentsHarmony } from '../engine/color';
import {
  EMPTY_BOARD,
  boardSlotsToGarments,
  garmentsToBoardSlots,
  recommendOutfits,
  type BoardSlots,
  type SlotKey,
  type StylistQuery,
} from '../engine/stylist';
import {
  syncCustomGarmentToCloud,
  syncOutfitToCloud,
  type TelegramMiniAppSession,
} from '../utils/tg-miniapp';
import {
  DEFAULT_LOCATION,
  weatherBandDefaultTemp,
  type GeoLocationInfo,
  type LiveWeatherAnalysis,
} from '../utils/weather-api';
import type { AppLanguage } from '../i18n/languages';
import { DESIGN_THEMES, getDesignThemeById, type DesignThemeId } from '../styles/themes';

const STORAGE_FILTERS_KEY = 'kapsula_filters_v1';
const STORAGE_SAVED_KEY = 'kapsula_saved_v1';
const STORAGE_THEME_KEY = 'kapsula_theme_v1';
const STORAGE_DESIGN_THEME_KEY = 'kapsula_design_theme_v1';
const STORAGE_LANG_KEY = 'kapsula_lang_v1';
const STORAGE_LOC_KEY = 'kapsula_location_v1';
const STORAGE_CUSTOM_GARMENTS_KEY = 'kapsula_custom_garments_v1';
const STORAGE_WEEKLY_PLAN_KEY = 'kapsula_weekly_plan_v1';
const STORAGE_PACKING_KEY = 'kapsula_packing_v1';
const STORAGE_GENDER_CHOSEN_KEY = 'kapsula_gender_chosen_v1';
const MAX_SAVED_OUTFITS = 24;
const MAX_CUSTOM_GARMENTS = 24;
const MAX_HISTORY = 40;

export type ThemeMode = 'light' | 'dark';
export type ViewTab =
  | 'cover'
  | 'stilist'
  | 'atelye'
  | 'skaner'
  | 'brendlar'
  | 'lookbook'
  | 'garderobim'
  | 'ranglar';

export const VIEW_TABS: readonly ViewTab[] = [
  'cover',
  'stilist',
  'atelye',
  'skaner',
  'brendlar',
  'lookbook',
  'garderobim',
  'ranglar',
] as const;

export function parseViewFromLocation(): ViewTab {
  if (typeof window === 'undefined') return 'cover';
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab');
  if (tabParam && (VIEW_TABS as readonly string[]).includes(tabParam)) {
    return tabParam as ViewTab;
  }
  const hash = window.location.hash.replace(/^#/, '');
  if (hash && (VIEW_TABS as readonly string[]).includes(hash)) {
    return hash as ViewTab;
  }
  if (params.get('items')) return 'atelye';
  return 'cover';
}

export interface SavedOutfit {
  id: string;
  cloudId?: number;
  title: string;
  createdAt: string;
  items: string[];
  query: StylistQuery;
}

function safeReadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteStorage(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Unavailable localStorage: degrade silently
  }
}

export function applyDesignThemeToDocument(presetId: DesignThemeId): ThemeMode {
  const preset = getDesignThemeById(presetId);
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (preset.colorScheme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    root.setAttribute('data-design', preset.id);
    for (const [k, v] of Object.entries(preset.vars)) {
      root.style.setProperty(k, v);
    }
    root.style.colorScheme = preset.colorScheme;

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', preset.vars['--paper']);
    }
  }
  return preset.colorScheme;
}

export function applyThemeToDocument(theme: ThemeMode): void {
  applyDesignThemeToDocument(theme === 'dark' ? 'noir-luxury' : 'editorial-sand');
}

function readInitialDesignTheme(): DesignThemeId {
  if (typeof window === 'undefined') return 'editorial-sand';
  try {
    const stored = window.localStorage.getItem(STORAGE_DESIGN_THEME_KEY);
    if (stored && DESIGN_THEMES.some((t) => t.id === stored)) {
      return stored as DesignThemeId;
    }
    const legacy = window.localStorage.getItem(STORAGE_THEME_KEY);
    if (legacy === 'dark') return 'noir-luxury';
    if (legacy === 'light') return 'editorial-sand';
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'noir-luxury';
  } catch {
    // ignore
  }
  return 'editorial-sand';
}

function readInitialLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'uz';
  try {
    const stored = window.localStorage.getItem(STORAGE_LANG_KEY);
    if (stored === 'uz' || stored === 'uz_cyrl' || stored === 'ru' || stored === 'en' || stored === 'tr') {
      return stored;
    }
  } catch {
    // ignore
  }
  return 'uz';
}

function readInitialLocation(): GeoLocationInfo {
  const stored = safeReadStorage<Partial<GeoLocationInfo> | null>(STORAGE_LOC_KEY, null);
  if (
    stored &&
    typeof stored.city === 'string' &&
    typeof stored.country === 'string' &&
    typeof stored.latitude === 'number' &&
    typeof stored.longitude === 'number'
  ) {
    return {
      city: stored.city,
      country: stored.country,
      latitude: stored.latitude,
      longitude: stored.longitude,
      isAutoDetected: Boolean(stored.isAutoDetected),
    };
  }
  return DEFAULT_LOCATION;
}

function parseInitialQueryFromStorageOrUrl(): {
  query: StylistQuery;
  urlItems: string[] | null;
  urlLocation: GeoLocationInfo | null;
  urlLookId: string | null;
  hasExplicitWeather: boolean;
  hasExplicitCity: boolean;
} {
  const defaultQuery: StylistQuery = {
    weather: 'cool',
    rain: false,
    occasion: 'office',
    palette: 'any',
    gender: 'all',
  };

  const stored = safeReadStorage<Partial<StylistQuery>>(STORAGE_FILTERS_KEY, {});
  const merged: StylistQuery = {
    weather: WeatherBandSchema.safeParse(stored.weather).success ? (stored.weather as WeatherBand) : defaultQuery.weather,
    rain: typeof stored.rain === 'boolean' ? stored.rain : defaultQuery.rain,
    occasion: OccasionSchema.safeParse(stored.occasion).success ? (stored.occasion as Occasion) : defaultQuery.occasion,
    palette:
      stored.palette === 'any' || PaletteIdSchema.safeParse(stored.palette).success
        ? (stored.palette as PaletteId | 'any')
        : defaultQuery.palette,
    gender:
      stored.gender === 'w' || stored.gender === 'm' || stored.gender === 'all'
        ? stored.gender
        : defaultQuery.gender,
  };

  if (typeof window === 'undefined') {
    return {
      query: merged,
      urlItems: null,
      urlLocation: null,
      urlLookId: null,
      hasExplicitWeather: false,
      hasExplicitCity: false,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const wx = params.get('wx');
  const oc = params.get('oc');
  const pal = params.get('pal');
  const g = params.get('g');
  const itemsRaw = params.get('items');
  const cityParam = params.get('city');
  const countryParam = params.get('country');
  const latParam = Number(params.get('lat'));
  const lonParam = Number(params.get('lon'));
  const lookParam = params.get('look');

  const hasExplicitWeather = Boolean(wx && WeatherBandSchema.safeParse(wx).success);
  if (hasExplicitWeather) merged.weather = wx as WeatherBand;
  if (oc && OccasionSchema.safeParse(oc).success) merged.occasion = oc as Occasion;
  if (pal === 'any' || (pal && PaletteIdSchema.safeParse(pal).success)) merged.palette = pal as PaletteId | 'any';
  if (g === 'w' || g === 'm' || g === 'all') merged.gender = g;

  const hasExplicitCity = Boolean(cityParam && cityParam.trim().length > 0);
  const urlLocation: GeoLocationInfo | null = hasExplicitCity
    ? {
        city: cityParam!.trim(),
        country: countryParam?.trim() || 'Oʻzbekiston',
        latitude: Number.isFinite(latParam) && latParam !== 0 ? latParam : DEFAULT_LOCATION.latitude,
        longitude: Number.isFinite(lonParam) && lonParam !== 0 ? lonParam : DEFAULT_LOCATION.longitude,
        isAutoDetected: false,
      }
    : null;

  const urlItems = itemsRaw
    ? itemsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : null;

  return {
    query: merged,
    urlItems,
    urlLocation,
    urlLookId: lookParam?.trim() || null,
    hasExplicitWeather,
    hasExplicitCity,
  };
}

function parseSavedOutfitsFromStorage(): SavedOutfit[] {
  const raw = safeReadStorage<unknown>(STORAGE_SAVED_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is SavedOutfit =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as SavedOutfit).id === 'string' &&
        typeof (item as SavedOutfit).title === 'string' &&
        Array.isArray((item as SavedOutfit).items),
    )
    .slice(0, MAX_SAVED_OUTFITS);
}

function parseCustomGarmentsFromStorage(): Garment[] {
  const raw = safeReadStorage<unknown>(STORAGE_CUSTOM_GARMENTS_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (g): g is Garment =>
        typeof g === 'object' &&
        g !== null &&
        typeof (g as Garment).id === 'string' &&
        typeof (g as Garment).name_uz === 'string' &&
        typeof (g as Garment).color === 'string',
    )
    .slice(0, MAX_CUSTOM_GARMENTS);
}

function mergeManifestWithCustom(base: Manifest, custom: Garment[]): Manifest {
  if (custom.length === 0) return base;
  const customIds = new Set(custom.map((g) => g.id));
  const filteredBase = base.garments.filter((g) => !customIds.has(g.id));
  return {
    ...base,
    garments: [...custom, ...filteredBase],
  };
}

const initialParsed = parseInitialQueryFromStorageOrUrl();
const initialCustomGarments = parseCustomGarmentsFromStorage();
const initialMergedManifest = mergeManifestWithCustom(SAMPLE_MANIFEST, initialCustomGarments);
const initialRecs = recommendOutfits(initialMergedManifest, initialParsed.query);
const initialById = new Map(initialMergedManifest.garments.map((g) => [g.id, g]));
const initialDesignTheme = readInitialDesignTheme();
const initialTheme = applyDesignThemeToDocument(initialDesignTheme);
const initialLang = readInitialLanguage();
const initialActiveView = parseViewFromLocation();

function readInitialGenderChosen(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const params = new URLSearchParams(window.location.search);
    const g = params.get('g');
    if (g === 'w' || g === 'm' || g === 'all') return true;
    if (params.get('items')) return true;
    return window.localStorage.getItem(STORAGE_GENDER_CHOSEN_KEY) === '1';
  } catch {
    return false;
  }
}
const initialGenderChosen = readInitialGenderChosen();

function resolveItemsToBoard(ids: string[], byId: Map<string, Garment>): { slots: BoardSlots; missingCount: number } {
  const resolved: Garment[] = [];
  let missingCount = 0;
  for (const id of ids) {
    const found = byId.get(id);
    if (found) resolved.push(found);
    else missingCount++;
  }
  return { slots: garmentsToBoardSlots(resolved), missingCount };
}

const initialBoardInfo = initialParsed.urlItems
  ? resolveItemsToBoard(initialParsed.urlItems, initialById)
  : {
      slots: initialRecs.outfits[0]?.slots ?? { ...EMPTY_BOARD },
      missingCount: 0,
    };

export interface KapsulaState {
  activeView: ViewTab;
  baseManifest: Manifest;
  manifest: Manifest;
  customGarments: Garment[];
  weeklyPlan: Record<string, string[]>;
  packingChecked: Record<string, boolean>;
  atelierBrandFilter: string;
  colorLabColors: string[];
  telegramRole: 'owner' | 'admin' | 'user' | 'guest';
  isSampleData: boolean;
  hasWebpAssets: boolean;
  manifestLoaded: boolean;
  theme: ThemeMode;
  designTheme: DesignThemeId;
  language: AppLanguage;
  location: GeoLocationInfo;
  liveWeather: LiveWeatherAnalysis | null;
  autoWeatherEnabled: boolean;
  weatherLoading: boolean;
  query: StylistQuery;
  temperatureC: number;
  slots: BoardSlots;
  past: BoardSlots[];
  future: BoardSlots[];
  savedOutfits: SavedOutfit[];
  missingIdsNotice: boolean;
  randomSeedCounter: number;
  activeLookId: string | null;
  lastScoreAnnouncement: string;
  genderChosen: boolean;
  genderGateOpen: boolean;

  setActiveView: (view: ViewTab, syncHash?: boolean) => void;
  openGenderGate: () => void;
  closeGenderGate: () => void;
  selectUserGender: (gender: UserGenderFilter, regenerateBoard?: boolean) => void;
  setAtelierBrandFilter: (brand: string) => void;
  setColorLabColors: (colors: string[]) => void;
  openColorsInLab: (colors: string[]) => void;
  hydrateFromTelegramSession: (session: TelegramMiniAppSession) => void;
  addCustomGarment: (garment: Garment) => void;
  removeCustomGarment: (id: string) => void;
  setDayPlan: (dateStr: string, itemIds: string[]) => void;
  togglePackingItem: (itemId: string) => void;
  setTheme: (theme: ThemeMode) => void;
  setDesignTheme: (id: DesignThemeId) => void;
  setLanguage: (lang: AppLanguage) => void;
  toggleTheme: () => void;
  setLocation: (location: GeoLocationInfo) => void;
  setWeatherLoading: (loading: boolean) => void;
  setLiveWeather: (analysis: LiveWeatherAnalysis, applyToQuery?: boolean) => void;
  setAutoWeatherEnabled: (enabled: boolean) => void;
  setManifestData: (manifest: Manifest, isSampleData: boolean, hasWebpAssets?: boolean) => void;
  updateQuery: (patch: Partial<StylistQuery>, tempC?: number, disableAuto?: boolean) => void;
  setTemperatureC: (tempC: number, band: WeatherBand, disableAuto?: boolean) => void;
  setBoardSlots: (nextSlots: BoardSlots, recordHistory?: boolean) => void;
  placeGarmentOnBoard: (garment: Garment, preferredSlot?: SlotKey) => void;
  removeSlot: (slot: SlotKey) => void;
  clearBoard: () => void;
  undo: () => void;
  redo: () => void;
  loadItemsToBoard: (itemIds: string[]) => void;
  saveOutfit: (itemIds: string[], title?: string) => boolean;
  deleteSavedOutfit: (id: string) => void;
  incrementRandomSeed: () => number;
  setActiveLookId: (lookId: string | null) => void;
  setScoreAnnouncement: (msg: string) => void;
  dismissMissingNotice: () => void;
  buildShareUrl: () => string;
}

export const useKapsulaStore = create<KapsulaState>((set, get) => ({
  activeView: initialActiveView,
  baseManifest: SAMPLE_MANIFEST,
  manifest: initialMergedManifest,
  customGarments: initialCustomGarments,
  weeklyPlan: safeReadStorage<Record<string, string[]>>(STORAGE_WEEKLY_PLAN_KEY, {}),
  packingChecked: safeReadStorage<Record<string, boolean>>(STORAGE_PACKING_KEY, {}),
  atelierBrandFilter: 'all',
  colorLabColors: ['#151412', '#F4EFE6', '#B98E5E'],
  telegramRole: 'guest',
  isSampleData: true,
  hasWebpAssets: false,
  manifestLoaded: false,
  theme: initialTheme,
  designTheme: initialDesignTheme,
  language: initialLang,
  location: initialParsed.urlLocation ?? readInitialLocation(),
  liveWeather: null,
  autoWeatherEnabled: !initialParsed.urlItems && !initialParsed.hasExplicitWeather,
  weatherLoading: false,
  query: initialParsed.query,
  temperatureC: weatherBandDefaultTemp(initialParsed.query.weather),
  slots: initialBoardInfo.slots,
  past: [],
  future: [],
  savedOutfits: parseSavedOutfitsFromStorage(),
  missingIdsNotice: initialBoardInfo.missingCount > 0,
  randomSeedCounter: 1,
  activeLookId: initialParsed.urlLookId,
  lastScoreAnnouncement: '',
  genderChosen: initialGenderChosen,
  genderGateOpen: !initialGenderChosen,

  openGenderGate: () => set({ genderGateOpen: true }),

  closeGenderGate: () => {
    try {
      window.localStorage.setItem(STORAGE_GENDER_CHOSEN_KEY, '1');
    } catch {
      // ignore
    }
    set({ genderGateOpen: false, genderChosen: true });
  },

  selectUserGender: (gender, regenerateBoard = true) => {
    const state = get();
    const nextQuery: StylistQuery = { ...state.query, gender };
    safeWriteStorage(STORAGE_FILTERS_KEY, nextQuery);
    try {
      window.localStorage.setItem(STORAGE_GENDER_CHOSEN_KEY, '1');
    } catch {
      // ignore
    }
    if (regenerateBoard) {
      const recs = recommendOutfits(state.manifest, nextQuery);
      const nextSlots = recs.outfits[0]?.slots ?? state.slots;
      set({
        query: nextQuery,
        genderChosen: true,
        genderGateOpen: false,
        slots: nextSlots,
        past: [],
        future: [],
      });
    } else {
      set({
        query: nextQuery,
        genderChosen: true,
        genderGateOpen: false,
      });
    }
  },

  setActiveView: (view, syncHash = true) => {
    if (syncHash && typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('tab');
        url.hash = view === 'cover' ? '' : view;
        window.history.replaceState(null, '', url.toString());
      } catch {
        // ignore
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    set({ activeView: view });
  },

  setAtelierBrandFilter: (atelierBrandFilter) => set({ atelierBrandFilter }),

  setColorLabColors: (colors) => {
    const cleaned = colors.filter((c) => /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 5);
    if (cleaned.length >= 2) {
      set({ colorLabColors: cleaned.map((c) => c.toUpperCase()) });
    }
  },

  openColorsInLab: (colors) => {
    get().setColorLabColors(colors);
    get().setActiveView('ranglar');
  },

  hydrateFromTelegramSession: (session) => {
    const state = get();
    const cloudCustom: Garment[] = (session.customGarments ?? []).map((cg) => ({
      id: cg.slug,
      category: (['outerwear', 'top', 'bottom', 'dress', 'shoes', 'bag', 'accessory'].includes(cg.category)
        ? cg.category
        : 'top') as Category,
      name_uz: cg.titleUz,
      name_en: cg.titleUz,
      image: '',
      w: 240,
      h: 320,
      color: cg.colorHex,
      color2: null,
      warmth: 3,
      waterproof: false,
      formality: 2,
      palettes: [PaletteIdSchema.safeParse(cg.palette).success ? cg.palette : 'sand'],
      occasions: [OccasionSchema.safeParse(cg.occasion).success ? cg.occasion : 'office'],
      weather: [WeatherBandSchema.safeParse(cg.weather).success ? cg.weather : 'cool'],
      gender: 'u',
      brand: cg.addedByUsername ? `@${cg.addedByUsername}` : 'Kapsula Bot',
      isUserUploaded: true,
    }));

    const seenCustom = new Set(state.customGarments.map((g) => g.id));
    const mergedCustom = [
      ...state.customGarments,
      ...cloudCustom.filter((g) => !seenCustom.has(g.id)),
    ].slice(0, MAX_CUSTOM_GARMENTS);
    safeWriteStorage(STORAGE_CUSTOM_GARMENTS_KEY, mergedCustom);

    const cloudOutfits: SavedOutfit[] = (session.outfits ?? []).map((o) => ({
      id: `cloud-${o.id}`,
      cloudId: o.id,
      title: o.title,
      createdAt:
        typeof o.createdAt === 'number'
          ? new Date(o.createdAt * 1000).toISOString()
          : String(o.createdAt ?? new Date().toISOString()),
      items: Array.isArray(o.items) ? o.items : [],
      query: {
        weather: WeatherBandSchema.safeParse(o.weather).success ? (o.weather as WeatherBand) : state.query.weather,
        rain: state.query.rain,
        occasion: OccasionSchema.safeParse(o.occasion).success ? (o.occasion as Occasion) : state.query.occasion,
        palette:
          o.palette === 'any' || PaletteIdSchema.safeParse(o.palette).success
            ? (o.palette as PaletteId | 'any')
            : state.query.palette,
        gender: state.query.gender,
      },
    }));

    const knownCloudIds = new Set(state.savedOutfits.map((s) => s.cloudId).filter(Boolean));
    const mergedOutfits = [
      ...state.savedOutfits,
      ...cloudOutfits.filter((o) => !knownCloudIds.has(o.cloudId)),
    ].slice(0, MAX_SAVED_OUTFITS);
    safeWriteStorage(STORAGE_SAVED_KEY, mergedOutfits);

    const mergedManifest = mergeManifestWithCustom(state.baseManifest, mergedCustom);
    const nextPatch: Partial<KapsulaState> = {
      telegramRole: session.role,
      customGarments: mergedCustom,
      savedOutfits: mergedOutfits,
      manifest: mergedManifest,
    };

    if (
      !initialParsed.hasExplicitCity &&
      session.user?.city &&
      typeof session.user.latitude === 'number' &&
      typeof session.user.longitude === 'number'
    ) {
      const botLoc: GeoLocationInfo = {
        city: session.user.city,
        country: session.user.country || 'Oʻzbekiston',
        latitude: session.user.latitude,
        longitude: session.user.longitude,
        isAutoDetected: false,
      };
      safeWriteStorage(STORAGE_LOC_KEY, botLoc);
      nextPatch.location = botLoc;
    }

    set(nextPatch);
  },

  addCustomGarment: (garment) => {
    const existing = get().customGarments.filter((g) => g.id !== garment.id);
    const nextCustom = [garment, ...existing].slice(0, MAX_CUSTOM_GARMENTS);
    safeWriteStorage(STORAGE_CUSTOM_GARMENTS_KEY, nextCustom);
    const merged = mergeManifestWithCustom(get().baseManifest, nextCustom);
    set({ customGarments: nextCustom, manifest: merged });
    void syncCustomGarmentToCloud({
      action: 'save',
      slug: garment.id,
      titleUz: garment.name_uz,
      category: garment.category,
      colorHex: garment.color,
      palette: garment.palettes[0] ?? 'sand',
      weather: garment.weather[0] ?? 'cool',
      occasion: garment.occasions[0] ?? 'office',
    });
  },

  removeCustomGarment: (id) => {
    const nextCustom = get().customGarments.filter((g) => g.id !== id);
    safeWriteStorage(STORAGE_CUSTOM_GARMENTS_KEY, nextCustom);
    const merged = mergeManifestWithCustom(get().baseManifest, nextCustom);
    const prevSlots = get().slots;
    const nextSlots: BoardSlots = { ...prevSlots };
    for (const k of Object.keys(nextSlots) as SlotKey[]) {
      if (nextSlots[k] === id) nextSlots[k] = null;
    }
    set({ customGarments: nextCustom, manifest: merged, slots: nextSlots });
    void syncCustomGarmentToCloud({ action: 'delete', slug: id });
  },

  setDayPlan: (dateStr, itemIds) => {
    const nextPlan = { ...get().weeklyPlan, [dateStr]: itemIds };
    safeWriteStorage(STORAGE_WEEKLY_PLAN_KEY, nextPlan);
    set({ weeklyPlan: nextPlan });
  },

  togglePackingItem: (itemId) => {
    const prev = get().packingChecked;
    const next = { ...prev, [itemId]: !prev[itemId] };
    safeWriteStorage(STORAGE_PACKING_KEY, next);
    set({ packingChecked: next });
  },

  setTheme: (theme) => {
    const presetId: DesignThemeId = theme === 'dark' ? 'noir-luxury' : 'editorial-sand';
    get().setDesignTheme(presetId);
  },

  setDesignTheme: (id) => {
    const colorScheme = applyDesignThemeToDocument(id);
    try {
      window.localStorage.setItem(STORAGE_DESIGN_THEME_KEY, id);
      window.localStorage.setItem(STORAGE_THEME_KEY, colorScheme);
    } catch {
      // ignore
    }
    set({ designTheme: id, theme: colorScheme });
  },

  setLanguage: (language) => {
    try {
      window.localStorage.setItem(STORAGE_LANG_KEY, language);
    } catch {
      // ignore
    }
    set({ language });
  },

  toggleTheme: () => {
    const next: DesignThemeId = get().theme === 'dark' ? 'editorial-sand' : 'noir-luxury';
    get().setDesignTheme(next);
  },

  setLocation: (location) => {
    safeWriteStorage(STORAGE_LOC_KEY, location);
    set({ location });
  },

  setWeatherLoading: (weatherLoading) => set({ weatherLoading }),

  setLiveWeather: (analysis, applyToQuery = true) => {
    const state = get();
    safeWriteStorage(STORAGE_LOC_KEY, analysis.location);
    if (applyToQuery) {
      const nextQuery: StylistQuery = {
        ...state.query,
        weather: analysis.weatherBand,
        rain: analysis.rain,
      };
      safeWriteStorage(STORAGE_FILTERS_KEY, nextQuery);
      const recs = recommendOutfits(state.manifest, nextQuery);
      set({
        location: analysis.location,
        liveWeather: analysis,
        weatherLoading: false,
        query: nextQuery,
        temperatureC: analysis.temperatureC,
        // Refresh board if user hasn't manually edited or URL wasn't pinned
        slots: state.past.length === 0 && !initialParsed.urlItems ? (recs.outfits[0]?.slots ?? state.slots) : state.slots,
      });
    } else {
      set({
        location: analysis.location,
        liveWeather: analysis,
        weatherLoading: false,
      });
    }
  },

  setAutoWeatherEnabled: (autoWeatherEnabled) => {
    const { liveWeather } = get();
    if (autoWeatherEnabled && liveWeather) {
      get().setLiveWeather(liveWeather, true);
    }
    set({ autoWeatherEnabled });
  },

  setManifestData: (rawManifest, isSampleData, hasWebpAssets = false) => {
    const state = get();
    const merged = mergeManifestWithCustom(rawManifest, state.customGarments);
    const byId = new Map(merged.garments.map((g) => [g.id, g]));

    if (initialParsed.urlItems && !state.manifestLoaded) {
      const info = resolveItemsToBoard(initialParsed.urlItems, byId);
      set({
        baseManifest: rawManifest,
        manifest: merged,
        isSampleData,
        hasWebpAssets,
        manifestLoaded: true,
        slots: info.slots,
        missingIdsNotice: info.missingCount > 0,
      });
      return;
    }

    const recs = recommendOutfits(merged, state.query);
    set({
      baseManifest: rawManifest,
      manifest: merged,
      isSampleData,
      hasWebpAssets,
      manifestLoaded: true,
      slots: state.past.length === 0 ? (recs.outfits[0]?.slots ?? state.slots) : state.slots,
    });
  },

  updateQuery: (patch, tempC, disableAuto = false) => {
    const prev = get().query;
    const next: StylistQuery = { ...prev, ...patch };
    safeWriteStorage(STORAGE_FILTERS_KEY, next);
    set({
      query: next,
      autoWeatherEnabled: disableAuto ? false : get().autoWeatherEnabled,
      temperatureC: tempC ?? (patch.weather ? weatherBandDefaultTemp(patch.weather) : get().temperatureC),
    });
  },

  setTemperatureC: (tempC, band, disableAuto = true) => {
    const nextQuery: StylistQuery = { ...get().query, weather: band };
    safeWriteStorage(STORAGE_FILTERS_KEY, nextQuery);
    set({
      temperatureC: tempC,
      query: nextQuery,
      autoWeatherEnabled: disableAuto ? false : get().autoWeatherEnabled,
    });
  },

  setBoardSlots: (nextSlots, recordHistory = true) => {
    const { slots, past } = get();
    if (JSON.stringify(slots) === JSON.stringify(nextSlots)) return;
    if (!recordHistory) {
      set({ slots: nextSlots });
      return;
    }
    const nextPast = [...past, slots].slice(-MAX_HISTORY);
    set({ slots: nextSlots, past: nextPast, future: [] });
  },

  placeGarmentOnBoard: (garment, preferredSlot) => {
    const { slots, setBoardSlots } = get();
    const next: BoardSlots = { ...slots };

    if (garment.category === 'dress') {
      next.dress = garment.id;
      next.top = null;
      next.bottom = null;
    } else if (garment.category === 'top') {
      next.top = garment.id;
      next.dress = null;
    } else if (garment.category === 'bottom') {
      next.bottom = garment.id;
      next.dress = null;
    } else if (garment.category === 'outerwear') {
      next.outerwear = garment.id;
    } else if (garment.category === 'shoes') {
      next.shoes = garment.id;
    } else if (garment.category === 'bag') {
      next.bag = garment.id;
    } else if (garment.category === 'accessory') {
      if (preferredSlot === 'accessory1' || preferredSlot === 'accessory2') {
        const other = preferredSlot === 'accessory1' ? 'accessory2' : 'accessory1';
        if (next[other] === garment.id) next[other] = null;
        next[preferredSlot] = garment.id;
      } else if (next.accessory1 === garment.id || next.accessory2 === garment.id) {
        return;
      } else if (!next.accessory1) {
        next.accessory1 = garment.id;
      } else if (!next.accessory2) {
        next.accessory2 = garment.id;
      } else {
        next.accessory2 = garment.id;
      }
    }

    setBoardSlots(next, true);
  },

  removeSlot: (slot) => {
    const { slots, setBoardSlots } = get();
    if (!slots[slot]) return;
    setBoardSlots({ ...slots, [slot]: null }, true);
  },

  clearBoard: () => {
    get().setBoardSlots({ ...EMPTY_BOARD }, true);
  },

  undo: () => {
    const { past, slots, future } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1]!;
    set({
      slots: previous,
      past: past.slice(0, -1),
      future: [slots, ...future].slice(0, MAX_HISTORY),
    });
  },

  redo: () => {
    const { past, slots, future } = get();
    if (future.length === 0) return;
    const next = future[0]!;
    set({
      slots: next,
      past: [...past, slots].slice(-MAX_HISTORY),
      future: future.slice(1),
    });
  },

  loadItemsToBoard: (itemIds) => {
    const byId = new Map(get().manifest.garments.map((g) => [g.id, g]));
    const { slots, missingCount } = resolveItemsToBoard(itemIds, byId);
    get().setBoardSlots(slots, true);
    if (missingCount > 0) set({ missingIdsNotice: true });
  },

  saveOutfit: (itemIds, title) => {
    const cleaned = Array.from(new Set(itemIds.filter(Boolean)));
    if (cleaned.length === 0) return false;
    const { savedOutfits, query, manifest } = get();
    const id = `saved-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const outfitTitle = title ?? `Kapsula № ${savedOutfits.length + 1}`;
    const entry: SavedOutfit = {
      id,
      title: outfitTitle,
      createdAt: new Date().toISOString(),
      items: cleaned,
      query: { ...query },
    };
    const next = [entry, ...savedOutfits].slice(0, MAX_SAVED_OUTFITS);
    safeWriteStorage(STORAGE_SAVED_KEY, next);
    set({ savedOutfits: next });

    const byId = new Map(manifest.garments.map((g) => [g.id, g]));
    const items = cleaned.map((gid) => byId.get(gid)).filter((g): g is Garment => Boolean(g));
    const pal = manifest.palettes.find((p) => p.id === query.palette);
    const score = items.length > 0 ? analyzeGarmentsHarmony(items, pal).score : 85;
    void syncOutfitToCloud({
      action: 'save',
      title: outfitTitle,
      items: cleaned,
      score,
      weather: query.weather,
      occasion: query.occasion,
      palette: query.palette,
    }).then((res) => {
      const cloudId = res?.outfit?.id;
      if (!cloudId) return;
      const updated = get().savedOutfits.map((s) => (s.id === id ? { ...s, cloudId } : s));
      safeWriteStorage(STORAGE_SAVED_KEY, updated);
      set({ savedOutfits: updated });
    });

    return true;
  },

  deleteSavedOutfit: (id) => {
    const target = get().savedOutfits.find((s) => s.id === id);
    const next = get().savedOutfits.filter((s) => s.id !== id);
    safeWriteStorage(STORAGE_SAVED_KEY, next);
    set({ savedOutfits: next });
    if (target?.cloudId) {
      void syncOutfitToCloud({ action: 'delete', id: target.cloudId });
    }
  },

  incrementRandomSeed: () => {
    const next = get().randomSeedCounter + 1;
    set({ randomSeedCounter: next });
    return next;
  },

  setActiveLookId: (activeLookId) => set({ activeLookId }),

  setScoreAnnouncement: (lastScoreAnnouncement) => set({ lastScoreAnnouncement }),

  dismissMissingNotice: () => set({ missingIdsNotice: false }),

  buildShareUrl: () => {
    const { query, slots, manifest } = get();
    const byId = new Map(manifest.garments.map((g) => [g.id, g]));
    const itemIds = boardSlotsToGarments(slots, byId).map((g) => g.id);
    const params = new URLSearchParams();
    params.set('wx', query.weather);
    params.set('oc', query.occasion);
    params.set('pal', query.palette);
    params.set('g', query.gender);
    if (itemIds.length > 0) params.set('items', itemIds.join(','));
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}?${params.toString()}#atelye`;
  },
}));
