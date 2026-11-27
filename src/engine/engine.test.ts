import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ManifestSchema, type Manifest, type Occasion, type PaletteId, type UserGenderFilter, type WeatherBand } from '../data/schema';
import { SAMPLE_MANIFEST } from '../data/sample-manifest';
import { UZ } from '../i18n/uz';
import { LANGUAGE_OPTIONS, getDictionary, latinToCyrillicUz } from '../i18n/languages';
import { DESIGN_THEMES, getDesignThemeById } from '../styles/themes';
import { detectGarmentSubtype } from '../components/GarmentSilhouette';
import { CONTACT_INFO } from '../config/contact';
import QRCode from 'qrcode';
import * as THREE from 'three';
import { estimateOutfitBudget, getGarmentSpec } from './garment-specs';
import { buildOutfit3DScene, FLOOR_Y, PLINTH_TOP_Y } from './three-garment-builder';
import { useKapsulaStore } from '../store/useKapsulaStore';
import { isGarmentGenderEligible } from './stylist';
import { buildOutfitMeshGeometry } from './renderer3d';
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

  it('returns >= 3 complete outfits across all 8 occasions, 16 palettes and filter combinations', { timeout: 300000 }, () => {
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

  it('validates v4 expanded catalog, 10 site design themes, 5 languages, Cyrillic transliterator & 100 3D subtypes', () => {
    expect(manifest.garments.length).toBeGreaterThanOrEqual(9600);
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
    expect(detectGarmentSubtype('outerwear', 'outerwear-shearling-1', 'Dublyonka')).toBe('shearling');
    expect(detectGarmentSubtype('dress', 'dress-atlas_dress-1', 'Xon-atlas koʻylak')).toBe('atlas_dress');
    expect(detectGarmentSubtype('shoes', 'shoes-heels-1', 'Baland tufli')).toBe('heels');
    expect(detectGarmentSubtype('bag', 'bag-saddle-espresso-1', 'Egar sumka')).toBe('saddle');
    expect(detectGarmentSubtype('bag', 'bag-briefcase-1', 'Portfel')).toBe('briefcase');
    expect(detectGarmentSubtype('accessory', 'acc-bucket_hat-denim-1', 'Panama')).toBe('bucket_hat');
    expect(detectGarmentSubtype('accessory', 'acc-doppi-noir-1', 'Milliy doʻppi')).toBe('doppi');
  });

  it('builds genuine volumetric 3D garment meshes with full Z depth across outfit slots', () => {
    const pick = (cat: string) => manifest.garments.find((g) => g.category === cat)!;
    const outer = pick('outerwear');
    const top = pick('top');
    const bottom = pick('bottom');
    const shoes = pick('shoes');
    const bag = pick('bag');
    const acc = manifest.garments.find((g) => g.category === 'accessory' && g.id.includes('doppi')) ?? pick('accessory');

    const byId = new Map([outer, top, bottom, shoes, bag, acc].map((g) => [g.id, g]));
    const { tris, slotGarmentMap } = buildOutfitMeshGeometry(
      {
        outerwear: outer.id,
        top: top.id,
        bottom: bottom.id,
        dress: null,
        shoes: shoes.id,
        bag: bag.id,
        accessory1: acc.id,
        accessory2: null,
      },
      byId,
      false,
    );

    expect(slotGarmentMap.size).toBe(6);
    expect(tris.length).toBeGreaterThan(500);
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const tri of tris) {
      minZ = Math.min(minZ, tri.a.z, tri.b.z, tri.c.z);
      maxZ = Math.max(maxZ, tri.a.z, tri.b.z, tri.c.z);
    }
    expect(maxZ - minZ).toBeGreaterThan(0.4);
  });

  it('builds Three.js PBR 3D scene graph, QR SVG codes, textile specs & phone contact', async () => {
    expect(CONTACT_INFO.phoneDisplay).toBe('+998 77 272 3101');
    expect(CONTACT_INFO.phoneHref).toBe('tel:+998772723101');

    const pick = (cat: string) => manifest.garments.find((g) => g.category === cat)!;
    const outer = pick('outerwear');
    const top = pick('top');
    const bottom = pick('bottom');
    const shoes = pick('shoes');
    const bag = pick('bag');
    const byId = new Map([outer, top, bottom, shoes, bag].map((g) => [g.id, g]));

    const built = buildOutfit3DScene(
      {
        outerwear: outer.id,
        top: top.id,
        bottom: bottom.id,
        dress: null,
        shoes: shoes.id,
        bag: bag.id,
        accessory1: null,
        accessory2: null,
      },
      byId,
    );
    expect(built.interactiveMeshes.length).toBeGreaterThan(15);
    expect(Object.keys(built.slotGroups).length).toBe(5);

    const spec = getGarmentSpec(outer);
    expect(spec.minUzs).toBeGreaterThan(100_000);
    const budget = estimateOutfitBudget([outer, top, bottom, shoes, bag]);
    expect(budget.maxUzs).toBeGreaterThan(budget.minUzs);

    const svg = await QRCode.toString(CONTACT_INFO.siteUrl, { type: 'svg' });
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('enforces real-world gravity, ground contact & physical attachment across 3D garments and accessories', () => {
    const pickWhere = (pred: (g: Manifest['garments'][number]) => boolean) =>
      manifest.garments.find(pred) ?? manifest.garments[0]!;

    const outer = pickWhere((g) => g.category === 'outerwear');
    const top = pickWhere((g) => g.category === 'top');
    const bottom = pickWhere((g) => g.category === 'bottom');
    const shoes = pickWhere((g) => g.category === 'shoes');
    const toteBag = pickWhere((g) => g.category === 'bag' && !g.id.includes('backpack') && !g.id.includes('belt'));
    const backpack = pickWhere((g) => g.category === 'bag' && g.id.includes('backpack'));
    const watch = pickWhere((g) => g.category === 'accessory' && g.id.includes('watch'));
    const umbrella = pickWhere((g) => g.category === 'accessory' && g.id.includes('umbrella'));
    const cap = pickWhere((g) => g.category === 'accessory' && (g.id.includes('cap') || g.id.includes('doppi')));
    const glasses = pickWhere((g) => g.category === 'accessory' && g.id.includes('sunglasses'));

    const all = [outer, top, bottom, shoes, toteBag, backpack, watch, umbrella, cap, glasses];
    const byId = new Map(all.map((g) => [g.id, g]));

    const built = buildOutfit3DScene(
      {
        outerwear: outer.id,
        top: top.id,
        bottom: bottom.id,
        dress: null,
        shoes: shoes.id,
        bag: toteBag.id,
        accessory1: watch.id,
        accessory2: umbrella.id,
      },
      byId,
    );
    built.root.updateMatrixWorld(true);

    // 1. Pedestal base flush on shadow floor
    const pedBox = new THREE.Box3().setFromObject(built.pedestal);
    expect(pedBox.min.y).toBeCloseTo(FLOOR_Y, 2);
    // Articulated mannequin reaches from plinth top cleanly through crown (no broken spine/head gap)
    expect(pedBox.max.y).toBeGreaterThan(1.75);

    // 2. Shoes planted strictly on PLINTH_TOP_Y (zero levitation)
    const shoeBox = new THREE.Box3().setFromObject(built.slotGroups.shoes!);
    expect(Math.abs(shoeBox.min.y - PLINTH_TOP_Y)).toBeLessThan(0.005);

    // 3. Tote bag + showroom riser rest strictly on PLINTH_TOP_Y (zero floating bag!)
    const bagBox = new THREE.Box3().setFromObject(built.slotGroups.bag!);
    expect(Math.abs(bagBox.min.y - PLINTH_TOP_Y)).toBeLessThan(0.005);

    // 4. Umbrella stands vertically with ferrule flush on PLINTH_TOP_Y
    const umbBox = new THREE.Box3().setFromObject(built.slotGroups.accessory2!);
    expect(Math.abs(umbBox.min.y - PLINTH_TOP_Y)).toBeLessThan(0.005);

    // 5. Watch attaches physically around wrist (x ≈ -0.308, y ≈ 0.91), never at random distant corner
    const watchBox = new THREE.Box3().setFromObject(built.slotGroups.accessory1!);
    const watchCenter = watchBox.getCenter(new THREE.Vector3());
    expect(Math.abs(watchCenter.x + 0.31)).toBeLessThan(0.08);
    expect(Math.abs(watchCenter.y - 0.91)).toBeLessThan(0.08);

    // 6. Outerwear encapsulates inner torso along X (no inner clipping out past coat)
    const outerBox = new THREE.Box3().setFromObject(built.slotGroups.outerwear!);
    const topBox = new THREE.Box3().setFromObject(built.slotGroups.top!);
    expect(outerBox.max.x).toBeGreaterThan(topBox.max.x);

    // 7. Backpack + Hat + Sunglasses combo stays grounded/attached (backpack straps reach shoulder)
    const backScene = buildOutfit3DScene(
      {
        outerwear: outer.id,
        top: top.id,
        bottom: bottom.id,
        dress: null,
        shoes: shoes.id,
        bag: backpack.id,
        accessory1: cap.id,
        accessory2: glasses.id,
      },
      byId,
    );
    backScene.root.updateMatrixWorld(true);
    const packBox = new THREE.Box3().setFromObject(backScene.slotGroups.bag!);
    expect(packBox.max.y).toBeGreaterThan(1.42);
    const hatBox = new THREE.Box3().setFromObject(backScene.slotGroups.accessory1!);
    expect(hatBox.min.y).toBeGreaterThan(1.66);
    const glassBox = new THREE.Box3().setFromObject(backScene.slotGroups.accessory2!);
    expect(glassBox.max.z).toBeGreaterThan(0.09);
  });

  it('supports men and women gender adaptation, tailored 3D silhouettes & Atelye undo reversal', () => {
    // Men filter must exclude women-only pieces (dresses, skirts, heels, clutches)
    const menRec = recommendOutfits(manifest, {
      weather: 'cool',
      rain: false,
      occasion: 'office',
      palette: 'marine',
      gender: 'm',
    });
    expect(menRec.outfits.length).toBeGreaterThanOrEqual(1);
    for (const o of menRec.outfits) {
      for (const g of o.garments) {
        expect(isGarmentGenderEligible(g, 'm')).toBe(true);
        expect(g.gender).not.toBe('w');
        expect(g.category).not.toBe('dress');
      }
    }

    // Store selectUserGender + accidental click undo flow
    const store = useKapsulaStore.getState();
    store.setManifestData(manifest, false, true);
    store.selectUserGender('m', true);
    expect(useKapsulaStore.getState().query.gender).toBe('m');
    expect(useKapsulaStore.getState().genderGateOpen).toBe(false);

    const beforeSlots = { ...useKapsulaStore.getState().slots };
    const accidentalMenCoat = manifest.garments.find(
      (g) => g.category === 'outerwear' && g.gender === 'u' && g.id !== beforeSlots.outerwear,
    )!;
    useKapsulaStore.getState().placeGarmentOnBoard(accidentalMenCoat);
    expect(useKapsulaStore.getState().slots.outerwear).toBe(accidentalMenCoat.id);
    expect(useKapsulaStore.getState().past.length).toBe(1);

    // Undo restores exact prior outfit seamlessly
    useKapsulaStore.getState().undo();
    expect(useKapsulaStore.getState().slots).toEqual(beforeSlots);

    // Men's & Women's 3D mannequin builds keep grounding intact
    const menById = new Map(menRec.outfits[0]!.garments.map((g) => [g.id, g]));
    const men3d = buildOutfit3DScene(menRec.outfits[0]!.slots, menById, '#1E3A5F', 'm');
    men3d.root.updateMatrixWorld(true);
    const menPed = new THREE.Box3().setFromObject(men3d.pedestal);
    expect(menPed.min.y).toBeCloseTo(FLOOR_Y, 2);
  });
});
