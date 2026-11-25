import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ManifestSchema, type Manifest, type Occasion, type PaletteId, type UserGenderFilter, type WeatherBand } from '../data/schema';
import { SAMPLE_MANIFEST } from '../data/sample-manifest';
import { UZ } from '../i18n/uz';
import { LANGUAGE_OPTIONS, getDictionary, latinToCyrillicUz } from '../i18n/languages';
import { DESIGN_THEMES, getDesignThemeById } from '../styles/themes';
import { detectGarmentSubtype } from '../components/GarmentSilhouette';
import { analyzeHarmony, classifyColor } from './color';
import {
  findBestHarmonizeSwap,
  garmentsToBoardSlots,
  generateSeededOutfit,
  getSmartPairingAdvice,
  recommendOutfits,
} from './stylist';

function loadActiveManifestForTest(): Manifest {
  const manifestPath = path.resolve(process.cwd(), 'public/assets/manifest.json');
  if (fs.existsSync(manifestPath)) {
    const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const parsed = ManifestSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
  }
  return SAMPLE_MANIFEST;
}

describe('Color Engine — Classification', () => {
  it('classifies neutral shades accurately', () => {
    expect(classifyColor('#121212').role).toBe('neutral'); // black
    expect(classifyColor('#FFFFFF').role).toBe('neutral'); // white
    expect(classifyColor('#34373D').role).toBe('neutral'); // charcoal
    expect(classifyColor('#25345A').role).toBe('neutral'); // navy
    expect(classifyColor('#F4EFE6').role).toBe('neutral'); // ivory
  });

  it('classifies soft muted fashion shades accurately', () => {
    expect(classifyColor('#B98E5E').role).toBe('soft'); // camel
    expect(classifyColor('#E2D3BA').role).toBe('soft'); // beige
    expect(classifyColor('#6D7048').role).toBe('soft'); // olive
    expect(classifyColor('#B8C4AB').role).toBe('soft'); // sage
    expect(classifyColor('#E8C6C0').role).toBe('soft'); // blush
  });

  it('classifies chromatic statement colors accurately', () => {
    expect(classifyColor('#B2573A').role).toBe('chromatic'); // terracotta
    expect(classifyColor('#8F1D2C').role).toBe('chromatic'); // crimson
  });
});

describe('Color Engine — Score Bands & Schemes', () => {
  it('scores black + white + camel >= 85', () => {
    const res = analyzeHarmony([
      { hex: '#121212', weight: 0.3 },
      { hex: '#FFFFFF', weight: 0.35 },
      { hex: '#B98E5E', weight: 0.35 },
    ]);
    expect(res.score).toBeGreaterThanOrEqual(85);
    expect(res.schemeKey).toBe('neutralAccent');
  });

  it('scores navy + white + tan >= 80', () => {
    const res = analyzeHarmony([
      { hex: '#25345A', weight: 0.35 },
      { hex: '#FFFFFF', weight: 0.35 },
      { hex: '#C4A27A', weight: 0.3 },
    ]);
    expect(res.score).toBeGreaterThanOrEqual(80);
  });

  it('scores terracotta + olive + cream between 70 and 90', () => {
    const res = analyzeHarmony([
      { hex: '#B2573A', weight: 0.3 },
      { hex: '#6D7048', weight: 0.35 },
      { hex: '#F4EFE6', weight: 0.35 },
    ]);
    expect(res.score).toBeGreaterThanOrEqual(70);
    expect(res.score).toBeLessThanOrEqual(90);
  });

  it('detects three tonal beiges as Monoxrom (65–90) with a contrast tip', () => {
    const res = analyzeHarmony([
      { hex: '#E2D3BA', weight: 0.4 },
      { hex: '#D6C2A3', weight: 0.35 },
      { hex: '#C8B08E', weight: 0.25 },
    ]);
    expect(res.schemeName).toBe('Monoxrom');
    expect(res.score).toBeGreaterThanOrEqual(65);
    expect(res.score).toBeLessThanOrEqual(90);
    expect(res.tips).toContain(UZ.colorLab.tips.tooTonal);
  });

  it('scores crimson + black + white >= 80', () => {
    const res = analyzeHarmony([
      { hex: '#8F1D2C', weight: 0.28 },
      { hex: '#121212', weight: 0.42 },
      { hex: '#FFFFFF', weight: 0.3 },
    ]);
    expect(res.score).toBeGreaterThanOrEqual(80);
    expect(res.schemeKey).toBe('neutralAccent');
  });

  it('penalizes saturated red + saturated green to <= 55', () => {
    const res = analyzeHarmony([
      { hex: '#E01E26', weight: 0.5 },
      { hex: '#149E3D', weight: 0.5 },
    ]);
    expect(res.score).toBeLessThanOrEqual(55);
  });

  it('penalizes hot pink + orange + lime + purple to < 45', () => {
    const res = analyzeHarmony([
      { hex: '#FF1E8A', weight: 0.25 },
      { hex: '#FF6A00', weight: 0.25 },
      { hex: '#7BE000', weight: 0.25 },
      { hex: '#8A1EFF', weight: 0.25 },
    ]);
    expect(res.score).toBeLessThan(45);
  });
});

describe('Stylist Engine — Coverage & Determinism', () => {
  const manifest = loadActiveManifestForTest();
  const weathers: WeatherBand[] = ['hot', 'warm', 'cool', 'cold'];
  const rainStates = [false, true];
  const occasions: Occasion[] = [
    'office',
    'university',
    'school',
    'walk',
    'party',
    'date',
    'sport',
    'travel',
  ];
  const palettes: Array<PaletteId | 'any'> = [
    'sand', 'earth', 'marine', 'bloom', 'noir', 'emerald', 'cobalt', 'espresso',
    'lavender', 'sunset', 'forest', 'monochrome', 'amber', 'denim', 'pearl', 'ruby', 'any',
  ];
  const genders: UserGenderFilter[] = ['w', 'm', 'all'];

  it('returns >= 3 complete outfits across all 8 occasions, 16 palettes and filter combinations', { timeout: 120000 }, () => {
    for (const weather of weathers) {
      for (const rain of rainStates) {
        for (const occasion of occasions) {
          for (const palette of palettes) {
            for (const gender of genders) {
              const res = recommendOutfits(manifest, {
                weather,
                rain,
                occasion,
                palette,
                gender,
              });
              expect(
                res.outfits.length,
                `Failed for ${weather}/${rain}/${occasion}/${palette}/${gender}`,
              ).toBeGreaterThanOrEqual(3);

              for (const outfit of res.outfits) {
                const cats = new Set(outfit.garments.map((g) => g.category));
                expect(cats.has('shoes')).toBe(true);
                const hasBody = cats.has('dress') || (cats.has('top') && cats.has('bottom'));
                expect(hasBody).toBe(true);
                if (weather === 'hot') {
                  expect(cats.has('outerwear')).toBe(false);
                }
                if (weather === 'cool' || weather === 'cold') {
                  expect(cats.has('outerwear')).toBe(true);
                }
                if (gender === 'm') {
                  for (const item of outfit.garments) {
                    expect(['u', 'm']).toContain(item.gender);
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  it('is strictly deterministic for identical inputs and seeded random selection', () => {
    const query = {
      weather: 'cool' as const,
      rain: false,
      occasion: 'office' as const,
      palette: 'sand' as const,
      gender: 'all' as const,
    };
    const first = recommendOutfits(manifest, query);
    const second = recommendOutfits(manifest, query);
    expect(first.outfits.map((o) => o.id)).toEqual(second.outfits.map((o) => o.id));
    expect(first.outfits.map((o) => o.note)).toEqual(second.outfits.map((o) => o.note));

    const seededA = generateSeededOutfit(manifest, query, 42);
    const seededB = generateSeededOutfit(manifest, query, 42);
    expect(seededA?.id).toBe(seededB?.id);
  });

  it('enforces Uzbek orthography without ASCII apostrophes or emoji in UI copy', () => {
    const serialized = JSON.stringify(UZ) + JSON.stringify(SAMPLE_MANIFEST);
    expect(serialized).not.toMatch(/['`]/);
    // Check no surrogate-pair emoji blocks
    expect(serialized).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  it('validates SAMPLE_MANIFEST against ManifestSchema and keeps dress mutually exclusive with top/bottom', () => {
    expect(ManifestSchema.safeParse(SAMPLE_MANIFEST).success).toBe(true);
    const dress = manifest.garments.find((g) => g.category === 'dress')!;
    const top = manifest.garments.find((g) => g.category === 'top')!;
    const bottom = manifest.garments.find((g) => g.category === 'bottom')!;
    const shoes = manifest.garments.find((g) => g.category === 'shoes')!;

    const withDress = garmentsToBoardSlots([top, bottom, dress, shoes]);
    expect(withDress.dress).toBe(dress.id);
    expect(withDress.top).toBeNull();
    expect(withDress.bottom).toBeNull();

    const swapResult = findBestHarmonizeSwap(
      garmentsToBoardSlots([top, bottom, shoes]),
      manifest,
      manifest.palettes[0] ?? null,
      'all',
    );
    expect(swapResult).not.toBeNull();
  });

  it('provides actionable SmartPairingAdvice when adding a hoodie and trousers without accessories or shoes', () => {
    const hoodie = manifest.garments.find((g) => g.id.includes('hoodie') && g.category === 'top') ??
      manifest.garments.find((g) => g.category === 'top')!;
    const trousers = manifest.garments.find((g) => g.category === 'bottom')!;

    const advice = getSmartPairingAdvice([hoodie, trousers], manifest, {
      weather: 'cool',
      rain: false,
      occasion: 'university',
      palette: 'sand',
      gender: 'all',
    });

    expect(advice).not.toBeNull();
    expect(advice?.recommendedAdd).not.toBeNull();
    expect(advice?.summaryUz.length).toBeGreaterThan(20);
  });

  it('validates v4 expanded catalog, 10 site design themes, 5 languages, Cyrillic transliterator & 65 3D subtypes', () => {
    expect(manifest.garments.length).toBeGreaterThanOrEqual(6000);
    expect(manifest.palettes.length).toBe(16);
    expect(manifest.looks.length).toBeGreaterThanOrEqual(30);

    expect(DESIGN_THEMES.length).toBe(10);
    for (const preset of DESIGN_THEMES) {
      expect(getDesignThemeById(preset.id).id).toBe(preset.id);
    }

    expect(LANGUAGE_OPTIONS.length).toBe(5);
    for (const opt of LANGUAGE_OPTIONS) {
      const dict = getDictionary(opt.id);
      expect(dict.meta.brand.length).toBeGreaterThan(2);
      expect(dict.studio.mode3d.length).toBeGreaterThan(1);
    }
    expect(latinToCyrillicUz('Oʻzbekiston Gʻazna')).toContain('Ўзбекистон');
    expect(latinToCyrillicUz('Oʻzbekiston Gʻazna')).toContain('Ғазна');

    expect(detectGarmentSubtype('outerwear', 'outerwear-cape-noir-1', 'Keyp')).toBe('cape');
    expect(detectGarmentSubtype('outerwear', 'outerwear-kimono-sand-1', 'Kimono')).toBe('kimono');
    expect(detectGarmentSubtype('bag', 'bag-saddle-espresso-1', 'Egar sumka')).toBe('saddle');
    expect(detectGarmentSubtype('accessory', 'acc-bucket_hat-denim-1', 'Panama')).toBe('bucket_hat');
  });
});
