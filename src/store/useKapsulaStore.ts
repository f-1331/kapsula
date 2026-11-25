import { create } from 'zustand';
import {
  OccasionSchema,
  PaletteIdSchema,
  WeatherBandSchema,
  type Garment,
  type Manifest,
  type Occasion,
  type PaletteId,
  type WeatherBand,
} from '../data/schema';
import { SAMPLE_MANIFEST } from '../data/sample-manifest';
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
  DEFAULT_LOCATION,
  weatherBandDefaultTemp,
  type GeoLocationInfo,
  type LiveWeatherAnalysis,
} from '../utils/weather-api';

const STORAGE_FILTERS_KEY = 'kapsula_filters_v1';
const STORAGE_SAVED_KEY = 'kapsula_saved_v1';
const STORAGE_THEME_KEY = 'kapsula_theme_v1';
const STORAGE_LOC_KEY = 'kapsula_location_v1';
const MAX_SAVED_OUTFITS = 24;
const MAX_HISTORY = 40;

export type ThemeMode = 'light' | 'dark';

export interface SavedOutfit {
  id: string;
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

export function applyThemeToDocument(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'dark' ? '#11100E' : '#F5F1E8');
  }
}

function readInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(STORAGE_THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {
    // ignore
  }
  return 'light';
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
    return { query: merged, urlItems: null };
  }

  const params = new URLSearchParams(window.location.search);
  const wx = params.get('wx');
  const oc = params.get('oc');
  const pal = params.get('pal');
  const g = params.get('g');
  const itemsRaw = params.get('items');

  if (wx && WeatherBandSchema.safeParse(wx).success) merged.weather = wx as WeatherBand;
  if (oc && OccasionSchema.safeParse(oc).success) merged.occasion = oc as Occasion;
  if (pal === 'any' || (pal && PaletteIdSchema.safeParse(pal).success)) merged.palette = pal as PaletteId | 'any';
  if (g === 'w' || g === 'm' || g === 'all') merged.gender = g;

  const urlItems = itemsRaw
    ? itemsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : null;

  return { query: merged, urlItems };
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

const initialParsed = parseInitialQueryFromStorageOrUrl();
const initialRecs = recommendOutfits(SAMPLE_MANIFEST, initialParsed.query);
const initialById = new Map(SAMPLE_MANIFEST.garments.map((g) => [g.id, g]));
const initialTheme = readInitialTheme();
applyThemeToDocument(initialTheme);

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
  manifest: Manifest;
  isSampleData: boolean;
  hasWebpAssets: boolean;
  manifestLoaded: boolean;
  theme: ThemeMode;
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

  setTheme: (theme: ThemeMode) => void;
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
  manifest: SAMPLE_MANIFEST,
  isSampleData: true,
  hasWebpAssets: false,
  manifestLoaded: false,
  theme: initialTheme,
  location: readInitialLocation(),
  liveWeather: null,
  autoWeatherEnabled: !initialParsed.urlItems,
  weatherLoading: false,
  query: initialParsed.query,
  temperatureC: weatherBandDefaultTemp(initialParsed.query.weather),
  slots: initialBoardInfo.slots,
  past: [],
  future: [],
  savedOutfits: parseSavedOutfitsFromStorage(),
  missingIdsNotice: initialBoardInfo.missingCount > 0,
  randomSeedCounter: 1,
  activeLookId: null,
  lastScoreAnnouncement: '',

  setTheme: (theme) => {
    applyThemeToDocument(theme);
    try {
      window.localStorage.setItem(STORAGE_THEME_KEY, theme);
    } catch {
      // ignore
    }
    set({ theme });
  },

  toggleTheme: () => {
    const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
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

  setManifestData: (manifest, isSampleData, hasWebpAssets = false) => {
    const state = get();
    const byId = new Map(manifest.garments.map((g) => [g.id, g]));

    if (initialParsed.urlItems && !state.manifestLoaded) {
      const info = resolveItemsToBoard(initialParsed.urlItems, byId);
      set({
        manifest,
        isSampleData,
        hasWebpAssets,
        manifestLoaded: true,
        slots: info.slots,
        missingIdsNotice: info.missingCount > 0,
      });
      return;
    }

    const recs = recommendOutfits(manifest, state.query);
    set({
      manifest,
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
    const { savedOutfits, query } = get();
    const id = `saved-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const entry: SavedOutfit = {
      id,
      title: title ?? `Kapsula № ${savedOutfits.length + 1}`,
      createdAt: new Date().toISOString(),
      items: cleaned,
      query: { ...query },
    };
    const next = [entry, ...savedOutfits].slice(0, MAX_SAVED_OUTFITS);
    safeWriteStorage(STORAGE_SAVED_KEY, next);
    set({ savedOutfits: next });
    return true;
  },

  deleteSavedOutfit: (id) => {
    const next = get().savedOutfits.filter((s) => s.id !== id);
    safeWriteStorage(STORAGE_SAVED_KEY, next);
    set({ savedOutfits: next });
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
