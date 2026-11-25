import type { Category, Occasion, WeatherBand } from '../data/schema';

/**
 * Color classification, scheme detection, and harmony scoring thresholds.
 * All weights and thresholds are centralized here for transparent tuning.
 */
export const COLOR_CONFIG = {
  classification: {
    /** Below this chroma in OKLCH, any color is treated as neutral */
    neutralChromaMax: 0.028,
    /** Dark colors (black, charcoal, espresso, navy) remain neutral up to this L and C */
    darkNeutralLightnessMax: 0.38,
    darkNeutralChromaMax: 0.1,
    /** Very bright off-whites / ivory remain neutral up to this C */
    brightNeutralLightnessMin: 0.92,
    brightNeutralChromaMax: 0.03,
    /** Above this chroma (when not neutral), colors are full chromatic statement hues */
    chromaticChromaMin: 0.095,
  },
  clustering: {
    hueClusterToleranceDeg: 15,
    softHueMultiplier: 2,
    analogSpanMaxDeg: 60,
    analogSoftSpanMaxDeg: 90,
    complementaryAngleDeg: 180,
    complementaryToleranceDeg: 25,
    splitCompOffsetDeg: 150,
    splitCompToleranceDeg: 25,
    triadicAngleDeg: 120,
    triadicToleranceDeg: 20,
    mergeDeltaEMax: 6,
  },
  weights: {
    hueHarmonyMax: 40,
    lightnessStructureMax: 20,
    statementBalanceMax: 20,
    warmCoolCoherenceMax: 10,
    paletteFitMax: 10,
  },
  schemeBaseScores: {
    neutral: 38,
    neutralAccent: 38,
    monochrome: 36,
    analog: 34,
    complementary: 33,
    splitComplementary: 32,
    triadic: 30,
    clash: 14,
  },
  lightnessContrast: {
    idealMin: 0.18,
    idealMax: 0.75,
  },
  statement: {
    maxShare: 0.34,
    vividChromaMin: 0.15,
  },
  categoryVisualWeights: {
    dress: 0.45,
    outerwear: 0.3,
    top: 0.25,
    bottom: 0.25,
    shoes: 0.07,
    bag: 0.05,
    accessory: 0.03,
  } satisfies Record<Category, number>,
} as const;

export const STYLIST_CONFIG = {
  rankingWeights: {
    colorHarmony: 0.4,
    occasionFit: 0.25,
    weatherFit: 0.2,
    paletteFit: 0.15,
  },
  editorialLookBonus: 0.06,
  targetFormality: {
    office: 2.2,
    university: 1.2,
    school: 2.0,
    walk: 0.7,
    party: 2.8,
    date: 2.2,
    sport: 0.2,
    travel: 0.8,
  } satisfies Record<Occasion, number>,
  targetWarmth: {
    hot: 0.35,
    warm: 1.0,
    cool: 1.85,
    cold: 2.7,
  } satisfies Record<WeatherBand, number>,
  topKPerSlot: 5,
  maxResults: 6,
  minItemDifference: 2,
  lookOverlapThreshold: 0.8,
} as const;
