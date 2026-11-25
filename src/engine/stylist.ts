import type {
  Category,
  Garment,
  Look,
  Manifest,
  Occasion,
  Palette,
  PaletteId,
  UserGenderFilter,
  WeatherBand,
} from '../data/schema';
import { UZ } from '../i18n/uz';
import { analyzeGarmentsHarmony, classifyColor, oklabDistance, type HarmonyAnalysis } from './color';
import { STYLIST_CONFIG } from './config';

export interface StylistQuery {
  weather: WeatherBand;
  rain: boolean;
  occasion: Occasion;
  palette: PaletteId | 'any';
  gender: UserGenderFilter;
}

export interface BoardSlots {
  outerwear: string | null;
  top: string | null;
  bottom: string | null;
  dress: string | null;
  shoes: string | null;
  bag: string | null;
  accessory1: string | null;
  accessory2: string | null;
}

export type SlotKey = keyof BoardSlots;

export const EMPTY_BOARD: BoardSlots = {
  outerwear: null,
  top: null,
  bottom: null,
  dress: null,
  shoes: null,
  bag: null,
  accessory1: null,
  accessory2: null,
};

export interface OutfitReason {
  weather: WeatherBand;
  rain: boolean;
  occasion: Occasion;
  schemeKey: HarmonyAnalysis['schemeKey'];
  hasCrimsonAccent: boolean;
}

export interface OutfitRecommendation {
  id: string;
  garments: Garment[];
  slots: BoardSlots;
  harmony: HarmonyAnalysis;
  totalScore: number;
  occasionFit: number;
  weatherFit: number;
  paletteFit: number;
  note: string;
  reasons: OutfitReason;
  matchedLook: Look | null;
  lookOverlapRatio: number;
}

export interface StylistResponse {
  outfits: OutfitRecommendation[];
  inspirationLooks: Array<{ look: Look; overlap: number }>;
  relaxationNotice: string | null;
  relaxedSteps: Array<'palette' | 'occasion' | 'weather'>;
}

const WEATHER_ORDER: WeatherBand[] = ['hot', 'warm', 'cool', 'cold'];

const categoryIndexCache = new WeakMap<Garment[], Record<Category, Garment[]>>();
const byIdCache = new WeakMap<Garment[], Map<string, Garment>>();

function getGarmentMap(garments: Garment[]): Map<string, Garment> {
  let map = byIdCache.get(garments);
  if (!map) {
    map = new Map(garments.map((g) => [g.id, g]));
    byIdCache.set(garments, map);
  }
  return map;
}

function getGarmentsByCategory(garments: Garment[], category: Category): Garment[] {
  let index = categoryIndexCache.get(garments);
  if (!index) {
    index = {
      outerwear: [],
      top: [],
      bottom: [],
      dress: [],
      shoes: [],
      bag: [],
      accessory: [],
    };
    for (const g of garments) {
      index[g.category].push(g);
    }
    categoryIndexCache.set(garments, index);
  }
  return index[category];
}

export function isGarmentGenderEligible(garment: Garment, gender: UserGenderFilter): boolean {
  if (gender === 'all') return true;
  if (gender === 'w') return garment.gender === 'w' || garment.gender === 'u';
  return garment.gender === 'u' || garment.gender === 'm';
}

export function getAdjacentWeathers(weather: WeatherBand): WeatherBand[] {
  const idx = WEATHER_ORDER.indexOf(weather);
  const adjacent: WeatherBand[] = [weather];
  if (idx > 0) adjacent.push(WEATHER_ORDER[idx - 1]!);
  if (idx < WEATHER_ORDER.length - 1) adjacent.push(WEATHER_ORDER[idx + 1]!);
  return adjacent;
}

function deterministicHash(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickVariant(variants: readonly string[], seed: number): string {
  if (variants.length === 0) return '';
  return variants[seed % variants.length]!;
}

/**
 * Generates a deterministic two-sentence Uzbek stylist note from structured reasons.
 */
export function buildStylistNote(reason: OutfitReason, outfitKey: string): string {
  const seed = deterministicHash(outfitKey);

  const sentence1 = reason.rain
    ? pickVariant(UZ.stylist.weatherPhrases.rain, seed)
    : pickVariant(UZ.stylist.weatherPhrases[reason.weather], seed);

  let schemePool: readonly string[];
  if (reason.schemeKey === 'neutral') {
    schemePool = UZ.stylist.schemePhrases.neutral;
  } else if (reason.schemeKey === 'neutralAccent') {
    schemePool = reason.hasCrimsonAccent
      ? UZ.stylist.schemePhrases.crimsonAccent
      : UZ.stylist.schemePhrases.accent;
  } else if (reason.schemeKey === 'monochrome') {
    schemePool = UZ.stylist.schemePhrases.monochrome;
  } else if (reason.schemeKey === 'analog') {
    schemePool = UZ.stylist.schemePhrases.analog;
  } else {
    schemePool = UZ.stylist.schemePhrases.harmonic;
  }

  const sentence2 = pickVariant(schemePool, seed >>> 3);
  return `${sentence1} ${sentence2}`;
}

function isOpenOrWhiteFootwear(garment: Garment): boolean {
  if (garment.category !== 'shoes') return false;
  const c = classifyColor(garment.color);
  const nameLower = `${garment.name_en} ${garment.name_uz}`.toLowerCase();
  const looksOpen =
    garment.warmth === 0 ||
    nameLower.includes('sandal') ||
    nameLower.includes('open');
  const looksWhite = c.l > 0.88 && c.c < 0.03;
  return looksOpen || looksWhite;
}

function scoreSingleCandidate(
  g: Garment,
  query: StylistQuery,
  relaxPalette: boolean,
  relaxOccasion: boolean,
  relaxWeather: boolean,
): number {
  let score = 0;

  // Weather match
  if (g.weather.includes(query.weather)) {
    score += 3;
  } else if (relaxWeather) {
    const adj = getAdjacentWeathers(query.weather);
    if (adj.some((w) => g.weather.includes(w))) score += 1.2;
  }

  // Warmth suitability
  if (query.weather === 'cold') {
    if (g.category === 'outerwear') score += g.warmth === 3 ? 4 : g.warmth === 2 ? 1 : -3;
    if (g.category === 'top') score += g.warmth >= 2 ? 3 : -2;
    if (g.category === 'shoes') score += g.warmth >= 2 ? 3 : -2;
    if (g.category === 'accessory') score += g.warmth >= 2 ? 3 : 0;
  } else if (query.weather === 'cool') {
    if (g.category === 'outerwear') score += g.warmth >= 2 ? 2.5 : 1.5;
    if (g.category === 'top') score += g.warmth >= 1 ? 1.5 : 0.5;
  } else if (query.weather === 'hot') {
    score += g.warmth === 0 ? 3 : g.warmth === 1 ? 1.5 : -3;
  } else {
    // warm
    score += g.warmth <= 1 ? 2 : g.warmth === 2 ? 0.8 : -1;
  }

  // Rain adjustments
  if (query.rain) {
    if (g.weather.includes('rain')) score += 3.5;
    if (g.category === 'outerwear') score += 2;
    if (isOpenOrWhiteFootwear(g)) score -= 5;
  }

  // Occasion & formality
  const targetF = STYLIST_CONFIG.targetFormality[query.occasion];
  const fDiff = Math.abs(g.formality - targetF);
  if (g.occasions.includes(query.occasion)) {
    score += 3 - fDiff * 0.6;
  } else if (relaxOccasion) {
    score += Math.max(0, 1.5 - fDiff * 0.7);
  }

  // Bag specialization by occasion
  if (g.category === 'bag') {
    const lower = `${g.name_en} ${g.name_uz}`.toLowerCase();
    if (
      (query.occasion === 'party' || query.occasion === 'date') &&
      (lower.includes('clutch') || lower.includes('klatch') || lower.includes('crossbody') || g.formality >= 2)
    ) {
      score += 2.5;
    } else if (
      (query.occasion === 'school' || query.occasion === 'university' || query.occasion === 'sport' || query.occasion === 'travel') &&
      (lower.includes('backpack') || lower.includes('ryukzak') || lower.includes('tote') || lower.includes('crossbody'))
    ) {
      score += 2.5;
    } else if (query.occasion === 'office' && (lower.includes('tote') || lower.includes('crossbody') || g.formality >= 2)) {
      score += 2;
    }
  }

  // Palette fit
  if (query.palette !== 'any') {
    if (g.palettes.includes(query.palette)) {
      score += 3;
    } else if (!relaxPalette) {
      score -= 4;
    } else {
      const c = classifyColor(g.color);
      if (c.role === 'neutral') score += 1.5;
    }
  }

  return score;
}

function getSlotCandidates(
  garments: Garment[],
  category: Category,
  query: StylistQuery,
  relaxPalette: boolean,
  relaxOccasion: boolean,
  relaxWeather: boolean,
): Garment[] {
  const allowedWeathers = relaxWeather ? getAdjacentWeathers(query.weather) : [query.weather];
  const categoryList = getGarmentsByCategory(garments, category);

  const matching = categoryList.filter((g) => {
    if (!isGarmentGenderEligible(g, query.gender)) return false;

    const paletteOk =
      query.palette === 'any' || relaxPalette || g.palettes.includes(query.palette);
    const occasionOk = relaxOccasion || g.occasions.includes(query.occasion);
    const weatherOk = allowedWeathers.some((w) => g.weather.includes(w));

    return paletteOk && occasionOk && weatherOk;
  });

  // Fallback for cold/rain if strict filters left zero candidates in a required slot
  const pool =
    matching.length > 0
      ? matching
      : categoryList.filter(
          (g) =>
            isGarmentGenderEligible(g, query.gender) &&
            (query.palette === 'any' || relaxPalette || g.palettes.includes(query.palette)),
        );

  return pool
    .map((g) => ({
      g,
      s: scoreSingleCandidate(g, query, relaxPalette, relaxOccasion, relaxWeather),
    }))
    .sort((a, b) => (b.s !== a.s ? b.s - a.s : a.g.id.localeCompare(b.g.id)))
    .slice(0, STYLIST_CONFIG.topKPerSlot)
    .map((entry) => entry.g);
}

export function garmentsToBoardSlots(garments: Garment[]): BoardSlots {
  const slots: BoardSlots = { ...EMPTY_BOARD };
  let hasDress = false;

  for (const g of garments) {
    if (g.category === 'dress') {
      slots.dress = g.id;
      slots.top = null;
      slots.bottom = null;
      hasDress = true;
    } else if (g.category === 'top' && !hasDress && !slots.top) {
      slots.top = g.id;
    } else if (g.category === 'bottom' && !hasDress && !slots.bottom) {
      slots.bottom = g.id;
    } else if (g.category === 'outerwear' && !slots.outerwear) {
      slots.outerwear = g.id;
    } else if (g.category === 'shoes' && !slots.shoes) {
      slots.shoes = g.id;
    } else if (g.category === 'bag' && !slots.bag) {
      slots.bag = g.id;
    } else if (g.category === 'accessory') {
      if (!slots.accessory1) slots.accessory1 = g.id;
      else if (!slots.accessory2) slots.accessory2 = g.id;
    }
  }
  return slots;
}

export function boardSlotsToGarments(slots: BoardSlots, byId: Map<string, Garment>): Garment[] {
  const orderedKeys: SlotKey[] = [
    'outerwear',
    'dress',
    'top',
    'bottom',
    'shoes',
    'bag',
    'accessory1',
    'accessory2',
  ];
  const list: Garment[] = [];
  for (const key of orderedKeys) {
    const id = slots[key];
    if (id) {
      const g = byId.get(id);
      if (g) list.push(g);
    }
  }
  return list;
}

function computeLookOverlap(outfitIds: string[], look: Look): number {
  if (outfitIds.length === 0 || look.items.length === 0) return 0;
  const setA = new Set(outfitIds);
  let matches = 0;
  for (const id of look.items) {
    if (setA.has(id)) matches++;
  }
  const denom = Math.max(outfitIds.length, look.items.length);
  return matches / denom;
}

function evaluateCombo(
  items: Garment[],
  query: StylistQuery,
  paletteObj: Palette | null,
  manifest: Manifest,
): OutfitRecommendation {
  const harmony = analyzeGarmentsHarmony(items, paletteObj);

  // Occasion fit (mean formality vs target)
  const targetF = STYLIST_CONFIG.targetFormality[query.occasion];
  const meanFormality = items.reduce((sum, g) => sum + g.formality, 0) / items.length;
  const tagOccasionRatio =
    items.filter((g) => g.occasions.includes(query.occasion)).length / items.length;
  const occasionFit = Math.max(
    0,
    Math.min(1, (1 - Math.abs(meanFormality - targetF) / 3) * 0.7 + tagOccasionRatio * 0.3),
  );

  // Weather fit (mean warmth over filled slots; outerwear counts 0 if absent)
  const hasOuterwear = items.some((g) => g.category === 'outerwear');
  const warmthSum = items.reduce((sum, g) => sum + g.warmth, 0);
  const slotCountForWarmth = hasOuterwear ? items.length : items.length + 1;
  const meanWarmth = warmthSum / slotCountForWarmth;
  const targetW = STYLIST_CONFIG.targetWarmth[query.weather];
  let weatherFit = Math.max(0, Math.min(1, 1 - Math.abs(meanWarmth - targetW) / 3));

  if (query.rain) {
    const hasRainTag = items.some((g) => g.weather.includes('rain'));
    const hasBadShoe = items.some((g) => isOpenOrWhiteFootwear(g));
    if (hasRainTag) weatherFit = Math.min(1, weatherFit + 0.12);
    if (hasBadShoe) weatherFit = Math.max(0, weatherFit - 0.35);
  }

  // Palette fit
  const paletteFit =
    paletteObj && harmony.breakdown.paletteFit !== null
      ? harmony.breakdown.paletteFit / 10
      : 0.85;

  const w = STYLIST_CONFIG.rankingWeights;
  let totalScore =
    w.colorHarmony * (harmony.score / 100) +
    w.occasionFit * occasionFit +
    w.weatherFit * weatherFit +
    w.paletteFit * paletteFit;

  // Check editorial look overlap & matching bonus
  const itemIds = items.map((g) => g.id);
  let bestLook: Look | null = null;
  let bestOverlap = 0;
  for (const look of manifest.looks) {
    if (query.gender !== 'all' && look.model !== query.gender) continue;
    const overlap = computeLookOverlap(itemIds, look);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestLook = look;
    }
    if (
      look.occasion === query.occasion &&
      look.weather === query.weather &&
      overlap >= STYLIST_CONFIG.lookOverlapThreshold
    ) {
      totalScore += STYLIST_CONFIG.editorialLookBonus;
    }
  }

  const matchedLook =
    bestLook && bestOverlap >= STYLIST_CONFIG.lookOverlapThreshold ? bestLook : null;

  const hasCrimsonAccent = items.some((g) => {
    const c = classifyColor(g.color);
    return c.role === 'chromatic' && c.h !== null && (c.h <= 30 || c.h >= 340);
  });

  const reasons: OutfitReason = {
    weather: query.weather,
    rain: query.rain,
    occasion: query.occasion,
    schemeKey: harmony.schemeKey,
    hasCrimsonAccent,
  };

  const sortedIds = [...itemIds].sort();
  const id = sortedIds.join('+');

  return {
    id,
    garments: items,
    slots: garmentsToBoardSlots(items),
    harmony,
    totalScore,
    occasionFit,
    weatherFit,
    paletteFit,
    note: buildStylistNote(reasons, id),
    reasons,
    matchedLook,
    lookOverlapRatio: bestOverlap,
  };
}

function generateCandidatesForLevel(
  manifest: Manifest,
  query: StylistQuery,
  paletteObj: Palette | null,
  relaxPalette: boolean,
  relaxOccasion: boolean,
  relaxWeather: boolean,
): OutfitRecommendation[] {
  const gList = manifest.garments;
  const byId = getGarmentMap(gList);

  const outerPool = getSlotCandidates(gList, 'outerwear', query, relaxPalette, relaxOccasion, relaxWeather);
  const topPool = getSlotCandidates(gList, 'top', query, relaxPalette, relaxOccasion, relaxWeather);
  const bottomPool = getSlotCandidates(gList, 'bottom', query, relaxPalette, relaxOccasion, relaxWeather);
  const dressPool = getSlotCandidates(gList, 'dress', query, relaxPalette, relaxOccasion, relaxWeather);
  const shoesPool = getSlotCandidates(gList, 'shoes', query, relaxPalette, relaxOccasion, relaxWeather);
  const bagPool = getSlotCandidates(gList, 'bag', query, relaxPalette, relaxOccasion, relaxWeather);
  const accPool = getSlotCandidates(gList, 'accessory', query, relaxPalette, relaxOccasion, relaxWeather);

  const combos: Garment[][] = [];
  const seenKeys = new Set<string>();

  const pushCombo = (items: Garment[]) => {
    // Ensure required slots for weather are satisfied
    if (!items.some((g) => g.category === 'shoes')) return;
    const hasBase =
      items.some((g) => g.category === 'dress') ||
      (items.some((g) => g.category === 'top') && items.some((g) => g.category === 'bottom'));
    if (!hasBase) return;
    if (query.weather === 'hot' && items.some((g) => g.category === 'outerwear')) return;
    if ((query.weather === 'cool' || query.weather === 'cold') && !items.some((g) => g.category === 'outerwear')) {
      return;
    }
    const key = items
      .map((i) => i.id)
      .sort()
      .join('|');
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    combos.push(items);
  };

  // Inject matching editorial looks first (when gender & weather slot rules allow)
  for (const look of manifest.looks) {
    if (query.gender === 'm' && look.model !== 'm') continue;
    if (query.gender === 'w' && look.model !== 'w') continue;
    const lookItems = look.items
      .map((id) => byId.get(id))
      .filter((g): g is Garment => Boolean(g))
      .filter((g) => isGarmentGenderEligible(g, query.gender));
    if (lookItems.length >= 3) {
      pushCombo(lookItems);
    }
  }

  // Outerwear options based on weather
  const outerChoices: Array<Garment | null> =
    query.weather === 'hot'
      ? [null]
      : query.weather === 'warm'
        ? query.occasion === 'office' || query.occasion === 'party' || query.rain
          ? [...outerPool.slice(0, 2), null]
          : [null, ...outerPool.slice(0, 2)]
        : outerPool.slice(0, 3);

  const bagChoices: Array<Garment | null> =
    query.occasion === 'walk' || query.occasion === 'sport'
      ? [null, ...(bagPool[0] ? [bagPool[0]] : [])]
      : bagPool.length > 0
        ? bagPool.slice(0, 2)
        : [null];

  const accChoices: Array<Garment | null> =
    query.weather === 'cold' && accPool.length > 0
      ? accPool.slice(0, 2)
      : [accPool[0] ?? null, null];

  // Top + Bottom combinations
  for (const outer of outerChoices) {
    for (const top of topPool.slice(0, 3)) {
      for (const bottom of bottomPool.slice(0, 3)) {
        for (const shoes of shoesPool.slice(0, 2)) {
          for (const bag of bagChoices) {
            for (const acc of accChoices) {
              const items: Garment[] = [top, bottom, shoes];
              if (outer) items.push(outer);
              if (bag) items.push(bag);
              if (acc) items.push(acc);
              pushCombo(items);
            }
          }
        }
      }
    }
  }

  // Dress combinations (only when gender allows women's / dress items)
  if (dressPool.length > 0 && query.gender !== 'm') {
    for (const outer of outerChoices) {
      for (const dress of dressPool.slice(0, 2)) {
        for (const shoes of shoesPool.slice(0, 2)) {
          for (const bag of bagChoices) {
            const items: Garment[] = [dress, shoes];
            if (outer) items.push(outer);
            if (bag) items.push(bag);
            const firstAcc = accPool[0];
            if (firstAcc) items.push(firstAcc);
            pushCombo(items);
          }
        }
      }
    }
  }

  return combos
    .map((items) => evaluateCombo(items, query, paletteObj, manifest))
    .sort((a, b) => {
      const diff = b.totalScore - a.totalScore;
      return Math.abs(diff) > 1e-6 ? diff : a.id.localeCompare(b.id);
    });
}

function itemDiffCount(a: OutfitRecommendation, b: OutfitRecommendation): number {
  const setA = new Set(a.garments.map((g) => g.id));
  const setB = new Set(b.garments.map((g) => g.id));
  let diff = 0;
  for (const id of setA) if (!setB.has(id)) diff++;
  for (const id of setB) if (!setA.has(id)) diff++;
  return diff;
}

function selectDiverseOutfits(
  ranked: OutfitRecommendation[],
  limit: number,
): OutfitRecommendation[] {
  const selected: OutfitRecommendation[] = [];

  for (const cand of ranked) {
    if (selected.length >= limit) break;
    const isDiverse = selected.every(
      (s) => itemDiffCount(s, cand) >= STYLIST_CONFIG.minItemDifference,
    );
    if (isDiverse) {
      selected.push(cand);
    }
  }

  // If strict >= 2 diff yielded < 3 outfits, backfill with >= 1 diff to guarantee >= 3
  if (selected.length < 3) {
    for (const cand of ranked) {
      if (selected.length >= 3) break;
      if (!selected.some((s) => s.id === cand.id)) {
        selected.push(cand);
      }
    }
  }

  return selected;
}

/**
 * Main deterministic Stylist recommendation entry point.
 * Relaxes filters strictly in order: palette -> occasion -> weather (±1 band), never gender.
 */
export function recommendOutfits(manifest: Manifest, query: StylistQuery): StylistResponse {
  const paletteObj =
    query.palette === 'any'
      ? null
      : manifest.palettes.find((p) => p.id === query.palette) ?? null;

  const levels: Array<{
    relaxPalette: boolean;
    relaxOccasion: boolean;
    relaxWeather: boolean;
    step: 'palette' | 'occasion' | 'weather' | null;
  }> = [
    { relaxPalette: false, relaxOccasion: false, relaxWeather: false, step: null },
    { relaxPalette: true, relaxOccasion: false, relaxWeather: false, step: 'palette' },
    { relaxPalette: true, relaxOccasion: true, relaxWeather: false, step: 'occasion' },
    { relaxPalette: true, relaxOccasion: true, relaxWeather: true, step: 'weather' },
  ];

  let chosen: OutfitRecommendation[] = [];
  const relaxedSteps: Array<'palette' | 'occasion' | 'weather'> = [];

  for (const level of levels) {
    if (level.step && level.step === 'palette' && query.palette === 'any') {
      continue;
    }
    const candidates = generateCandidatesForLevel(
      manifest,
      query,
      paletteObj,
      level.relaxPalette,
      level.relaxOccasion,
      level.relaxWeather,
    );
    const diverse = selectDiverseOutfits(candidates, STYLIST_CONFIG.maxResults);
    if (diverse.length > chosen.length) {
      chosen = diverse;
    }
    if (chosen.length >= 3) {
      if (level.step) relaxedSteps.push(level.step);
      break;
    }
    if (level.step && !relaxedSteps.includes(level.step)) {
      relaxedSteps.push(level.step);
    }
  }

  let relaxationNotice: string | null = null;
  if (relaxedSteps.length > 0) {
    const parts: string[] = [];
    if (relaxedSteps.includes('palette')) parts.push(UZ.stylist.relaxedPalette);
    if (relaxedSteps.includes('occasion')) parts.push(UZ.stylist.relaxedOccasion);
    if (relaxedSteps.includes('weather')) parts.push(UZ.stylist.relaxedWeather);
    relaxationNotice = `${UZ.stylist.relaxedPrefix} ${parts.join(', ')}.`;
  }

  // Compute nearest 3 inspiration looks
  const topIds = chosen[0]?.garments.map((g) => g.id) ?? [];
  const inspirationLooks = [...manifest.looks]
    .map((look) => {
      let score = computeLookOverlap(topIds, look);
      if (look.occasion === query.occasion) score += 0.35;
      if (look.weather === query.weather) score += 0.3;
      if (query.palette !== 'any' && look.palette === query.palette) score += 0.25;
      if (query.gender === 'all' || look.model === query.gender) score += 0.25;
      return { look, overlap: score };
    })
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 3);

  return {
    outfits: chosen,
    inspirationLooks,
    relaxationNotice,
    relaxedSteps,
  };
}

export interface AutoHarmonizeSuggestion {
  slot: SlotKey;
  garment: Garment;
  currentScore: number;
  newScore: number;
  delta: number;
}

/**
 * Evaluates every eligible single-slot swap on the current board and returns the highest gain.
 */
export function findBestHarmonizeSwap(
  slots: BoardSlots,
  manifest: Manifest,
  palette: Palette | null,
  gender: UserGenderFilter,
): AutoHarmonizeSuggestion | null {
  const byId = new Map(manifest.garments.map((g) => [g.id, g]));
  const currentGarments = boardSlotsToGarments(slots, byId);
  if (currentGarments.length < 2) return null;

  const currentScore = analyzeGarmentsHarmony(currentGarments, palette).score;
  let best: AutoHarmonizeSuggestion | null = null;

  const targetSlots: Array<{ slot: SlotKey; category: Category }> = slots.dress
    ? [
        { slot: 'outerwear', category: 'outerwear' },
        { slot: 'dress', category: 'dress' },
        { slot: 'shoes', category: 'shoes' },
        { slot: 'bag', category: 'bag' },
        { slot: 'accessory1', category: 'accessory' },
        { slot: 'accessory2', category: 'accessory' },
      ]
    : [
        { slot: 'outerwear', category: 'outerwear' },
        { slot: 'top', category: 'top' },
        { slot: 'bottom', category: 'bottom' },
        { slot: 'shoes', category: 'shoes' },
        { slot: 'bag', category: 'bag' },
        { slot: 'accessory1', category: 'accessory' },
        { slot: 'accessory2', category: 'accessory' },
      ];

  for (const { slot, category } of targetSlots) {
    const existingId = slots[slot];
    // Only consider active slots (or accessory1/bag if empty when core slots are filled)
    if (!existingId && slot !== 'shoes' && slot !== 'top' && slot !== 'bottom') continue;

    const categoryList = getGarmentsByCategory(manifest.garments, category);
    const seenColors = new Set<string>();
    const candidates = categoryList
      .filter(
        (g) =>
          g.id !== existingId &&
          g.id !== slots.accessory1 &&
          g.id !== slots.accessory2 &&
          isGarmentGenderEligible(g, gender),
      )
      .filter((g) => {
        // Deduplicate by color+palettes key so 2000+ catalog swaps evaluate in <5ms
        const key = `${g.color}:${g.palettes[0] ?? ''}`;
        if (seenColors.has(key)) return false;
        seenColors.add(key);
        return true;
      })
      .slice(0, 32);

    for (const candidate of candidates) {
      const nextSlots: BoardSlots = { ...slots, [slot]: candidate.id };
      const nextGarments = boardSlotsToGarments(nextSlots, byId);
      const nextScore = analyzeGarmentsHarmony(nextGarments, palette).score;
      const delta = nextScore - currentScore;

      if (!best || delta > best.delta) {
        best = {
          slot,
          garment: candidate,
          currentScore,
          newScore: nextScore,
          delta,
        };
      }
    }
  }

  return best;
}

/**
 * Generates a deterministic seeded harmonious outfit from the manifest.
 */
export function generateSeededOutfit(
  manifest: Manifest,
  query: StylistQuery,
  seed: number,
): OutfitRecommendation | null {
  const response = recommendOutfits(manifest, query);
  if (response.outfits.length === 0) return null;
  const index = Math.abs(seed) % response.outfits.length;
  return response.outfits[index] ?? response.outfits[0] ?? null;
}

/**
 * Finds nearest garments by OKLab distance to one or more target hex colors.
 */
export function findNearestGarmentsByColor(
  garments: Garment[],
  targetHexes: string[],
  limit = 6,
): Array<{ garment: Garment; distance: number }> {
  if (targetHexes.length === 0) return [];
  return garments
    .map((garment) => {
      const minDist = Math.min(
        ...targetHexes.map((hex) => oklabDistance(garment.color, hex)),
      );
      return { garment, distance: minDist };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

export interface SmartPairingAdvice {
  summaryUz: string;
  recommendedAdd: Garment | null;
  recommendedCategoryLabel: string;
  projectedScore: number;
  scoreGain: number;
}

/**
 * Inspects current board/photo items and tells the user clearly what missing piece
 * (e.g., a watch, sneakers, jacket, or bag) would elevate the outfit.
 */
export function getSmartPairingAdvice(
  currentGarments: Garment[],
  manifest: Manifest,
  query: StylistQuery,
): SmartPairingAdvice | null {
  if (currentGarments.length === 0) return null;

  const palette =
    query.palette === 'any'
      ? null
      : manifest.palettes.find((p) => p.id === query.palette) ?? null;

  const currentScore = analyzeGarmentsHarmony(currentGarments, palette).score;
  const cats = new Set(currentGarments.map((g) => g.category));
  const ids = new Set(currentGarments.map((g) => g.id));

  // Determine the highest-value missing piece
  let targetCat: Category = 'accessory';
  let reasonLead = 'Qoʻshimcha detal bilan obrazni yakunlang:';

  if (!cats.has('shoes')) {
    targetCat = 'shoes';
    reasonLead = 'Poyabzal tanlanmagan —';
  } else if (!cats.has('bottom') && !cats.has('dress') && cats.has('top')) {
    targetCat = 'bottom';
    reasonLead = 'Yuqori qismga mos pastki qism qoʻshing:';
  } else if (!cats.has('top') && !cats.has('dress') && cats.has('bottom')) {
    targetCat = 'top';
    reasonLead = 'Shimga mos yuqori qism tanlang:';
  } else if ((query.weather === 'cool' || query.weather === 'cold' || query.rain) && !cats.has('outerwear')) {
    targetCat = 'outerwear';
    reasonLead = 'Ob-havo salqin/nam — ustki qatlam qoʻshsangiz:';
  } else if (!cats.has('bag') && query.occasion !== 'sport') {
    targetCat = 'bag';
    reasonLead = 'Kundalik qulaylik uchun sumka qoʻshilsa:';
  } else {
    targetCat = 'accessory';
    reasonLead = 'Obrazni boyitish uchun:';
  }

  const pool = getGarmentsByCategory(manifest.garments, targetCat)
    .filter((g) => !ids.has(g.id) && isGarmentGenderEligible(g, query.gender));

  // Sample diverse candidates across colors/subtypes
  const seen = new Set<string>();
  const shortlist = pool
    .filter((g) => {
      const k = `${g.color}:${g.id.split('-')[1] ?? ''}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 28);

  let bestItem: Garment | null = null;
  let bestScore = currentScore;

  for (const cand of shortlist) {
    const score = analyzeGarmentsHarmony([...currentGarments, cand], palette).score;
    const bonus =
      cand.occasions.includes(query.occasion) && cand.weather.includes(query.weather) ? 2 : 0;
    if (score + bonus > bestScore || !bestItem) {
      bestScore = score;
      bestItem = cand;
    }
  }

  if (!bestItem) return null;

  const gain = Math.max(0, bestScore - currentScore);
  const hasWatchOrAcc = bestItem.category === 'accessory';
  const summaryUz = hasWatchOrAcc
    ? `${reasonLead} «${bestItem.name_uz}» (${bestItem.brand ?? 'Kapsula'}) qoʻshilsa, koʻrinish juda tartibli chiqadi${gain > 0 ? ` (+${gain} ball)` : ''}.`
    : `${reasonLead} «${bestItem.name_uz}» (${bestItem.brand ?? 'Kapsula'}) bilan birlashtiring — uygʻunlik ${bestScore}/100 ga chiqadi.`;

  return {
    summaryUz,
    recommendedAdd: bestItem,
    recommendedCategoryLabel: UZ.categories[targetCat],
    projectedScore: bestScore,
    scoreGain: gain,
  };
}
