import type { Category, Garment, Manifest, Palette } from '../data/schema';
import {
  analyzeGarmentsHarmony,
  classifyColor,
  ciede2000Distance,
  oklabDistance,
  type ColorRole,
  type OklchColor,
  type TemperatureTone,
} from '../engine/color';
import {
  garmentsToBoardSlots,
  getSmartPairingAdvice,
  type BoardSlots,
  type SmartPairingAdvice,
  type StylistQuery,
} from '../engine/stylist';
import { UZ } from '../i18n/uz';

export interface PhotoSwatch {
  hex: string;
  share: number;
  role: ColorRole;
  temperature: TemperatureTone;
  oklch: OklchColor;
}

export interface PhotoAnalysisResult {
  thumbnailDataUrl: string;
  swatches: PhotoSwatch[];
  primaryHex: string;
  secondaryHex: string | null;
  closestPalette: Palette | null;
  virtualGarment: Garment;
  recommendedSlots: BoardSlots;
  recommendedBoardGarments: Garment[];
  pairingByCategory: Partial<Record<Category, Garment[]>>;
  smartAdvice: SmartPairingAdvice | null;
  summaryUz: string;
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    clamp(r).toString(16).padStart(2, '0') +
    clamp(g).toString(16).padStart(2, '0') +
    clamp(b).toString(16).padStart(2, '0')
  ).toUpperCase();
}

/**
 * Loads an image Blob/File or canvas snapshot, downsamples cleanly, and returns
 * a compact JPEG data-URL alongside raw ImageData for local OKLCH analysis.
 */
async function rasterizeInputToCanvas(
  source: File | Blob | HTMLCanvasElement,
): Promise<{ dataUrl: string; imageData: ImageData }> {
  let imgSource: CanvasImageSource;
  let srcW = 240;
  let srcH = 300;
  let revokeUrl: string | null = null;

  if (source instanceof HTMLCanvasElement) {
    imgSource = source;
    srcW = source.width || 240;
    srcH = source.height || 300;
  } else {
    const url = URL.createObjectURL(source);
    revokeUrl = url;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Rasmni oʻqib boʻlmadi'));
      el.src = url;
    });
    imgSource = img;
    srcW = img.naturalWidth || 240;
    srcH = img.naturalHeight || 300;
  }

  try {
    // 1. Create compact 220x260 preview thumbnail for storage & display
    const thumbCanvas = document.createElement('canvas');
    const maxDim = 240;
    const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
    thumbCanvas.width = Math.max(48, Math.round(srcW * scale));
    thumbCanvas.height = Math.max(48, Math.round(srcH * scale));
    const tCtx = thumbCanvas.getContext('2d');
    if (tCtx) {
      tCtx.drawImage(imgSource, 0, 0, thumbCanvas.width, thumbCanvas.height);
    }
    const dataUrl = thumbCanvas.toDataURL('image/jpeg', 0.8);

    // 2. Sample central 72x72 canvas for crisp, fast pixel quantization
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 72;
    sampleCanvas.height = 72;
    const sCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    if (!sCtx) {
      throw new Error('Canvas konteksti topilmadi');
    }
    sCtx.drawImage(imgSource, 0, 0, 72, 72);
    const imageData = sCtx.getImageData(0, 0, 72, 72);
    return { dataUrl, imageData };
  } finally {
    if (revokeUrl) URL.revokeObjectURL(revokeUrl);
  }
}

/**
 * Extracts up to 4 perceptually merged dominant OKLCH swatches from central garment pixels.
 */
function extractDominantSwatches(imageData: ImageData): PhotoSwatch[] {
  const { width, height, data } = imageData;

  // Estimate background tone from outer corners so plain white/grey walls don't overpower colors
  const cornerCoords = [
    [2, 2],
    [width - 3, 2],
    [2, height - 3],
    [width - 3, height - 3],
  ];
  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  let bgCount = 0;
  for (const [cx, cy] of cornerCoords) {
    const idx = (cy * width + cx) * 4;
    if ((data[idx + 3] ?? 0) > 200) {
      bgR += data[idx] ?? 0;
      bgG += data[idx + 1] ?? 0;
      bgB += data[idx + 2] ?? 0;
      bgCount++;
    }
  }
  const hasUniformBg = bgCount === 4;
  const meanBgR = bgCount ? bgR / bgCount : 245;
  const meanBgG = bgCount ? bgG / bgCount : 245;
  const meanBgB = bgCount ? bgB / bgCount : 245;

  const buckets = new Map<
    string,
    { rSum: number; gSum: number; bSum: number; weight: number }
  >();

  const collect = (skipCorners: boolean) => {
    buckets.clear();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const a = data[idx + 3] ?? 0;
        if (a < 180) continue;

        const r = data[idx] ?? 0;
        const g = data[idx + 1] ?? 0;
        const b = data[idx + 2] ?? 0;

        // Emphasize center crop (where user holds or frames the garment)
        const inCenter = x >= 14 && x <= 58 && y >= 10 && y <= 62;
        if (skipCorners && hasUniformBg && !inCenter) {
          const dist = Math.hypot(r - meanBgR, g - meanBgG, b - meanBgB);
          if (dist < 26) continue;
        }

        const qR = Math.round(r / 28) * 28;
        const qG = Math.round(g / 28) * 28;
        const qB = Math.round(b / 28) * 28;
        const key = `${qR},${qG},${qB}`;
        const w = inCenter ? 2.4 : 1;

        const prev = buckets.get(key);
        if (prev) {
          prev.rSum += r * w;
          prev.gSum += g * w;
          prev.bSum += b * w;
          prev.weight += w;
        } else {
          buckets.set(key, { rSum: r * w, gSum: g * w, bSum: b * w, weight: w });
        }
      }
    }
  };

  collect(true);
  if (buckets.size === 0) collect(false);

  const sortedClusters = [...buckets.values()]
    .map((c) => {
      const hex = rgbToHex(c.rSum / c.weight, c.gSum / c.weight, c.bSum / c.weight);
      return { hex, weight: c.weight };
    })
    .sort((a, b) => b.weight - a.weight);

  // Merge perceptually similar swatches using CIEDE2000 < 10
  const merged: Array<{ hex: string; weight: number }> = [];
  for (const cluster of sortedClusters) {
    const match = merged.find((m) => ciede2000Distance(m.hex, cluster.hex) < 10);
    if (match) {
      match.weight += cluster.weight;
    } else {
      merged.push({ ...cluster });
    }
    if (merged.length >= 6) break;
  }

  const topFour = merged.slice(0, 4);
  const totalWeight = topFour.reduce((sum, s) => sum + s.weight, 0) || 1;

  return topFour.map((s) => {
    const oklch = classifyColor(s.hex);
    return {
      hex: s.hex,
      share: s.weight / totalWeight,
      role: oklch.role,
      temperature: oklch.temperature,
      oklch,
    };
  });
}

function findClosestPalette(hex: string, palettes: Palette[]): Palette | null {
  let best: Palette | null = null;
  let bestDist = Infinity;
  for (const pal of palettes) {
    for (const swatch of pal.colors) {
      const d = oklabDistance(hex, swatch);
      if (d < bestDist) {
        bestDist = d;
        best = pal;
      }
    }
  }
  return best;
}

/**
 * Analyzes an uploaded or camera-captured garment image purely client-side:
 * extracts dominant OKLCH colors, pairs catalog items around it, and produces explicit advice.
 */
export async function analyzeGarmentPhoto(
  source: File | Blob | HTMLCanvasElement,
  options: {
    category: Category;
    customName?: string;
    manifest: Manifest;
    query: StylistQuery;
  },
): Promise<PhotoAnalysisResult> {
  const { category, customName, manifest, query } = options;
  const { dataUrl, imageData } = await rasterizeInputToCanvas(source);
  const swatches = extractDominantSwatches(imageData);

  const primaryHex = swatches[0]?.hex ?? '#34373D';
  const secondaryHex = swatches[1] && swatches[1].share >= 0.16 ? swatches[1].hex : null;
  const closestPalette = findClosestPalette(primaryHex, manifest.palettes);

  const catLabel = UZ.categories[category];
  const label = customName?.trim() || `Mening ${catLabel.toLowerCase()}`;

  const virtualGarment: Garment = {
    id: `custom-${category}-${Date.now()}`,
    category,
    name_uz: label,
    name_en: `User uploaded ${category}`,
    image: dataUrl,
    w: 840,
    h: 1000,
    color: primaryHex,
    color2: secondaryHex,
    brand: 'Shaxsiy',
    priceTier: 'mid',
    palettes: closestPalette ? [closestPalette.id] : ['sand'],
    weather: [query.weather, 'cool', 'warm'],
    occasions: [query.occasion, 'walk', 'university', 'office'],
    warmth: category === 'outerwear' ? 3 : 1,
    formality: category === 'dress' ? 2 : 1,
    gender: query.gender === 'w' ? 'w' : 'u',
    isUserUploaded: true,
  };

  // Pick best complementary garments per slot to pair with this item
  const targetCategories: Category[] = (
    ['outerwear', 'top', 'bottom', 'shoes', 'bag', 'accessory'] as Category[]
  ).filter((c) => c !== category && !(category === 'dress' && (c === 'top' || c === 'bottom')));

  const pairingByCategory: Partial<Record<Category, Garment[]>> = {};
  const boardSeedGarments: Garment[] = [virtualGarment];

  for (const cat of targetCategories) {
    const pool = manifest.garments.filter((g) => {
      if (g.category !== cat) return false;
      if (query.gender === 'm' && g.gender === 'w') return false;
      const wxOk = g.weather.includes(query.weather) || (query.weather === 'cool' && g.weather.includes('warm'));
      return wxOk;
    });

    const sourcePool =
      pool.length > 0 ? pool : manifest.garments.filter((g) => g.category === cat);

    // Deduplicate by color + subtype so suggestions look visually varied
    const scored = sourcePool
      .map((cand) => {
        const pairAnalysis = analyzeGarmentsHarmony(
          [virtualGarment, cand],
          closestPalette,
        );
        const occBonus = cand.occasions.includes(query.occasion) ? 10 : 0;
        const rainBonus = query.rain && cand.weather.includes('rain') ? 5 : 0;
        return {
          garment: cand,
          score: pairAnalysis.score + occBonus + rainBonus,
        };
      })
      .sort((a, b) => b.score - a.score);

    const diverse: Garment[] = [];
    const seenKeys = new Set<string>();
    for (const item of scored) {
      const k = `${item.garment.color}-${item.garment.name_uz}`;
      if (seenKeys.has(k)) continue;
      seenKeys.add(k);
      diverse.push(item.garment);
      if (diverse.length >= 4) break;
    }

    if (diverse.length > 0) {
      pairingByCategory[cat] = diverse;
      // Add best match to the complete board around user's item
      const isHotNoOuter = query.weather === 'hot' && cat === 'outerwear';
      if (!isHotNoOuter && cat !== 'bag') {
        boardSeedGarments.push(diverse[0]!);
      }
    }
  }

  const recommendedSlots = garmentsToBoardSlots(boardSeedGarments);
  const fullBoardAnalysis = analyzeGarmentsHarmony(boardSeedGarments, closestPalette);
  const smartAdvice = getSmartPairingAdvice(boardSeedGarments, manifest, query);

  const primarySwatch = swatches[0];
  const tempWord =
    primarySwatch?.temperature === 'warm'
      ? 'iliq'
      : primarySwatch?.temperature === 'cool'
        ? 'sokin sovuq'
        : 'universal neytral';

  const topPartner =
    pairingByCategory.bottom?.[0] ??
    pairingByCategory.top?.[0] ??
    pairingByCategory.shoes?.[0];

  const paletteNote = closestPalette
    ? `«${closestPalette.name_uz}» palitrasiga yaqin`
    : 'neytral asosga mos';

  const partnerPhrase = topPartner
    ? ` Eng mos juftlik — ${topPartner.brand ? `${topPartner.brand} ` : ''}${topPartner.name_uz.toLowerCase()}.`
    : '';

  const extraAccessory = pairingByCategory.accessory?.[0];
  const detailPhrase = extraAccessory
    ? ` Unga ${extraAccessory.name_uz.toLowerCase()} qoʻshsangiz, koʻrinish uygʻunligi ${fullBoardAnalysis.score} ballgacha koʻtariladi.`
    : '';

  const summaryUz = `Rasmdagi ${catLabel.toLowerCase()} ${tempWord} (${primaryHex}) rangda va ${paletteNote}.${partnerPhrase}${detailPhrase}`;

  return {
    thumbnailDataUrl: dataUrl,
    swatches,
    primaryHex,
    secondaryHex,
    closestPalette,
    virtualGarment,
    recommendedSlots,
    recommendedBoardGarments: boardSeedGarments,
    pairingByCategory,
    smartAdvice,
    summaryUz,
  };
}
