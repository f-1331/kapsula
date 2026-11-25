import {
  differenceCiede2000,
  modeLab65,
  modeOklab,
  modeOklch,
  modeRgb,
  parse,
  useMode,
} from 'culori/fn';
import type { Category, Garment, Palette } from '../data/schema';
import { UZ } from '../i18n/uz';
import { COLOR_CONFIG } from './config';

// Register only required color spaces to keep bundle lean
const toRgb = useMode(modeRgb);
const toOklch = useMode(modeOklch);
const toOklab = useMode(modeOklab);
useMode(modeLab65);

const deltaE2000 = differenceCiede2000();

export type ColorRole = 'neutral' | 'soft' | 'chromatic';

export type ColorSchemeKey =
  | 'neutral'
  | 'neutralAccent'
  | 'monochrome'
  | 'analog'
  | 'complementary'
  | 'splitComplementary'
  | 'triadic'
  | 'clash';

export type TemperatureTone = 'warm' | 'cool' | 'neutral';

export interface OklchColor {
  hex: string;
  l: number;
  c: number;
  h: number | null;
  role: ColorRole;
  temperature: TemperatureTone;
}

export interface ColorInputItem {
  hex: string;
  weight: number;
  category?: Category;
}

export interface ProportionSlice {
  hex: string;
  share: number;
  role: ColorRole;
}

export interface WheelDot {
  hex: string;
  l: number;
  c: number;
  h: number | null;
  role: ColorRole;
  weight: number;
}

export interface HarmonyBreakdown {
  hueHarmony: number;
  lightnessStructure: number;
  statementBalance: number;
  warmCoolCoherence: number;
  paletteFit: number | null;
  rescaledWithoutPalette: boolean;
}

export interface HarmonyAnalysis {
  score: number;
  label: string;
  schemeKey: ColorSchemeKey;
  schemeName: string;
  breakdown: HarmonyBreakdown;
  proportions: ProportionSlice[];
  wheelDots: WheelDot[];
  hueClusters: number[];
  tips: string[];
}

const normalizeCache = new Map<string, string | null>();
const classifyCache = new Map<string, OklchColor>();
const oklabDistCache = new Map<string, number>();
const ciedeDistCache = new Map<string, number>();

export function normalizeHex(input: string): string | null {
  const key = input.trim();
  if (normalizeCache.has(key)) return normalizeCache.get(key) ?? null;
  const parsed = parse(key);
  if (!parsed) {
    normalizeCache.set(key, null);
    return null;
  }
  const rgb = toRgb(parsed);
  if (!rgb) {
    normalizeCache.set(key, null);
    return null;
  }
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n * 255)));
  const r = clamp(rgb.r).toString(16).padStart(2, '0');
  const g = clamp(rgb.g).toString(16).padStart(2, '0');
  const b = clamp(rgb.b).toString(16).padStart(2, '0');
  const result = `#${r}${g}${b}`.toUpperCase();
  if (normalizeCache.size < 2000) normalizeCache.set(key, result);
  return result;
}

export function getHueTemperature(hue: number | null, role: ColorRole): TemperatureTone {
  if (role === 'neutral' || hue === null) return 'neutral';
  // Warm sector: red/orange/yellow/yellow-green (315..360 and 0..125)
  // Cool sector: emerald-green/cyan/blue/violet (125..315)
  if (hue >= 315 || hue <= 125) return 'warm';
  return 'cool';
}

export function classifyColor(colorStr: string): OklchColor {
  const key = colorStr.trim();
  const cached = classifyCache.get(key);
  if (cached) return cached;

  const parsed = parse(key);
  const oklchColor = parsed ? toOklch(parsed) : undefined;
  const hex = normalizeHex(key) ?? '#808080';

  if (!oklchColor) {
    const fallback: OklchColor = { hex, l: 0.5, c: 0, h: null, role: 'neutral', temperature: 'neutral' };
    if (classifyCache.size < 2000) classifyCache.set(key, fallback);
    return fallback;
  }

  const l = oklchColor.l ?? 0;
  const c = oklchColor.c ?? 0;
  const h = typeof oklchColor.h === 'number' && Number.isFinite(oklchColor.h) ? oklchColor.h : null;

  const cfg = COLOR_CONFIG.classification;
  let role: ColorRole;

  if (
    c < cfg.neutralChromaMax ||
    (l < cfg.darkNeutralLightnessMax && c < cfg.darkNeutralChromaMax) ||
    (l > cfg.brightNeutralLightnessMin && c < cfg.brightNeutralChromaMax)
  ) {
    role = 'neutral';
  } else if (c < cfg.chromaticChromaMin) {
    role = 'soft';
  } else {
    role = 'chromatic';
  }

  const classified: OklchColor = {
    hex,
    l,
    c,
    h,
    role,
    temperature: getHueTemperature(h, role),
  };
  if (classifyCache.size < 2000) classifyCache.set(key, classified);
  return classified;
}

export function oklabDistance(hexA: string, hexB: string): number {
  const key = hexA < hexB ? `${hexA}|${hexB}` : `${hexB}|${hexA}`;
  const cached = oklabDistCache.get(key);
  if (cached !== undefined) return cached;

  const a = toOklab(parse(hexA));
  const b = toOklab(parse(hexB));
  if (!a || !b) return 1;
  const dl = (a.l ?? 0) - (b.l ?? 0);
  const da = (a.a ?? 0) - (b.a ?? 0);
  const db = (a.b ?? 0) - (b.b ?? 0);
  const dist = Math.sqrt(dl * dl + da * da + db * db);
  if (oklabDistCache.size < 4000) oklabDistCache.set(key, dist);
  return dist;
}

export function ciede2000Distance(hexA: string, hexB: string): number {
  const key = hexA < hexB ? `${hexA}|${hexB}` : `${hexB}|${hexA}`;
  const cached = ciedeDistCache.get(key);
  if (cached !== undefined) return cached;

  const a = parse(hexA);
  const b = parse(hexB);
  if (!a || !b) return 100;
  const dist = deltaE2000(a, b);
  if (ciedeDistCache.size < 4000) ciedeDistCache.set(key, dist);
  return dist;
}

export function angularDistanceDeg(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

interface HueCluster {
  meanHue: number;
  weight: number;
  maxChroma: number;
  hasSoft: boolean;
  hasChromatic: boolean;
}

function circularMeanDeg(items: Array<{ hue: number; weight: number }>): number {
  let sinSum = 0;
  let cosSum = 0;
  for (const item of items) {
    const rad = (item.hue * Math.PI) / 180;
    sinSum += Math.sin(rad) * item.weight;
    cosSum += Math.cos(rad) * item.weight;
  }
  const angle = (Math.atan2(sinSum, cosSum) * 180) / Math.PI;
  return (angle + 360) % 360;
}

function clusterHues(
  entries: Array<{ color: OklchColor; weight: number }>,
): HueCluster[] {
  const hueBearing = entries.filter(
    (e): e is { color: OklchColor & { h: number }; weight: number } =>
      e.color.role !== 'neutral' && e.color.h !== null,
  );
  if (hueBearing.length === 0) return [];

  const sorted = [...hueBearing].sort((a, b) => a.color.h - b.color.h);
  const groups: Array<Array<{ hue: number; weight: number; chroma: number; role: ColorRole }>> = [];

  for (const entry of sorted) {
    const effectiveWeight =
      entry.color.role === 'soft' ? entry.weight * 0.5 : entry.weight;
    const isSoft = entry.color.role === 'soft';

    let matchedGroup: (typeof groups)[number] | null = null;
    let bestDist = Infinity;

    for (const group of groups) {
      const center = circularMeanDeg(group);
      const groupHasSoft = group.some((g) => g.role === 'soft');
      const tol =
        COLOR_CONFIG.clustering.hueClusterToleranceDeg *
        (isSoft || groupHasSoft ? COLOR_CONFIG.clustering.softHueMultiplier : 1);
      const dist = angularDistanceDeg(entry.color.h, center);
      if (dist <= tol && dist < bestDist) {
        bestDist = dist;
        matchedGroup = group;
      }
    }

    const item = {
      hue: entry.color.h,
      weight: Math.max(effectiveWeight, 0.01),
      chroma: entry.color.c,
      role: entry.color.role,
    };

    if (matchedGroup) {
      matchedGroup.push(item);
    } else {
      groups.push([item]);
    }
  }

  // Merge wrap-around first & last groups if within tolerance
  if (groups.length > 1) {
    const first = groups[0];
    const last = groups[groups.length - 1];
    if (first && last) {
      const hasSoft =
        first.some((g) => g.role === 'soft') || last.some((g) => g.role === 'soft');
      const tol =
        COLOR_CONFIG.clustering.hueClusterToleranceDeg *
        (hasSoft ? COLOR_CONFIG.clustering.softHueMultiplier : 1);
      if (angularDistanceDeg(circularMeanDeg(first), circularMeanDeg(last)) <= tol) {
        first.push(...last);
        groups.pop();
      }
    }
  }

  return groups
    .map((group) => ({
      meanHue: circularMeanDeg(group),
      weight: group.reduce((acc, g) => acc + g.weight, 0),
      maxChroma: Math.max(...group.map((g) => g.chroma)),
      hasSoft: group.some((g) => g.role === 'soft'),
      hasChromatic: group.some((g) => g.role === 'chromatic'),
    }))
    .sort((a, b) => a.meanHue - b.meanHue);
}

function minimumHueSpan(hues: number[]): number {
  if (hues.length <= 1) return 0;
  const sorted = [...hues].sort((a, b) => a - b);
  let largestGap = 0;
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i]!;
    const next = i === sorted.length - 1 ? sorted[0]! + 360 : sorted[i + 1]!;
    largestGap = Math.max(largestGap, next - cur);
  }
  return 360 - largestGap;
}

function detectScheme(
  clusters: HueCluster[],
  hasNeutrals: boolean,
): ColorSchemeKey {
  const cfg = COLOR_CONFIG.clustering;
  if (clusters.length === 0) return 'neutral';
  if (clusters.length === 1) {
    return hasNeutrals ? 'neutralAccent' : 'monochrome';
  }

  const anySoft = clusters.some((c) => c.hasSoft);
  const softFactor = anySoft ? cfg.softHueMultiplier : 1;
  const span = minimumHueSpan(clusters.map((c) => c.meanHue));
  const analogLimit = anySoft ? cfg.analogSoftSpanMaxDeg : cfg.analogSpanMaxDeg;

  if (span <= analogLimit) {
    return 'analog';
  }

  if (clusters.length === 2) {
    const diff = angularDistanceDeg(clusters[0]!.meanHue, clusters[1]!.meanHue);
    const tol = cfg.complementaryToleranceDeg * (anySoft ? 1.4 : 1);
    if (Math.abs(diff - cfg.complementaryAngleDeg) <= tol) {
      return 'complementary';
    }
    return 'clash';
  }

  if (clusters.length === 3) {
    const hues = clusters.map((c) => c.meanHue);
    // Check Triadic (~120° between consecutive sorted hues)
    const d01 = angularDistanceDeg(hues[0]!, hues[1]!);
    const d12 = angularDistanceDeg(hues[1]!, hues[2]!);
    const d20 = angularDistanceDeg(hues[2]!, hues[0]!);
    const triTol = cfg.triadicToleranceDeg * (anySoft ? 1.5 : 1);
    if (
      Math.abs(d01 - cfg.triadicAngleDeg) <= triTol &&
      Math.abs(d12 - cfg.triadicAngleDeg) <= triTol &&
      Math.abs(d20 - cfg.triadicAngleDeg) <= triTol
    ) {
      return 'triadic';
    }

    // Check Split-complementary: one base hue + two hues ~±150° from it
    const splitTol = cfg.splitCompToleranceDeg * (anySoft ? 1.4 : 1);
    for (let i = 0; i < 3; i++) {
      const base = hues[i]!;
      const others = hues.filter((_, idx) => idx !== i);
      const a = angularDistanceDeg(base, others[0]!);
      const b = angularDistanceDeg(base, others[1]!);
      if (
        Math.abs(a - cfg.splitCompOffsetDeg) <= splitTol &&
        Math.abs(b - cfg.splitCompOffsetDeg) <= splitTol &&
        angularDistanceDeg(others[0]!, others[1]!) <= 80 * softFactor
      ) {
        return 'splitComplementary';
      }
    }
  }

  return 'clash';
}

function mergeProportions(entries: Array<{ color: OklchColor; weight: number }>): ProportionSlice[] {
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  if (totalWeight <= 0) return [];

  const buckets: Array<{ hex: string; weight: number; role: ColorRole }> = [];

  for (const entry of entries) {
    const existing = buckets.find(
      (b) => ciede2000Distance(b.hex, entry.color.hex) < COLOR_CONFIG.clustering.mergeDeltaEMax,
    );
    if (existing) {
      existing.weight += entry.weight;
    } else {
      buckets.push({
        hex: entry.color.hex,
        weight: entry.weight,
        role: entry.color.role,
      });
    }
  }

  return buckets
    .map((b) => ({
      hex: b.hex,
      share: b.weight / totalWeight,
      role: b.role,
    }))
    .sort((a, b) => b.share - a.share);
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return UZ.colorLab.labels.excellent;
  if (score >= 80) return UZ.colorLab.labels.veryGood;
  if (score >= 70) return UZ.colorLab.labels.good;
  if (score >= 55) return UZ.colorLab.labels.fair;
  return UZ.colorLab.labels.clash;
}

export function garmentsToColorInputs(garments: Garment[]): ColorInputItem[] {
  const inputs: ColorInputItem[] = [];
  for (const g of garments) {
    const baseWeight = COLOR_CONFIG.categoryVisualWeights[g.category] ?? 0.05;
    if (g.color2) {
      inputs.push({ hex: g.color, weight: baseWeight * 0.75, category: g.category });
      inputs.push({ hex: g.color2, weight: baseWeight * 0.25, category: g.category });
    } else {
      inputs.push({ hex: g.color, weight: baseWeight, category: g.category });
    }
  }
  return inputs;
}

export interface AnalyzeHarmonyOptions {
  palette?: Palette | null;
  garments?: Garment[];
}

/**
 * Computes full OKLCH harmony analysis, 0–100 score, 60-30-10 proportions, and Uzbek tips.
 */
export function analyzeHarmony(
  rawInputs: ColorInputItem[],
  options: AnalyzeHarmonyOptions = {},
): HarmonyAnalysis {
  if (rawInputs.length === 0) {
    return {
      score: 0,
      label: UZ.colorLab.labels.clash,
      schemeKey: 'neutral',
      schemeName: UZ.colorLab.schemes.neutral,
      breakdown: {
        hueHarmony: 0,
        lightnessStructure: 0,
        statementBalance: 0,
        warmCoolCoherence: 0,
        paletteFit: options.palette ? 0 : null,
        rescaledWithoutPalette: !options.palette,
      },
      proportions: [],
      wheelDots: [],
      hueClusters: [],
      tips: [],
    };
  }

  const entries = rawInputs.map((item) => ({
    color: classifyColor(item.hex),
    weight: Math.max(0.01, item.weight),
    category: item.category,
  }));

  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  const hasNeutrals = entries.some((e) => e.color.role === 'neutral');
  const clusters = clusterHues(entries);
  const schemeKey = detectScheme(clusters, hasNeutrals);

  // 1. Hue Harmony (max 40) with chroma-clash penalty
  let hueHarmony: number = COLOR_CONFIG.schemeBaseScores[schemeKey];
  const clusterSpan = minimumHueSpan(clusters.map((c) => c.meanHue));
  if (schemeKey === 'analog' && clusterSpan > COLOR_CONFIG.clustering.analogSpanMaxDeg) {
    hueHarmony -= 4;
  }
  const chromaticClusters = clusters.filter((c) => c.hasChromatic);
  const vividColors = entries.filter(
    (e) => e.color.role === 'chromatic' && e.color.c >= COLOR_CONFIG.statement.vividChromaMin,
  );

  let chromaClashPenalty = 0;
  if (chromaticClusters.length >= 2) {
    // Multiple distinct chromatic hue clusters: apply clash penalty scaled by saturation
    const vividCount = new Set(
      vividColors.map((v) => Math.round((v.color.h ?? 0) / 25)),
    ).size;
    chromaClashPenalty += (chromaticClusters.length - 1) * 8;
    if (vividCount >= 2) {
      chromaClashPenalty += vividCount * 4;
    }
  }
  if (schemeKey === 'clash' && clusters.length >= 3) {
    chromaClashPenalty += 6;
  }
  hueHarmony = Math.max(4, Math.min(COLOR_CONFIG.weights.hueHarmonyMax, hueHarmony - chromaClashPenalty));

  // 2. Lightness Structure (max 20)
  let deltaL = 0;
  const topPiece = entries.find((e) => e.category === 'top' || e.category === 'dress');
  const bottomPiece = entries.find((e) => e.category === 'bottom');
  if (topPiece && bottomPiece) {
    deltaL = Math.abs(topPiece.color.l - bottomPiece.color.l);
  } else {
    const ls = entries.map((e) => e.color.l);
    deltaL = Math.max(...ls) - Math.min(...ls);
  }

  let lightnessStructure = 11;
  if (deltaL >= COLOR_CONFIG.lightnessContrast.idealMin && deltaL <= COLOR_CONFIG.lightnessContrast.idealMax) {
    lightnessStructure = 20;
  } else if (deltaL > COLOR_CONFIG.lightnessContrast.idealMax) {
    // Very high black/white contrast is crisp and classic
    lightnessStructure = 18;
  } else if (deltaL >= 0.12) {
    lightnessStructure = 14;
  } else {
    lightnessStructure = Math.round(8 + (deltaL / 0.12) * 4);
  }

  // 3. Statement Balance (max 20)
  const chromaticWeight = entries
    .filter((e) => e.color.role === 'chromatic')
    .reduce((sum, e) => sum + e.weight, 0);
  const chromaticShare = chromaticWeight / totalWeight;

  let statementBalance = 20;
  if (chromaticClusters.length === 0) {
    statementBalance = 19;
  } else if (chromaticClusters.length === 1) {
    if (clusters.length >= 2) {
      // Chromatic accent sharing stage with a soft muted second hue
      statementBalance = chromaticShare <= COLOR_CONFIG.statement.maxShare ? 17 : 14;
    } else if (chromaticShare <= COLOR_CONFIG.statement.maxShare) {
      statementBalance = 19;
    } else if (chromaticShare <= 0.55) {
      // Single bold dress or sweater anchored by neutrals still works
      statementBalance = hasNeutrals ? 17 : 13;
    } else {
      statementBalance = hasNeutrals ? 15 : 10;
    }
  } else if (chromaticClusters.length === 2) {
    const vividBonusPenalty = vividColors.length >= 2 ? 4 : 0;
    statementBalance = Math.max(2, (hasNeutrals ? 9 : 6) - vividBonusPenalty);
  } else {
    statementBalance = 0;
  }

  // 4. Warm/Cool Coherence (max 10)
  const warmEntries = entries.filter((e) => e.color.temperature === 'warm');
  const coolEntries = entries.filter((e) => e.color.temperature === 'cool');
  const warmChromatic = warmEntries.some((e) => e.color.role === 'chromatic');
  const coolChromatic = coolEntries.some((e) => e.color.role === 'chromatic');

  let warmCoolCoherence = 10;
  if (warmEntries.length > 0 && coolEntries.length > 0) {
    if (warmChromatic && coolChromatic) {
      warmCoolCoherence = hasNeutrals ? 6 : 2;
    } else {
      // Soft bridge + chromatic, or soft + soft
      warmCoolCoherence = hasNeutrals ? 9 : 7;
    }
  } else if (clusters.length >= 2 && clusterSpan > COLOR_CONFIG.clustering.analogSpanMaxDeg) {
    warmCoolCoherence = 8;
  }

  // 5. Palette Fit (max 10, or null when palette = any)
  let paletteFit: number | null = null;
  if (options.palette) {
    const palColors = options.palette.colors;
    let weightedDist = 0;
    let weightAcc = 0;
    for (const entry of entries) {
      if (entry.color.role === 'neutral') {
        // Neutrals always bridge palettes cleanly (near-zero penalty)
        weightedDist += 0.015 * entry.weight;
      } else {
        const minDist = Math.min(...palColors.map((p) => oklabDistance(entry.color.hex, p)));
        weightedDist += minDist * entry.weight;
      }
      weightAcc += entry.weight;
    }
    const meanDist = weightAcc > 0 ? weightedDist / weightAcc : 0;
    // Map mean OKLab distance [0..0.22] → [10..0]
    paletteFit = Math.max(0, Math.min(10, Math.round(10 * (1 - meanDist / 0.22))));
  }

  const rawSum =
    hueHarmony +
    lightnessStructure +
    statementBalance +
    warmCoolCoherence +
    (paletteFit ?? 0);

  const maxPossible = paletteFit === null ? 90 : 100;
  const score = Math.max(0, Math.min(100, Math.round((rawSum / maxPossible) * 100)));

  // Generate Uzbek styling tips from breakdown
  const tips: string[] = [];
  if (chromaticClusters.length >= 2) {
    tips.push(UZ.colorLab.tips.competingHues);
  }
  if (deltaL < COLOR_CONFIG.lightnessContrast.idealMin) {
    tips.push(UZ.colorLab.tips.tooTonal);
  }
  if (warmChromatic && coolChromatic && !hasNeutrals) {
    tips.push(UZ.colorLab.tips.mixedTemp);
  }
  if (chromaticClusters.length === 1 && chromaticShare > COLOR_CONFIG.statement.maxShare && !hasNeutrals) {
    tips.push(UZ.colorLab.tips.excessStatement);
  }
  if (tips.length === 0) {
    tips.push(UZ.colorLab.tips.greatBalance);
  }

  const proportions = mergeProportions(entries);
  const wheelDots: WheelDot[] = entries.map((e) => ({
    hex: e.color.hex,
    l: e.color.l,
    c: e.color.c,
    h: e.color.h,
    role: e.color.role,
    weight: e.weight / totalWeight,
  }));

  return {
    score,
    label: getScoreLabel(score),
    schemeKey,
    schemeName: UZ.colorLab.schemes[schemeKey],
    breakdown: {
      hueHarmony,
      lightnessStructure,
      statementBalance,
      warmCoolCoherence,
      paletteFit,
      rescaledWithoutPalette: paletteFit === null,
    },
    proportions,
    wheelDots,
    hueClusters: clusters.map((c) => c.meanHue),
    tips: tips.slice(0, 3),
  };
}

export function analyzeGarmentsHarmony(
  garments: Garment[],
  palette?: Palette | null,
): HarmonyAnalysis {
  return analyzeHarmony(garmentsToColorInputs(garments), { palette, garments });
}
