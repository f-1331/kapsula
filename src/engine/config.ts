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
    /** Base angular radius (degrees) for merging hues into one cluster */
    hueClusterToleranceDeg: 15,
    /** Soft (low-chroma) colors receive doubled hue tolerance */
    softHueMultiplier: 2,
    /** Maximum hue span for an Analog scheme (chromatic-only vs soft-assisted) */
    analogSpanMaxDeg: 60,
    analogSoftSpanMaxDeg: 90,
    /** Complementary target & tolerance */
    complementaryAngleDeg: 180,
    complementaryToleranceDeg: 25,
    /** Split-complementary side offsets & tolerance */
    splitCompOffsetDeg: 150,
    splitCompToleranceDeg: 25,
    /** Triadic separation & tolerance */
    triadicAngleDeg: 120,
    triadicToleranceDeg: 20,
    /** Colors within this CIEDE2000 ΔE are merged in the 60-30-10 proportion bar */
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
  /** Minimum ΔL between main pieces (or range) to avoid a "too tonal" warning */
  lightnessContrast: {
    idealMin: 0.18,
    idealMax: 0.75,
  },
  /** Statement balance limits */
  statement: {
    /** Chromatic share above 30% of visual weight starts reducing statement balance */
    maxShare: 0.34,
    /** Chroma level considered vivid/high-saturation for clash penalties */
    vividChromaMin: 0.15,
  },
  /** Visual weight by garment category (before normalization) */
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
  /** Overall ranking weights for candidate outfit combinations (sum = 1.0) */
  rankingWeights: {
    colorHarmony: 0.4,
    occasionFit: 0.25,
    weatherFit: 0.2,
    paletteFit: 0.15,
  },
  /** Editorial look match bonus when a combination aligns with a curated look */
  editorialLookBonus: 0.06,
  /** Target average formality (0–3) per occasion */
  targetFormality: {
    walk: 0.7,
    office: 2.1,
    party: 2.8,
  } satisfies Record<Occasion, number>,
  /** Target average warmth (0–3) per weather band */
  targetWarmth: {
    hot: 0.35,
    warm: 1.0,
    cool: 1.85,
    cold: 2.7,
  } satisfies Record<WeatherBand, number>,
  /** Candidate shortlist size per slot during combinatorial search */
  topKPerSlot: 5,
  /** Maximum outfits returned by the stylist */
  maxResults: 6,
  /** Minimum differing garment IDs required between returned outfits */
  minItemDifference: 2,
  /** Minimum item overlap ratio to display an editorial look photo beside the board */
  lookOverlapThreshold: 0.8,
} as const;
