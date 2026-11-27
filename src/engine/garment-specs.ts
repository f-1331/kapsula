import type { Garment } from '../data/schema';
import { detectGarmentSubtype, type GarmentSubtype } from '../components/GarmentSilhouette';

export interface GarmentSpec {
  fabricUz: string;
  fitUz: string;
  careUz: string;
  minUzs: number;
  maxUzs: number;
  priceLabelUz: string;
}

const SUBTYPE_FABRICS: Partial<Record<GarmentSubtype, [string, string, string]>> = {
  palto: ['80% jun, 20% kaşemir', 'Oversize tuzilgan bichim', 'Quruq tozalash (ximchistka)'],
  peacoat: ['Qalin italyan juni', 'Ikki bortli klassik', 'Quruq tozalash'],
  trench: ['Suv qaytaruvchi gabardin', 'Belbogʻli erkin bichim', '30°C nozik yuvish'],
  puffer: ['Ripstop neylon · 90% par', 'Issiq hajmli puffer', '30°C mayin rejim'],
  cropped_puffer: ['Mat neylon · termotoʻldirma', 'Qisqa zamonaviy bichim', '30°C mayin rejim'],
  blazer: ['Taroshlangan jun aralash', 'Tuzilgan yelka bichimi', 'Bugʻda dazmollash'],
  leather_jacket: ['Tabiiy eko-charm', 'Biker / Boxy bichim', 'Nam salfetka bilan artish'],
  cape: ['Merinos va kaşemir', 'Erkin pelerine siluet', 'Quruq tozalash'],
  kimono: ['Ogʻir ipak-viskoza', 'Yaponcha keng yeng', 'Qoʻlda yuvish'],
  hoodie: ['420 gsm paxta flis', 'Drop-shoulder oversize', '30°C teskari yuvish'],
  ziphoodie: ['380 gsm paxta trikotaj', 'Zamokli qulay bichim', '30°C yuvish'],
  turtleneck: ['100% merinos juni', 'Qomatga mos slim', 'Qoʻlda iliq suvda'],
  silk_blouse: ['Tabiiy tut ipak (19 momme)', 'Ravon erkin tushish', 'Sovuq suvda qoʻlda'],
  wide_trousers: ['Jun-viskoza kostyum mato', 'Keng va uzun chiziq', 'Bugʻda dazmollash'],
  cargo: ['Zich ripstop paxta', 'Choʻntakli koʻcha uslubi', '40°C oddiy yuvish'],
  denim: ['13 oz organik denim', 'Straight / Relaxed', '30°C rang saqlash'],
  midi_silk: ['Satin-ipak qiyma bichim', 'Midi nafis siluet', 'Nozik qoʻlda yuvish'],
  sneakers: ['Nappa charm + EVA taglik', 'Anatomik sport qolip', 'Maxsus choʻtka'],
  chelsea_boots: ['Tabiiy silliq charm', 'Elastik yon qistirma', 'Charm kremi parvarishi'],
  tote: ['Donador tabiiy charm', 'A4 sigʻimli tuzilgan', 'Quruq joyda saqlash'],
  watch: ['316L poʻlat · Sapfir oyna', '40 mm klassik korpus', '5 ATM suvdan himoya'],
  sunglasses: ['Italiya atsetati · UV400', 'Yuzga mos oʻrta ramka', 'Mikrofibra bilan artish'],
};

const TIER_MULTIPLIER: Record<'budget' | 'mid' | 'premium', number> = {
  budget: 0.65,
  mid: 1.0,
  premium: 2.35,
};

const BASE_CATEGORY_UZS: Record<Garment['category'], [number, number]> = {
  outerwear: [680_000, 1_450_000],
  top: [260_000, 580_000],
  bottom: [340_000, 720_000],
  dress: [480_000, 960_000],
  shoes: [520_000, 1_150_000],
  bag: [420_000, 980_000],
  accessory: [160_000, 420_000],
};

function formatUzsCompact(amount: number): string {
  const rounded = Math.round(amount / 10_000) * 10_000;
  return `${rounded.toLocaleString('en-US').replace(/,/g, ' ')}`;
}

export function getGarmentSpec(garment: Garment): GarmentSpec {
  const subtype = detectGarmentSubtype(garment.category, garment.id, garment.name_uz);
  const meta = SUBTYPE_FABRICS[subtype];
  const [rawMin, rawMax] = BASE_CATEGORY_UZS[garment.category];
  const mult = TIER_MULTIPLIER[garment.priceTier ?? 'mid'];
  const minUzs = Math.round((rawMin * mult) / 10_000) * 10_000;
  const maxUzs = Math.round((rawMax * mult) / 10_000) * 10_000;

  return {
    fabricUz: meta?.[0] ?? (garment.warmth >= 2 ? 'Zich aralash jun/paxta' : 'Nafas oluvchi tabiiy mato'),
    fitUz: meta?.[1] ?? (garment.formality >= 2 ? 'Tuzilgan klassik bichim' : 'Qulay kundalik siluet'),
    careUz: meta?.[2] ?? '30°C nozik parvarish',
    minUzs,
    maxUzs,
    priceLabelUz: `${formatUzsCompact(minUzs)} – ${formatUzsCompact(maxUzs)} soʻm`,
  };
}

export function estimateOutfitBudget(garments: Garment[]): {
  minUzs: number;
  maxUzs: number;
  labelUz: string;
} {
  let minUzs = 0;
  let maxUzs = 0;
  for (const g of garments) {
    const spec = getGarmentSpec(g);
    minUzs += spec.minUzs;
    maxUzs += spec.maxUzs;
  }
  return {
    minUzs,
    maxUzs,
    labelUz: `${formatUzsCompact(minUzs)} – ${formatUzsCompact(maxUzs)} soʻm`,
  };
}
