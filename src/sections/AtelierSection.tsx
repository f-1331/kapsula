import {
  DndContext,
  DragOverlay,
  KeyboardCode,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Category, Garment } from '../data/schema';
import { analyzeGarmentsHarmony } from '../engine/color';
import { estimateOutfitBudget, getGarmentSpec } from '../engine/garment-specs';
import {
  boardSlotsToGarments,
  findBestHarmonizeSwap,
  generateSeededOutfit,
  getSmartPairingAdvice,
  isGarmentGenderEligible,
  type AutoHarmonizeSuggestion,
  type BoardSlots,
  type SlotKey,
} from '../engine/stylist';
import { useTranslation } from '../i18n/useTranslation';
import { useKapsulaStore } from '../store/useKapsulaStore';
import { exportBoardPng } from '../utils/export-png';
import { AtelierSlot } from '../components/AtelierSlot';
import { AtelierTrayItem } from '../components/AtelierTrayItem';
import { GarmentImage } from '../components/GarmentImage';
import {
  detectGarmentSubtype,
  type GarmentSubtype,
} from '../components/GarmentSilhouette';
import { QrContactModal } from '../components/QrContactModal';
import { RangLaboratoriyasi } from '../components/RangLaboratoriyasi';
import { Studio3DStage } from '../components/Studio3DStage';

interface SubtypeChipDef {
  id: GarmentSubtype;
  label: string;
}

const SUBTYPE_CHIPS_BY_CATEGORY: Record<Category, SubtypeChipDef[]> = {
  outerwear: [
    { id: 'palto', label: 'Palto' },
    { id: 'peacoat', label: 'Pikat' },
    { id: 'mac_coat', label: 'Makintosh' },
    { id: 'trench', label: 'Trench / Plash' },
    { id: 'cape', label: 'Keyp' },
    { id: 'kimono', label: 'Kimono' },
    { id: 'blazer', label: 'Blazer / Pijak' },
    { id: 'tuxedo_blazer', label: 'Smoking pijak' },
    { id: 'fur_coat', label: 'Shuba / Moʻyna' },
    { id: 'shearling', label: 'Dublyonka' },
    { id: 'puffer', label: 'Puffer' },
    { id: 'cropped_puffer', label: 'Qisqa puffer' },
    { id: 'parka', label: 'Parka' },
    { id: 'anorak', label: 'Anorak' },
    { id: 'bomber', label: 'Bomber' },
    { id: 'varsity', label: 'Varsity kurtka' },
    { id: 'leather_jacket', label: 'Charm kurtka' },
    { id: 'denim_jacket', label: 'Jinsi kurtka' },
    { id: 'vest', label: 'Jilet' },
    { id: 'cardigan', label: 'Kardigan' },
  ],
  top: [
    { id: 'hoodie', label: 'Hudi' },
    { id: 'ziphoodie', label: 'Zamokli hudi' },
    { id: 'sweatshirt', label: 'Svitshot' },
    { id: 'overshirt', label: 'Overshort' },
    { id: 'turtleneck', label: 'Vodolazka' },
    { id: 'halfzip_knit', label: 'Yarim zamok sviter' },
    { id: 'vneck_sweater', label: 'V-yoqa sviter' },
    { id: 'sweater', label: 'Sviter' },
    { id: 'shirt', label: 'Koʻylak' },
    { id: 'silk_blouse', label: 'Ipak bluza' },
    { id: 'polo', label: 'Polo' },
    { id: 'knit_polo', label: 'Trikotaj polo' },
    { id: 'longsleeve', label: 'Longsliv' },
    { id: 'track_top', label: 'Olimpiyka' },
    { id: 'tunic', label: 'Tunika' },
    { id: 'crop_top', label: 'Krop-top' },
    { id: 'tank_top', label: 'Mayka / Top' },
    { id: 'tee', label: 'Futbolka' },
  ],
  bottom: [
    { id: 'wide_trousers', label: 'Keng shim' },
    { id: 'pleated_trousers', label: 'Buxma shim' },
    { id: 'slim_trousers', label: 'Klassik shim' },
    { id: 'culottes', label: 'Kyulot shim' },
    { id: 'chinos', label: 'Chinos' },
    { id: 'corduroy_pants', label: 'Velvet shim' },
    { id: 'cargo', label: 'Kargo shim' },
    { id: 'joggers', label: 'Jogger' },
    { id: 'track_pants', label: 'Sport shim' },
    { id: 'leggings', label: 'Leggins' },
    { id: 'denim', label: 'Jinsi' },
    { id: 'shorts', label: 'Shortik' },
    { id: 'skirt', label: 'Yubka' },
    { id: 'a_line_skirt', label: 'A-fason yubka' },
  ],
  dress: [
    { id: 'midi_silk', label: 'Ipak midi koʻylak' },
    { id: 'cocktail_dress', label: 'Kokteyl koʻylak' },
    { id: 'maxi_sundress', label: 'Yozgi sarafan' },
    { id: 'blazer_dress', label: 'Blazer-koʻylak' },
    { id: 'aline_dress', label: 'A-siluet koʻylak' },
    { id: 'atlas_dress', label: 'Xon-atlas koʻylak' },
    { id: 'shirt_dress', label: 'Koʻylak-rubashka' },
    { id: 'knit_dress', label: 'Trikotaj koʻylak' },
    { id: 'hoodie_dress', label: 'Hudi-koʻylak' },
  ],
  shoes: [
    { id: 'sneakers', label: 'Krossovka' },
    { id: 'canvas_sneakers', label: 'Keda' },
    { id: 'running_shoes', label: 'Yugurish krossovka' },
    { id: 'chelsea_boots', label: 'Chelsi etik' },
    { id: 'lug_boots', label: 'Massiv botinka' },
    { id: 'loafers', label: 'Lofer' },
    { id: 'moccasins', label: 'Mokasin' },
    { id: 'derbies', label: 'Derbi / Oksford' },
    { id: 'heels', label: 'Baland tufli' },
    { id: 'ballet_flats', label: 'Baletka' },
    { id: 'mules', label: 'Myuli / Sabo' },
    { id: 'sandals', label: 'Sandal' },
  ],
  bag: [
    { id: 'tote', label: 'Shoper' },
    { id: 'woven_tote', label: 'Toʻqima shoper' },
    { id: 'briefcase', label: 'Portfel' },
    { id: 'crossbody', label: 'Krossbodi' },
    { id: 'baguette', label: 'Baget sumka' },
    { id: 'belt_bag', label: 'Bel sumkasi' },
    { id: 'saddle', label: 'Egar sumka' },
    { id: 'backpack', label: 'Ryukzak' },
    { id: 'duffle', label: 'Sayohat sumkasi' },
    { id: 'clutch', label: 'Klatch' },
  ],
  accessory: [
    { id: 'scarf', label: 'Sharf' },
    { id: 'silk_scarf', label: 'Ipak roʻmol' },
    { id: 'cap', label: 'Kepka' },
    { id: 'bucket_hat', label: 'Panama' },
    { id: 'fedora', label: 'Fedora shlyapa' },
    { id: 'doppi', label: 'Milliy doʻppi' },
    { id: 'beanie', label: 'Shapka' },
    { id: 'sunglasses', label: 'Koʻzoynak' },
    { id: 'belt', label: 'Kamar' },
    { id: 'watch', label: 'Soat' },
    { id: 'tie', label: 'Galstuk' },
    { id: 'bowtie', label: 'Babochka' },
    { id: 'gloves', label: 'Qoʻlqop' },
    { id: 'bracelet', label: 'Bilaguzuk' },
    { id: 'earrings', label: 'Sirgʻa' },
    { id: 'necklace', label: 'Marjon / Zanjir' },
    { id: 'umbrella', label: 'Soyabon' },
  ],
};

const FEATURED_SUBTYPES: SubtypeChipDef[] = [
  { id: 'hoodie', label: 'Hudi' },
  { id: 'sweatshirt', label: 'Svitshot' },
  { id: 'shirt', label: 'Koʻylak' },
  { id: 'tee', label: 'Futbolka' },
  { id: 'palto', label: 'Palto' },
  { id: 'trench', label: 'Trench / Plash' },
  { id: 'puffer', label: 'Puffer' },
  { id: 'blazer', label: 'Blazer / Pijak' },
  { id: 'cargo', label: 'Kargo shim' },
  { id: 'denim', label: 'Jinsi' },
  { id: 'midi_silk', label: 'Ipak midi koʻylak' },
  { id: 'atlas_dress', label: 'Xon-atlas koʻylak' },
  { id: 'sneakers', label: 'Krossovka' },
  { id: 'loafers', label: 'Lofer' },
  { id: 'tote', label: 'Shoper' },
  { id: 'doppi', label: 'Milliy doʻppi' },
];

const ALL_SUBTYPE_CHIPS: SubtypeChipDef[] = Object.values(SUBTYPE_CHIPS_BY_CATEGORY).flat();

const FEMININE_ONLY_SUBTYPES = new Set<GarmentSubtype>([
  'cape',
  'silk_blouse',
  'tunic',
  'crop_top',
  'skirt',
  'a_line_skirt',
  'midi_silk',
  'cocktail_dress',
  'maxi_sundress',
  'blazer_dress',
  'aline_dress',
  'atlas_dress',
  'shirt_dress',
  'knit_dress',
  'hoodie_dress',
  'heels',
  'ballet_flats',
  'mules',
  'baguette',
  'earrings',
  'silk_scarf',
]);

interface AtelierChangeNotice {
  id: number;
  kind: 'placed' | 'replaced' | 'removed';
  slotKey: SlotKey;
  slotLabel: string;
  garment: Garment;
  replacedGarment?: Garment | null;
}

function findEquippedSlot(slots: BoardSlots, garmentId: string): SlotKey | null {
  for (const key of Object.keys(slots) as SlotKey[]) {
    if (slots[key] === garmentId) return key;
  }
  return null;
}

const TRAY_PAGE_SIZE = 36;

function resolveTargetSlot(
  garment: Garment,
  slots: BoardSlots,
  hoveredSlot?: SlotKey,
): SlotKey {
  if (garment.category === 'accessory') {
    if (hoveredSlot === 'accessory1' || hoveredSlot === 'accessory2') return hoveredSlot;
    if (!slots.accessory1) return 'accessory1';
    if (!slots.accessory2) return 'accessory2';
    return 'accessory2';
  }
  return garment.category;
}

function simulatePlacement(
  slots: BoardSlots,
  garment: Garment,
  targetSlot: SlotKey,
): BoardSlots {
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
  } else if (garment.category === 'accessory') {
    const other = targetSlot === 'accessory1' ? 'accessory2' : 'accessory1';
    if (next[other] === garment.id) next[other] = null;
    next[targetSlot] = garment.id;
  } else {
    next[targetSlot] = garment.id;
  }
  return next;
}

function slotCategory(slotKey: SlotKey): Category {
  if (slotKey === 'accessory1' || slotKey === 'accessory2') return 'accessory';
  return slotKey;
}

export function AtelierSection() {
  const manifest = useKapsulaStore((s) => s.manifest);
  const query = useKapsulaStore((s) => s.query);
  const slots = useKapsulaStore((s) => s.slots);
  const past = useKapsulaStore((s) => s.past);
  const future = useKapsulaStore((s) => s.future);
  const savedOutfits = useKapsulaStore((s) => s.savedOutfits);
  const atelierBrandFilter = useKapsulaStore((s) => s.atelierBrandFilter);
  const customGarments = useKapsulaStore((s) => s.customGarments);
  const missingIdsNotice = useKapsulaStore((s) => s.missingIdsNotice);
  const lastScoreAnnouncement = useKapsulaStore((s) => s.lastScoreAnnouncement);

  const placeGarmentOnBoard = useKapsulaStore((s) => s.placeGarmentOnBoard);
  const removeSlot = useKapsulaStore((s) => s.removeSlot);
  const selectUserGender = useKapsulaStore((s) => s.selectUserGender);
  const setBoardSlots = useKapsulaStore((s) => s.setBoardSlots);
  const clearBoard = useKapsulaStore((s) => s.clearBoard);
  const undo = useKapsulaStore((s) => s.undo);
  const redo = useKapsulaStore((s) => s.redo);
  const saveOutfit = useKapsulaStore((s) => s.saveOutfit);
  const deleteSavedOutfit = useKapsulaStore((s) => s.deleteSavedOutfit);
  const loadItemsToBoard = useKapsulaStore((s) => s.loadItemsToBoard);
  const setAtelierBrandFilter = useKapsulaStore((s) => s.setAtelierBrandFilter);
  const openColorsInLab = useKapsulaStore((s) => s.openColorsInLab);
  const setActiveView = useKapsulaStore((s) => s.setActiveView);
  const incrementRandomSeed = useKapsulaStore((s) => s.incrementRandomSeed);
  const setScoreAnnouncement = useKapsulaStore((s) => s.setScoreAnnouncement);
  const dismissMissingNotice = useKapsulaStore((s) => s.dismissMissingNotice);
  const buildShareUrl = useKapsulaStore((s) => s.buildShareUrl);

  // Tray filters & pagination for 9,600+ garments across 100 subtypes
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [activeSubtype, setActiveSubtype] = useState<GarmentSubtype | 'all'>('all');
  const [showAllSubtypes, setShowAllSubtypes] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(TRAY_PAGE_SIZE);
  const [filterWeather, setFilterWeather] = useState(false);
  const [filterPalette, setFilterPalette] = useState(false);
  const [onlyCustomFilter, setOnlyCustomFilter] = useState(false);

  // Mobile workspace mode + 3D Stage mode
  const { t, localize } = useTranslation();
  const categoryTabs: Array<{ id: Category | 'all'; label: string }> = [
    { id: 'all', label: t.categories.all },
    { id: 'outerwear', label: t.categories.outerwear },
    { id: 'top', label: t.categories.top },
    { id: 'bottom', label: t.categories.bottom },
    ...(query.gender !== 'm' ? [{ id: 'dress' as const, label: t.categories.dress }] : []),
    { id: 'shoes', label: t.categories.shoes },
    { id: 'bag', label: t.categories.bag },
    { id: 'accessory', label: t.categories.accessory },
  ];
  const rawSubtypeListBase =
    activeCategory === 'all'
      ? showAllSubtypes
        ? ALL_SUBTYPE_CHIPS
        : FEATURED_SUBTYPES
      : SUBTYPE_CHIPS_BY_CATEGORY[activeCategory];
  const rawSubtypeList =
    query.gender === 'm'
      ? rawSubtypeListBase.filter((c) => !FEMININE_ONLY_SUBTYPES.has(c.id))
      : rawSubtypeListBase;
  const subtypeChips: Array<{ id: GarmentSubtype | 'all'; label: string }> = [
    { id: 'all', label: t.categories.all },
    ...rawSubtypeList.map((c) => ({
      id: c.id,
      label: localize(c.label),
    })),
  ];
  const [boardMode, setBoardMode] = useState<'2d' | '3d'>('3d');
  const [mobilePanel, setMobilePanel] = useState<'board' | 'tray' | 'lab'>('board');
  const [mobileTrayOpen, setMobileTrayOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<SlotKey | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [lastChange, setLastChange] = useState<AtelierChangeNotice | null>(null);
  const [harmonizeSuggestion, setHarmonizeSuggestion] = useState<AutoHarmonizeSuggestion | null>(null);
  const [harmonizeNoneMsg, setHarmonizeNoneMsg] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Drag & Drop state
  const [activeDragGarment, setActiveDragGarment] = useState<Garment | null>(null);
  const [activeDragSource, setActiveDragSource] = useState<'tray' | 'board' | null>(null);
  const [hoveredSlotKey, setHoveredSlotKey] = useState<SlotKey | null>(null);
  const [isOverBoard, setIsOverBoard] = useState(false);

  const byId = useMemo(
    () => new Map(manifest.garments.map((g) => [g.id, g])),
    [manifest.garments],
  );

  const selectedPalette = useMemo(
    () =>
      query.palette === 'any'
        ? null
        : manifest.palettes.find((p) => p.id === query.palette) ?? null,
    [manifest.palettes, query.palette],
  );

  const placedGarments = useMemo(
    () => boardSlotsToGarments(slots, byId),
    [slots, byId],
  );

  const placedIds = useMemo(
    () => new Set(placedGarments.map((g) => g.id)),
    [placedGarments],
  );

  const harmony = useMemo(
    () => analyzeGarmentsHarmony(placedGarments, selectedPalette),
    [placedGarments, selectedPalette],
  );

  const contextualTips = useMemo(() => {
    const tips: string[] = [];
    if (query.weather === 'cold' && !placedGarments.some((g) => g.warmth === 3)) {
      tips.push(t.colorLab.tips.needWarmLayer);
    }
    const shoe = slots.shoes ? byId.get(slots.shoes) : undefined;
    if (query.occasion === 'party' && shoe && shoe.formality < 2) {
      tips.push(t.colorLab.tips.formalShoes);
    }
    return tips;
  }, [query.weather, query.occasion, placedGarments, slots.shoes, byId, t.colorLab.tips]);

  const smartAdvice = useMemo(
    () => getSmartPairingAdvice(placedGarments, manifest, query),
    [placedGarments, manifest, query],
  );

  const prevScoreRef = useRef<number>(harmony.score);
  useEffect(() => {
    if (prevScoreRef.current !== harmony.score && placedGarments.length > 0) {
      setScoreAnnouncement(
        t.atelier.scoreLiveAnnouncement(prevScoreRef.current, harmony.score),
      );
    }
    prevScoreRef.current = harmony.score;
  }, [harmony.score, placedGarments.length, setScoreAnnouncement, t.atelier]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    if (!pickerSlot) return;
    setPickerSearch('');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerSlot(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pickerSlot]);

  useEffect(() => {
    if (query.gender === 'm' && activeCategory === 'dress') {
      setActiveCategory('all');
      setActiveSubtype('all');
    }
  }, [query.gender, activeCategory]);

  useEffect(() => {
    if (!lastChange) return;
    const id = window.setTimeout(() => {
      setLastChange((cur) => (cur?.id === lastChange.id ? null : cur));
    }, 8000);
    return () => window.clearTimeout(id);
  }, [lastChange]);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleLimit(TRAY_PAGE_SIZE);
  }, [
    activeCategory,
    activeSubtype,
    searchText,
    filterWeather,
    filterPalette,
    query.gender,
    atelierBrandFilter,
    onlyCustomFilter,
  ]);

  // Filtered tray garments across 3,894+ branded items + user photos
  const filteredTrayGarments = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    return manifest.garments.filter((g) => {
      if (onlyCustomFilter && !g.isUserUploaded) return false;
      if (!isGarmentGenderEligible(g, query.gender)) return false;
      if (atelierBrandFilter !== 'all' && g.brand !== atelierBrandFilter) return false;
      if (activeCategory !== 'all' && g.category !== activeCategory) return false;
      if (filterWeather && !g.weather.includes(query.weather)) return false;
      if (filterPalette && query.palette !== 'any' && !g.palettes.includes(query.palette)) {
        return false;
      }
      if (
        activeSubtype !== 'all' &&
        detectGarmentSubtype(g.category, g.id, `${g.name_uz} ${g.name_en}`) !== activeSubtype
      ) {
        return false;
      }
      if (
        q &&
        !`${g.name_uz} ${g.name_en} ${g.id} ${g.brand ?? ''}`.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [
    manifest.garments,
    onlyCustomFilter,
    query.gender,
    query.weather,
    query.palette,
    atelierBrandFilter,
    activeCategory,
    activeSubtype,
    searchText,
    filterWeather,
    filterPalette,
  ]);

  const visibleTrayGarments = useMemo(
    () => filteredTrayGarments.slice(0, visibleLimit),
    [filteredTrayGarments, visibleLimit],
  );

  // Compute live deltas ONLY for currently visible tray items (< 2ms!)
  const trayDeltas = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of visibleTrayGarments) {
      if (placedIds.has(g.id)) continue;
      const target = resolveTargetSlot(g, slots);
      const nextSlots = simulatePlacement(slots, g, target);
      const nextGarments = boardSlotsToGarments(nextSlots, byId);
      const nextScore = analyzeGarmentsHarmony(nextGarments, selectedPalette).score;
      map.set(g.id, nextScore - harmony.score);
    }
    return map;
  }, [visibleTrayGarments, placedIds, slots, byId, selectedPalette, harmony.score]);

  const dragTargetSlot: SlotKey | null = useMemo(() => {
    if (!activeDragGarment || (!isOverBoard && !hoveredSlotKey)) return null;
    return resolveTargetSlot(activeDragGarment, slots, hoveredSlotKey ?? undefined);
  }, [activeDragGarment, isOverBoard, hoveredSlotKey, slots]);

  const dragPreviewDelta: number | null = useMemo(() => {
    if (!activeDragGarment || !dragTargetSlot || activeDragSource !== 'tray') return null;
    const nextSlots = simulatePlacement(slots, activeDragGarment, dragTargetSlot);
    const nextGarments = boardSlotsToGarments(nextSlots, byId);
    const nextScore = analyzeGarmentsHarmony(nextGarments, selectedPalette).score;
    return nextScore - harmony.score;
  }, [activeDragGarment, dragTargetSlot, activeDragSource, slots, byId, selectedPalette, harmony.score]);

  const keyboardCoordinates: KeyboardCoordinateGetter = (event, { currentCoordinates }) => {
    const delta = 48;
    switch (event.code) {
      case KeyboardCode.Right:
        return { ...currentCoordinates, x: currentCoordinates.x + delta };
      case KeyboardCode.Left:
        return { ...currentCoordinates, x: currentCoordinates.x - delta };
      case KeyboardCode.Down:
        return { ...currentCoordinates, y: currentCoordinates.y + delta };
      case KeyboardCode.Up:
        return { ...currentCoordinates, y: currentCoordinates.y - delta };
      default:
        return undefined;
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }),
  );

  const collisionDetection: CollisionDetection = (args) => {
    const pointerHits = pointerWithin(args);
    if (pointerHits.length > 0) return pointerHits;
    if (!args.pointerCoordinates) return rectIntersection(args);
    return [];
  };

  const { setNodeRef: setBoardDropRef } = useDroppable({
    id: 'board-root',
    data: { type: 'board-root' },
  });
  const { setNodeRef: setMobileDropStripRef, isOver: isOverMobileDropStrip } = useDroppable({
    id: 'board-mobile-drop',
    data: { type: 'board-root' },
  });
  const { setNodeRef: setTrayDropRef } = useDroppable({
    id: 'tray-dropzone',
    data: { type: 'tray' },
  });

  const getSlotDisplayName = (slotKey: SlotKey): string => {
    if (slotKey === 'accessory1') return t.slots.accessory1;
    if (slotKey === 'accessory2') return t.slots.accessory2;
    return t.slots[slotKey];
  };

  const announcements: Announcements = {
    onDragStart({ active }) {
      const garment = (active.data.current as { garment?: Garment } | undefined)?.garment;
      return garment ? t.atelier.dndAnnouncements.onDragStart(localize(garment.name_uz)) : '';
    },
    onDragOver({ active, over }) {
      const garment = (active.data.current as { garment?: Garment } | undefined)?.garment;
      if (!garment || !over) return '';
      const targetSlot = resolveTargetSlot(garment, slots);
      return t.atelier.dndAnnouncements.onDragOver(
        localize(garment.name_uz),
        getSlotDisplayName(targetSlot),
      );
    },
    onDragEnd({ active, over }) {
      const garment = (active.data.current as { garment?: Garment } | undefined)?.garment;
      if (!garment) return '';
      if (!over || over.id === 'tray-dropzone') {
        return t.atelier.dndAnnouncements.onDragEnd(localize(garment.name_uz));
      }
      const targetSlot = resolveTargetSlot(garment, slots);
      return t.atelier.dndAnnouncements.onDragEnd(
        localize(garment.name_uz),
        getSlotDisplayName(targetSlot),
      );
    },
    onDragCancel({ active }) {
      const garment = (active.data.current as { garment?: Garment } | undefined)?.garment;
      return garment ? t.atelier.dndAnnouncements.onDragCancel(localize(garment.name_uz)) : '';
    },
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as
      | { type?: 'tray-garment' | 'board-garment'; garment?: Garment }
      | undefined;
    if (data?.garment) {
      setActiveDragGarment(data.garment);
      setActiveDragSource(data.type === 'board-garment' ? 'board' : 'tray');
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId || overId === 'tray-dropzone') {
      setIsOverBoard(false);
      setHoveredSlotKey(null);
      return;
    }
    if (overId === 'board-root' || overId === 'board-mobile-drop') {
      setIsOverBoard(true);
      setHoveredSlotKey(null);
      return;
    }
    if (overId.startsWith('slot:')) {
      setIsOverBoard(true);
      setHoveredSlotKey(overId.replace('slot:', '') as SlotKey);
    }
  };

  const applyGarmentWithNotice = (item: Garment, preferredSlot?: SlotKey) => {
    const target = resolveTargetSlot(item, slots, preferredSlot);
    const prevId =
      slots[target] ??
      (item.category === 'top' || item.category === 'bottom' ? slots.dress : null) ??
      (item.category === 'dress' ? slots.top ?? slots.bottom : null);
    const prevGarment = prevId && prevId !== item.id ? byId.get(prevId) ?? null : null;
    placeGarmentOnBoard(item, target);
    setHarmonizeSuggestion(null);
    setHarmonizeNoneMsg(null);
    setLastChange({
      id: Date.now(),
      kind: prevGarment ? 'replaced' : 'placed',
      slotKey: target,
      slotLabel: getSlotDisplayName(target),
      garment: item,
      replacedGarment: prevGarment,
    });
  };

  const handleQuickToggleFromTray = (item: Garment) => {
    const equippedSlot = findEquippedSlot(slots, item.id);
    if (equippedSlot) {
      removeSlot(equippedSlot);
      setHarmonizeSuggestion(null);
      setHarmonizeNoneMsg(null);
      setLastChange({
        id: Date.now(),
        kind: 'removed',
        slotKey: equippedSlot,
        slotLabel: getSlotDisplayName(equippedSlot),
        garment: item,
        replacedGarment: null,
      });
      return;
    }
    applyGarmentWithNotice(item);
  };

  const removeSlotWithNotice = (slotKey: SlotKey) => {
    const existingId = slots[slotKey];
    const existing = existingId ? byId.get(existingId) : undefined;
    removeSlot(slotKey);
    if (existing) {
      setLastChange({
        id: Date.now(),
        kind: 'removed',
        slotKey,
        slotLabel: getSlotDisplayName(slotKey),
        garment: existing,
        replacedGarment: null,
      });
    }
  };

  const handleUndoWithNotice = () => {
    if (past.length === 0) return;
    undo();
    setLastChange(null);
    showTempFeedback(localize('Oxirgi oʻzgarish bekor qilindi ✓'));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeData = event.active.data.current as
      | { type?: 'tray-garment' | 'board-garment'; slotKey?: SlotKey; garment?: Garment }
      | undefined;
    const overId = event.over?.id ? String(event.over.id) : null;

    setActiveDragGarment(null);
    setActiveDragSource(null);
    setHoveredSlotKey(null);
    setIsOverBoard(false);

    if (!activeData?.garment) return;

    if (activeData.type === 'board-garment' && activeData.slotKey) {
      if (!overId || overId === 'tray-dropzone') {
        removeSlotWithNotice(activeData.slotKey);
        setHarmonizeSuggestion(null);
        return;
      }
      if (overId.startsWith('slot:') && activeData.garment.category === 'accessory') {
        const target = overId.replace('slot:', '') as SlotKey;
        if (target === 'accessory1' || target === 'accessory2') {
          applyGarmentWithNotice(activeData.garment, target);
        }
      }
      return;
    }

    if (activeData.type === 'tray-garment' && overId && overId !== 'tray-dropzone') {
      const hovered = overId.startsWith('slot:')
        ? (overId.replace('slot:', '') as SlotKey)
        : undefined;
      applyGarmentWithNotice(activeData.garment, hovered);
    }
  };

  const showTempFeedback = (msg: string) => {
    setStatusFeedback(msg);
    window.setTimeout(() => setStatusFeedback((cur) => (cur === msg ? null : cur)), 2400);
  };

  const handleRandom = () => {
    const seed = incrementRandomSeed();
    const outfit = generateSeededOutfit(manifest, query, seed);
    if (outfit) {
      setBoardSlots(outfit.slots, true);
      setHarmonizeSuggestion(null);
      setHarmonizeNoneMsg(null);
    }
  };

  const handleHarmonize = () => {
    setHarmonizeNoneMsg(null);
    if (placedGarments.length < 2) {
      setHarmonizeSuggestion(null);
      setHarmonizeNoneMsg(t.atelier.harmonizeEmpty);
      return;
    }
    const suggestion = findBestHarmonizeSwap(slots, manifest, selectedPalette, query.gender);
    if (!suggestion || suggestion.delta < 2) {
      setHarmonizeSuggestion(null);
      setHarmonizeNoneMsg(t.atelier.harmonizeAlready);
      return;
    }
    setHarmonizeSuggestion(suggestion);
  };

  const applyHarmonizeSuggestion = () => {
    if (!harmonizeSuggestion) return;
    applyGarmentWithNotice(harmonizeSuggestion.garment, harmonizeSuggestion.slot);
  };

  const handleSave = () => {
    const ids = placedGarments.map((g) => g.id);
    if (saveOutfit(ids)) {
      showTempFeedback(t.stylist.savedSuccess);
    }
  };

  const handleShare = async () => {
    const url = buildShareUrl();
    try {
      window.history.replaceState(null, '', url);
    } catch {
      // ignore
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: t.meta.brandFull, url });
        return;
      }
    } catch {
      // fallback
    }
    try {
      await navigator.clipboard.writeText(url);
      showTempFeedback(t.atelier.shareCopied);
    } catch {
      showTempFeedback(t.atelier.shareCopied);
    }
  };

  const handleExportPng = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await exportBoardPng(slots, byId, harmony);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSlotPickerOpen = (slotKey: SlotKey) => {
    if (harmonizeSuggestion && harmonizeSuggestion.slot === slotKey) {
      applyHarmonizeSuggestion();
      return;
    }
    setPickerSlot(slotKey);
  };

  const pickerCandidates = useMemo(() => {
    if (!pickerSlot) return [];
    const cat = slotCategory(pickerSlot);
    const pq = pickerSearch.trim().toLowerCase();
    return manifest.garments
      .filter((g) => {
        if (g.category !== cat || !isGarmentGenderEligible(g, query.gender)) return false;
        if (pq && !`${g.name_uz} ${g.name_en} ${g.id}`.toLowerCase().includes(pq)) return false;
        return true;
      })
      .slice(0, 60);
  }, [pickerSlot, pickerSearch, manifest.garments, query.gender]);

  const outer = slots.outerwear ? byId.get(slots.outerwear) : undefined;
  const dress = slots.dress ? byId.get(slots.dress) : undefined;
  const top = slots.top ? byId.get(slots.top) : undefined;
  const bottom = slots.bottom ? byId.get(slots.bottom) : undefined;
  const bag = slots.bag ? byId.get(slots.bag) : undefined;
  const shoes = slots.shoes ? byId.get(slots.shoes) : undefined;
  const acc1 = slots.accessory1 ? byId.get(slots.accessory1) : undefined;
  const acc2 = slots.accessory2 ? byId.get(slots.accessory2) : undefined;

  const trayContent = (
    <div ref={setTrayDropRef} className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-2.5 mb-2.5">
        <h3 className="micro-label text-[var(--ink)]">{t.atelier.trayTitle}</h3>
        <div className="flex items-center gap-1.5">
          <div className="inline-flex border border-[var(--hairline)] bg-[var(--paper)] p-0.5">
            {(['m', 'w', 'all'] as const).map((gOpt) => (
              <button
                key={gOpt}
                type="button"
                onClick={() => selectUserGender(gOpt, false)}
                className={`px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em] cursor-pointer ${
                  query.gender === gOpt
                    ? 'bg-[var(--ink)] text-[var(--paper)] font-semibold'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                {gOpt === 'm' ? t.gender.m : gOpt === 'w' ? t.gender.w : t.gender.all}
              </button>
            ))}
          </div>
          <span className="micro-label text-[var(--muted)] font-tabular">
            {filteredTrayGarments.length}
          </span>
        </div>
      </div>

      {/* Search across 9,600+ garments */}
      <input
        type="search"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        placeholder={t.atelier.searchPlaceholder}
        className="mb-2.5 min-h-[38px] w-full border border-[var(--hairline-strong)] bg-[var(--paper)] px-2.5 text-xs text-[var(--ink)] placeholder:text-[var(--muted)]"
      />

      {/* Category-aware Subtype Chips (100 garment types) */}
      <div
        className={`flex flex-wrap gap-1 mb-2.5 ${
          showAllSubtypes || activeCategory !== 'all' ? 'max-h-[120px] overflow-y-auto editorial-scroll pr-0.5' : ''
        }`}
      >
        {subtypeChips.map((chip) => {
          const active = activeSubtype === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setActiveSubtype(chip.id)}
              className={`min-h-[28px] px-2 py-0.5 text-[10px] border transition-colors cursor-pointer ${
                active
                  ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                  : 'border-[var(--hairline)] bg-[var(--paper)] text-[var(--ink-2)] hover:border-[var(--ink)]'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
        {activeCategory === 'all' && (
          <button
            type="button"
            onClick={() => setShowAllSubtypes((v) => !v)}
            className="min-h-[28px] px-2 py-0.5 text-[10px] border border-dashed border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer font-medium"
          >
            {showAllSubtypes
              ? localize('Yigʻish')
              : localize(`+ Barcha turlar (${ALL_SUBTYPE_CHIPS.length})`)}
          </button>
        )}
      </div>

      {/* Weather, Palette, Brand & Custom Photo toggles */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {atelierBrandFilter !== 'all' && (
          <button
            type="button"
            onClick={() => setAtelierBrandFilter('all')}
            className="min-h-[34px] px-2.5 py-1 text-[11px] border border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium cursor-pointer flex items-center gap-1.5"
          >
            <span>
              {localize('Brend')}: {atelierBrandFilter}
            </span>
            <span aria-hidden="true">×</span>
          </button>
        )}
        {customGarments.length > 0 && (
          <button
            type="button"
            onClick={() => setOnlyCustomFilter((v) => !v)}
            className={`min-h-[34px] px-2.5 py-1 text-[11px] border transition-colors cursor-pointer ${
              onlyCustomFilter
                ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                : 'border-[var(--hairline-strong)] bg-[var(--paper)] text-[var(--ink-2)] hover:border-[var(--ink)]'
            }`}
          >
            {localize('Shaxsiy')} ({customGarments.length})
          </button>
        )}
        <button
          type="button"
          onClick={() => setFilterWeather((v) => !v)}
          aria-pressed={filterWeather}
          className={`min-h-[34px] px-2.5 py-1 text-[11px] border transition-colors cursor-pointer ${
            filterWeather
              ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
              : 'border-[var(--hairline-strong)] bg-[var(--paper)] text-[var(--ink-2)] hover:border-[var(--ink)]'
          }`}
        >
          {t.atelier.filterWeather}
        </button>
        <button
          type="button"
          onClick={() => setFilterPalette((v) => !v)}
          aria-pressed={filterPalette}
          disabled={query.palette === 'any'}
          className={`min-h-[34px] px-2.5 py-1 text-[11px] border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            filterPalette && query.palette !== 'any'
              ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
              : 'border-[var(--hairline-strong)] bg-[var(--paper)] text-[var(--ink-2)] hover:border-[var(--ink)]'
          }`}
        >
          {t.atelier.filterPalette}
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1 mb-2.5 pb-2 border-b border-[var(--hairline)]">
        {categoryTabs.map((tab) => {
          const active = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveCategory(tab.id);
                setActiveSubtype('all');
                setVisibleLimit(TRAY_PAGE_SIZE);
              }}
              className={`min-h-[32px] px-2 py-1 text-[10px] uppercase tracking-[0.09em] border transition-colors cursor-pointer ${
                active
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 2-Column Paginated Grid */}
      <div className="editorial-scroll flex-1 overflow-y-auto pr-1">
        {visibleTrayGarments.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--muted)]">{t.atelier.emptyTray}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 pb-3">
              {visibleTrayGarments.map((g) => {
                const targetSlot = resolveTargetSlot(g, slots);
                const isEquipped = placedIds.has(g.id);
                const replacesExisting =
                  !isEquipped &&
                  Boolean(
                    slots[targetSlot] ??
                      ((g.category === 'top' || g.category === 'bottom') ? slots.dress : null) ??
                      (g.category === 'dress' ? (slots.top ?? slots.bottom) : null),
                  );
                return (
                  <AtelierTrayItem
                    key={g.id}
                    garment={g}
                    isOnBoard={isEquipped}
                    replacesExisting={replacesExisting}
                    scoreDelta={trayDeltas.get(g.id) ?? null}
                    onQuickPlace={handleQuickToggleFromTray}
                  />
                );
              })}
            </div>
            {visibleLimit < filteredTrayGarments.length && (
              <button
                type="button"
                onClick={() => setVisibleLimit((n) => n + TRAY_PAGE_SIZE)}
                className="min-h-[42px] w-full mb-3 border border-[var(--hairline-strong)] bg-[var(--paper)] text-xs uppercase tracking-[0.1em] text-[var(--ink)] hover:border-[var(--ink)] cursor-pointer"
              >
                {t.atelier.loadMore(visibleTrayGarments.length, filteredTrayGarments.length)}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <section
      id="atelye"
      aria-labelledby="atelye-heading"
      className="min-h-[calc(100dvh-7rem)] border-b border-[var(--hairline)] bg-[var(--paper)]"
    >
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {lastScoreAnnouncement}
      </div>

      <div className="mx-auto max-w-[1360px] px-4 sm:px-8 py-12 sm:py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--hairline)] pb-6 mb-6 sm:mb-8">
          <div>
            <span className="micro-label text-[var(--muted)] block mb-2">
              {t.sections.atelye}
            </span>
            <h2
              id="atelye-heading"
              className="font-editorial text-3xl sm:text-5xl leading-none text-[var(--ink)]"
            >
              {t.atelier.heading}
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[var(--ink-2)] max-w-md">
            {t.atelier.subheading}
          </p>
        </div>

        {missingIdsNotice && (
          <div
            role="status"
            className="mb-5 flex items-center justify-between gap-4 border border-[var(--hairline-strong)] bg-[var(--paper-2)] px-4 py-2.5 text-xs text-[var(--ink-2)]"
          >
            <span>{t.atelier.missingIdsNotice}</span>
            <button
              type="button"
              onClick={dismissMissingNotice}
              className="min-h-[36px] px-2 text-xs underline cursor-pointer"
            >
              {t.atelier.closePicker}
            </button>
          </div>
        )}

        {/* Mobile Clean Panel Switcher (< 768px) */}
        <div className="grid grid-cols-3 md:hidden border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] mb-4">
          <button
            type="button"
            onClick={() => setMobilePanel('board')}
            className={`min-h-[44px] text-xs uppercase tracking-[0.1em] border-b-2 transition-colors ${
              mobilePanel === 'board'
                ? 'border-[var(--accent)] text-[var(--ink)] font-semibold bg-[var(--paper)]'
                : 'border-transparent text-[var(--muted)]'
            }`}
          >
            {t.atelier.mobileTabBoard}
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel('tray')}
            className={`min-h-[44px] text-xs uppercase tracking-[0.1em] border-b-2 transition-colors ${
              mobilePanel === 'tray'
                ? 'border-[var(--accent)] text-[var(--ink)] font-semibold bg-[var(--paper)]'
                : 'border-transparent text-[var(--muted)]'
            }`}
          >
            {t.atelier.mobileTabTray} ({filteredTrayGarments.length})
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel('lab')}
            className={`min-h-[44px] text-xs uppercase tracking-[0.1em] border-b-2 transition-colors ${
              mobilePanel === 'lab'
                ? 'border-[var(--accent)] text-[var(--ink)] font-semibold bg-[var(--paper)]'
                : 'border-transparent text-[var(--muted)]'
            }`}
          >
            {t.atelier.mobileTabLab} ({harmony.score})
          </button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          accessibility={{ announcements }}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            setActiveDragGarment(null);
            setActiveDragSource(null);
            setHoveredSlotKey(null);
            setIsOverBoard(false);
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* LEFT TRAY */}
            <aside
              className={`${
                mobilePanel === 'tray' ? 'block' : 'hidden'
              } md:block md:col-span-12 xl:col-span-3 md:order-3 xl:order-1 border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] p-4 h-[580px] xl:sticky xl:top-16 xl:h-[calc(100dvh-5.5rem)]`}
            >
              {trayContent}
            </aside>

            {/* CENTER BOARD + TOOLBAR */}
            <div
              className={`${
                mobilePanel === 'board' ? 'block' : 'hidden'
              } md:block md:col-span-7 xl:col-span-5 md:order-1 xl:order-2 space-y-4`}
            >
              <div className="flex flex-wrap items-center gap-1.5 border border-[var(--hairline)] bg-[var(--paper-elevated)] p-2">
                <button
                  type="button"
                  onClick={handleUndoWithNotice}
                  disabled={past.length === 0}
                  title="Ctrl+Z"
                  className="min-h-[42px] px-2.5 py-2 text-[11px] uppercase tracking-[0.09em] border border-[var(--hairline)] text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer font-tabular"
                >
                  ↩ {t.atelier.toolbar.undo}
                  {past.length > 0 ? ` (${past.length})` : ''}
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={future.length === 0}
                  title="Ctrl+Shift+Z"
                  className="min-h-[42px] px-2.5 py-2 text-[11px] uppercase tracking-[0.09em] border border-[var(--hairline)] text-[var(--ink)] hover:border-[var(--ink)] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                >
                  {t.atelier.toolbar.redo}
                </button>
                <button
                  type="button"
                  onClick={handleRandom}
                  className="min-h-[42px] px-2.5 py-2 text-[11px] uppercase tracking-[0.09em] border border-[var(--hairline)] text-[var(--ink)] hover:border-[var(--ink)] cursor-pointer"
                >
                  {t.atelier.toolbar.random}
                </button>
                <button
                  type="button"
                  onClick={clearBoard}
                  className="min-h-[42px] px-2.5 py-2 text-[11px] uppercase tracking-[0.09em] border border-[var(--hairline)] text-[var(--ink-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] cursor-pointer"
                >
                  {t.atelier.toolbar.clear}
                </button>
                <button
                  type="button"
                  onClick={handleHarmonize}
                  className="min-h-[42px] px-3 py-2 text-[11px] uppercase tracking-[0.1em] bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--accent)] transition-colors cursor-pointer"
                >
                  {t.atelier.toolbar.harmonize}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="min-h-[42px] px-2.5 py-2 text-[11px] uppercase tracking-[0.09em] border border-[var(--hairline)] text-[var(--ink)] hover:border-[var(--ink)] cursor-pointer"
                >
                  {t.atelier.toolbar.save}
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="min-h-[42px] px-2.5 py-2 text-[11px] uppercase tracking-[0.09em] border border-[var(--hairline)] text-[var(--ink)] hover:border-[var(--ink)] cursor-pointer"
                >
                  {t.atelier.toolbar.share}
                </button>
                <button
                  type="button"
                  onClick={handleExportPng}
                  disabled={isExporting}
                  className="min-h-[42px] px-2.5 py-2 text-[11px] uppercase tracking-[0.09em] border border-[var(--hairline)] text-[var(--ink)] hover:border-[var(--ink)] disabled:opacity-50 cursor-pointer"
                >
                  {t.atelier.toolbar.exportPng}
                </button>
                <button
                  type="button"
                  onClick={() => setSavedOpen((v) => !v)}
                  className="min-h-[42px] px-2.5 py-2 text-[11px] uppercase tracking-[0.09em] border border-[var(--hairline-strong)] bg-[var(--paper-2)] text-[var(--ink)] hover:border-[var(--ink)] cursor-pointer font-tabular"
                >
                  {t.atelier.toolbar.savedList} ({savedOutfits.length})
                </button>
                <button
                  type="button"
                  onClick={() => setQrOpen(true)}
                  className="min-h-[42px] px-2.5 py-2 text-[11px] uppercase tracking-[0.09em] border border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-semibold hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] transition-colors cursor-pointer"
                >
                  QR Kod
                </button>

                {/* 2D Taxta / 3D Sahna Switch */}
                <div className="ml-auto inline-flex border border-[var(--ink)] bg-[var(--paper)] p-0.5">
                  <button
                    type="button"
                    onClick={() => setBoardMode('3d')}
                    className={`min-h-[34px] px-2.5 text-[10px] uppercase tracking-[0.12em] transition-colors cursor-pointer ${
                      boardMode === '3d'
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-semibold'
                        : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {t.studio.mode3d}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBoardMode('2d')}
                    className={`min-h-[34px] px-2.5 text-[10px] uppercase tracking-[0.12em] transition-colors cursor-pointer ${
                      boardMode === '2d'
                        ? 'bg-[var(--ink)] text-[var(--paper)] font-semibold'
                        : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {t.studio.modeBoard}
                  </button>
                </div>
              </div>

              {/* Active Equipped Layers Pill Strip (shows exact slots worn + 1-tap remove/highlight) */}
              {placedGarments.length > 0 && (
                <div className="border border-[var(--hairline)] bg-[var(--paper-elevated)] px-3 py-2">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] font-semibold">
                      {localize('Hozir kiyilgan qismlar')} ({placedGarments.length})
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">
                      {localize('Bosib yechish yoki 3D ustidan almashtirish')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        'outerwear',
                        'dress',
                        'top',
                        'bottom',
                        'shoes',
                        'bag',
                        'accessory1',
                        'accessory2',
                      ] as const
                    ).map((slotKey) => {
                      const gid = slots[slotKey];
                      const g = gid ? byId.get(gid) : undefined;
                      if (!g) return null;
                      const isRecent = lastChange?.slotKey === slotKey && lastChange.kind !== 'removed';
                      return (
                        <div
                          key={slotKey}
                          className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[11px] transition-all ${
                            isRecent
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)] ring-1 ring-[var(--accent)] text-[var(--ink)] font-medium'
                              : 'border-[var(--hairline)] bg-[var(--paper)] text-[var(--ink-2)]'
                          }`}
                        >
                          <span
                            className="h-2 w-2 rounded-full border border-black/20 shrink-0"
                            style={{ backgroundColor: g.color }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSlotPickerOpen(slotKey)}
                            className="hover:text-[var(--ink)] cursor-pointer max-w-[140px] truncate"
                            title={`${getSlotDisplayName(slotKey)}: ${localize(g.name_uz)}`}
                          >
                            <span className="text-[9px] uppercase tracking-[0.06em] text-[var(--muted)] mr-1">
                              {getSlotDisplayName(slotKey)}:
                            </span>
                            {localize(g.name_uz)}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSlotWithNotice(slotKey)}
                            aria-label={`${localize(g.name_uz)} ${localize('yechish')}`}
                            className="ml-0.5 px-1 text-xs text-[var(--muted)] hover:text-[var(--negative)] cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Live Swap / Accidental-Tap Change Banner directly above 3D Stage */}
              {lastChange && (
                <div
                  role="status"
                  className="flex flex-wrap items-center justify-between gap-2.5 border border-[var(--accent)] bg-[var(--accent-soft)] px-3.5 py-2.5 text-xs shadow-sm"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className="h-3 w-3 rounded-full border border-black/20 shrink-0"
                      style={{ backgroundColor: lastChange.garment.color }}
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--accent)] font-semibold block">
                        {lastChange.slotLabel} ·{' '}
                        {lastChange.kind === 'removed'
                          ? localize('Yechildi')
                          : lastChange.kind === 'replaced'
                            ? localize('Almashtirildi')
                            : localize('Kiyildi')}
                      </span>
                      <p className="text-[var(--ink)] font-medium truncate">
                        {localize(lastChange.garment.name_uz)}
                        {lastChange.replacedGarment ? (
                          <span className="text-[var(--muted)] font-normal ml-1.5">
                            ({localize('oldingi')}: {localize(lastChange.replacedGarment.name_uz)})
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {past.length > 0 && (
                      <button
                        type="button"
                        onClick={handleUndoWithNotice}
                        className="min-h-[32px] bg-[var(--ink)] px-3 text-[10px] uppercase tracking-[0.1em] font-semibold text-[var(--paper)] hover:bg-[var(--accent)] cursor-pointer"
                      >
                        ↩ {localize('Bekor qilish')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setLastChange(null)}
                      aria-label={t.atelier.closePicker}
                      className="min-h-[32px] px-2 border border-[var(--hairline-strong)] bg-[var(--paper)] text-xs text-[var(--ink)] cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {(harmonizeSuggestion || harmonizeNoneMsg || statusFeedback) && (
                <div
                  role="status"
                  className="flex flex-wrap items-center justify-between gap-3 border border-[var(--accent)]/40 bg-[var(--paper-elevated)] px-4 py-2.5 text-xs"
                >
                  {harmonizeSuggestion ? (
                    <>
                      <span className="font-medium text-[var(--ink)]">
                        {localize(
                          t.atelier.harmonizeResult(
                            localize(harmonizeSuggestion.garment.name_uz),
                            harmonizeSuggestion.delta,
                          ),
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={applyHarmonizeSuggestion}
                        className="min-h-[36px] bg-[var(--accent)] px-3.5 py-1.5 text-[11px] uppercase tracking-[0.12em] text-[var(--paper)] cursor-pointer"
                      >
                        {t.atelier.harmonizeApply}
                      </button>
                    </>
                  ) : (
                    <span className="text-[var(--ink-2)]">
                      {localize(harmonizeNoneMsg ?? statusFeedback ?? '')}
                    </span>
                  )}
                </div>
              )}

              {/* Interactive 3D Boutique Stage OR 2D Drag & Drop Editorial Board */}
              {boardMode === '3d' ? (
                <div ref={setBoardDropRef}>
                  <Studio3DStage
                    slots={slots}
                    byId={byId}
                    onSelectSlot={handleSlotPickerOpen}
                    labels={{
                      spin: t.studio.spin360,
                      layers: t.studio.zLayers,
                      dragHint: t.studio.dragHint,
                    }}
                  />
                </div>
              ) : (
              <div
                ref={setBoardDropRef}
                className={`relative border bg-[var(--paper-elevated)] p-2.5 sm:p-4 transition-colors ${
                  isOverBoard
                    ? 'border-[var(--accent)] shadow-[inset_0_0_0_1px_var(--accent)]'
                    : 'border-[var(--hairline-strong)]'
                }`}
              >
                {activeDragGarment && activeDragSource === 'tray' && dragPreviewDelta !== null && (
                  <div className="mb-3 flex items-center justify-between border border-[var(--accent)] bg-[var(--paper)] px-3 py-1.5 text-xs">
                    <span className="text-[var(--ink)]">
                      {t.atelier.previewScore(harmony.score + dragPreviewDelta)}
                    </span>
                    <span
                      className={`font-semibold font-tabular ${
                        dragPreviewDelta >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'
                      }`}
                    >
                      {dragPreviewDelta > 0
                        ? `▲ +${dragPreviewDelta}`
                        : dragPreviewDelta < 0
                          ? `▼ ${dragPreviewDelta}`
                          : '• 0'}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3 sm:h-[560px]">
                  <div className="sm:col-span-4 grid grid-cols-2 sm:flex sm:flex-col gap-2 sm:gap-2.5 sm:h-full">
                    <AtelierSlot
                      slotKey="outerwear"
                      label={t.slots.outerwear}
                      garment={outer}
                      isHighlighted={dragTargetSlot === 'outerwear'}
                      isPulsing={harmonizeSuggestion?.slot === 'outerwear'}
                      previewDelta={dragTargetSlot === 'outerwear' ? dragPreviewDelta : null}
                      className="col-span-2 h-[170px] sm:h-auto sm:flex-1 sm:min-h-0"
                      onRemove={removeSlot}
                      onOpenPicker={handleSlotPickerOpen}
                    />
                    <div className="col-span-2 grid grid-cols-2 gap-2 h-[130px] sm:h-[142px] shrink-0">
                      <AtelierSlot
                        slotKey="accessory1"
                        label={t.slots.accessory}
                        garment={acc1}
                        isHighlighted={dragTargetSlot === 'accessory1'}
                        isPulsing={harmonizeSuggestion?.slot === 'accessory1'}
                        previewDelta={dragTargetSlot === 'accessory1' ? dragPreviewDelta : null}
                        className="h-full"
                        onRemove={removeSlot}
                        onOpenPicker={handleSlotPickerOpen}
                      />
                      <AtelierSlot
                        slotKey="accessory2"
                        label={t.slots.accessory}
                        garment={acc2}
                        isHighlighted={dragTargetSlot === 'accessory2'}
                        isPulsing={harmonizeSuggestion?.slot === 'accessory2'}
                        previewDelta={dragTargetSlot === 'accessory2' ? dragPreviewDelta : null}
                        className="h-full"
                        onRemove={removeSlot}
                        onOpenPicker={handleSlotPickerOpen}
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-4 flex flex-col sm:h-full">
                    {dress && dragTargetSlot !== 'top' && dragTargetSlot !== 'bottom' ? (
                      <AtelierSlot
                        slotKey="dress"
                        label={t.slots.dress}
                        garment={dress}
                        isHighlighted={dragTargetSlot === 'dress'}
                        isPulsing={harmonizeSuggestion?.slot === 'dress'}
                        previewDelta={dragTargetSlot === 'dress' ? dragPreviewDelta : null}
                        className="h-[220px] sm:h-full"
                        onRemove={removeSlot}
                        onOpenPicker={handleSlotPickerOpen}
                      />
                    ) : (
                      <div className="grid grid-cols-2 sm:flex sm:flex-col h-[176px] sm:h-full gap-2 sm:gap-2.5">
                        <AtelierSlot
                          slotKey="top"
                          label={t.slots.top}
                          garment={top}
                          isHighlighted={dragTargetSlot === 'top'}
                          isPulsing={harmonizeSuggestion?.slot === 'top'}
                          previewDelta={dragTargetSlot === 'top' ? dragPreviewDelta : null}
                          className="h-full sm:h-auto sm:flex-1 sm:min-h-0"
                          onRemove={removeSlot}
                          onOpenPicker={handleSlotPickerOpen}
                        />
                        <AtelierSlot
                          slotKey="bottom"
                          label={t.slots.bottom}
                          garment={bottom}
                          isHighlighted={dragTargetSlot === 'bottom'}
                          isPulsing={harmonizeSuggestion?.slot === 'bottom'}
                          previewDelta={dragTargetSlot === 'bottom' ? dragPreviewDelta : null}
                          className="h-full sm:h-auto sm:flex-1 sm:min-h-0"
                          onRemove={removeSlot}
                          onOpenPicker={handleSlotPickerOpen}
                        />
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-4 grid grid-cols-2 sm:flex sm:flex-col gap-2 sm:gap-2.5 sm:h-full">
                    <AtelierSlot
                      slotKey="bag"
                      label={t.slots.bag}
                      garment={bag}
                      isHighlighted={dragTargetSlot === 'bag'}
                      isPulsing={harmonizeSuggestion?.slot === 'bag'}
                      previewDelta={dragTargetSlot === 'bag' ? dragPreviewDelta : null}
                      className="h-[164px] sm:h-auto sm:flex-1 sm:min-h-0"
                      onRemove={removeSlot}
                      onOpenPicker={handleSlotPickerOpen}
                    />
                    <AtelierSlot
                      slotKey="shoes"
                      label={t.slots.shoes}
                      garment={shoes}
                      isHighlighted={dragTargetSlot === 'shoes'}
                      isPulsing={harmonizeSuggestion?.slot === 'shoes'}
                      previewDelta={dragTargetSlot === 'shoes' ? dragPreviewDelta : null}
                      className="h-[164px] sm:h-auto sm:flex-1 sm:min-h-0"
                      onRemove={removeSlot}
                      onOpenPicker={handleSlotPickerOpen}
                    />
                  </div>
                </div>
              </div>
              )}

              {/* Smart Pairing Advisor Card */}
              {smartAdvice && (
                <div className="border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="micro-label text-[var(--accent)] mb-1">
                      {t.atelier.smartAdvisorTitle}
                    </p>
                    <p className="text-xs sm:text-sm text-[var(--ink)] leading-relaxed">
                      {localize(smartAdvice.summaryUz)}
                    </p>
                  </div>
                  {smartAdvice.recommendedAdd && (
                    <button
                      type="button"
                      onClick={() => {
                        if (smartAdvice.recommendedAdd) {
                          applyGarmentWithNotice(smartAdvice.recommendedAdd);
                        }
                      }}
                      className="min-h-[40px] shrink-0 bg-[var(--accent)] text-[var(--accent-ink)] px-3.5 py-2 text-[11px] uppercase tracking-[0.12em] font-medium hover:opacity-90 cursor-pointer"
                    >
                      {t.atelier.smartAdvisorAdd}
                    </button>
                  )}
                </div>
              )}

              {/* Atelier Textile Specs & Estimated Budget Bar */}
              {placedGarments.length > 0 && (
                <div className="panel-3d border border-[var(--hairline)] bg-[var(--paper-elevated)] p-3.5 sm:p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--hairline)] pb-2">
                    <span className="micro-label text-[var(--muted)]">
                      {localize('Mato & Taxminiy byudjet')}
                    </span>
                    <span className="text-xs font-semibold font-tabular text-[var(--ink)]">
                      {localize(estimateOutfitBudget(placedGarments).labelUz)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {placedGarments.slice(0, 5).map((item) => {
                      const sp = getGarmentSpec(item);
                      return (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1.5 border border-[var(--hairline)] bg-[var(--paper)] px-2 py-1 text-[10px] text-[var(--ink-2)]"
                        >
                          <span
                            className="h-2 w-2 rounded-full border border-[var(--ink)]/20 shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span>{localize(sp.fabricUz)}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {savedOpen && (
                <div className="border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] p-4">
                  <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-2 mb-3">
                    <h3 className="micro-label text-[var(--ink)]">
                      {t.atelier.saveLimitNote(savedOutfits.length)}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setSavedOpen(false)}
                      className="min-h-[36px] px-2 text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                    >
                      {t.atelier.closePicker}
                    </button>
                  </div>

                  {savedOutfits.length === 0 ? (
                    <p className="py-4 text-xs text-[var(--muted)]">{t.atelier.noSaved}</p>
                  ) : (
                    <ul className="space-y-2 max-h-60 overflow-y-auto editorial-scroll">
                      {savedOutfits.map((saved) => (
                        <li
                          key={saved.id}
                          className="flex items-center justify-between gap-3 border border-[var(--hairline)] bg-[var(--paper)] px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-[var(--ink)] truncate">
                              {localize(saved.title)}
                            </div>
                            <div className="text-[11px] text-[var(--muted)]">
                              {t.lookbook.itemsCount(saved.items.length)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                loadItemsToBoard(saved.items);
                                setSavedOpen(false);
                              }}
                              className="min-h-[36px] border border-[var(--ink)] px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-[var(--ink)] hover:bg-[var(--paper-2)] cursor-pointer"
                            >
                              {t.atelier.loadSaved}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteSavedOutfit(saved.id)}
                              className="min-h-[36px] border border-[var(--hairline)] px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] cursor-pointer"
                            >
                              {t.atelier.deleteSaved}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT COLOR LABORATORY PANEL */}
            <div
              className={`${
                mobilePanel === 'lab' ? 'block' : 'hidden'
              } md:block md:col-span-5 xl:col-span-4 md:order-2 xl:order-3 space-y-3`}
            >
              <RangLaboratoriyasi analysis={harmony} extraTips={contextualTips} />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const cols = Array.from(new Set(placedGarments.map((g) => g.color))).slice(0, 5);
                    if (cols.length >= 2) {
                      openColorsInLab(cols);
                    } else {
                      setActiveView('ranglar');
                    }
                  }}
                  className="min-h-[40px] border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-[var(--ink)] hover:border-[var(--ink)] cursor-pointer"
                >
                  {localize('Ranglar laboratoriyasi')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('garderobim')}
                  className="min-h-[40px] border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-[var(--ink)] hover:border-[var(--ink)] cursor-pointer"
                >
                  {t.nav.garderobim} ({savedOutfits.length})
                </button>
              </div>
            </div>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeDragGarment ? (
              <div className="w-28 h-32 border border-[var(--accent)] bg-[var(--paper-elevated)]/95 p-2 shadow-lg flex flex-col items-center justify-center pointer-events-none">
                <GarmentImage garment={activeDragGarment} className="max-h-20 w-full" eager />
                <span className="mt-1 text-[10px] text-[var(--ink)] truncate w-full text-center">
                  {localize(activeDragGarment.name_uz)}
                </span>
              </div>
            ) : null}
          </DragOverlay>

          {/* Mobile Bottom Sheet Drawer */}
          {mobileTrayOpen && (
            <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-xs pointer-events-auto">
              <div
                ref={setMobileDropStripRef}
                onClick={() => {
                  if (!activeDragGarment) setMobileTrayOpen(false);
                }}
                className={`flex-1 flex items-end justify-center p-4 transition-colors ${
                  activeDragGarment && activeDragSource === 'tray'
                    ? isOverMobileDropStrip
                      ? 'bg-[var(--accent)]/25'
                      : 'bg-black/25'
                    : ''
                }`}
              >
                {activeDragGarment && activeDragSource === 'tray' && (
                  <div
                    className={`w-full border px-4 py-3 text-center text-xs uppercase tracking-[0.12em] transition-colors ${
                      isOverMobileDropStrip
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--paper)]'
                        : 'border-[var(--paper)] bg-[var(--paper-elevated)] text-[var(--ink)]'
                    }`}
                  >
                    {t.atelier.dropZoneHint}
                    {dragPreviewDelta !== null
                      ? ` · ${t.atelier.previewScore(harmony.score + dragPreviewDelta)}`
                      : ''}
                  </div>
                )}
              </div>
              <div
                className="h-[64dvh] border-t border-[var(--ink)] bg-[var(--paper-elevated)] p-4 flex flex-col shadow-2xl"
                style={{ backgroundColor: 'var(--paper-elevated)' }}
              >
                <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-2.5 mb-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-numeral text-2xl text-[var(--accent)]">
                      {harmony.score}
                    </span>
                    <span className="text-xs text-[var(--ink-2)]">
                      {localize(harmony.schemeName)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileTrayOpen(false)}
                    aria-label={t.atelier.closePicker}
                    className="min-h-[44px] border border-[var(--hairline-strong)] px-3 text-xs uppercase tracking-[0.1em] text-[var(--ink)] cursor-pointer"
                  >
                    {t.atelier.closePicker}
                  </button>
                </div>
                <div className="flex-1 min-h-0">{trayContent}</div>
              </div>
            </div>
          )}
        </DndContext>

        {/* Sticky Mobile Action Bar (docked neatly above fixed bottom app nav) */}
        <div
          className="md:hidden sticky bottom-14 z-30 mt-6 -mx-4 border-t border-[var(--hairline-strong)] bg-[var(--paper)] px-4 py-2.5 flex items-center justify-between gap-2"
          style={{ backgroundColor: 'var(--paper)' }}
        >
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-numeral text-3xl leading-none text-[var(--accent)]">
              {harmony.score}
            </span>
            <span className="text-[11px] text-[var(--ink-2)] truncate">
              {localize(harmony.schemeName)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setMobileTrayOpen(true)}
              className="min-h-[44px] border border-[var(--ink)] bg-[var(--paper-elevated)] px-3 text-[11px] uppercase tracking-[0.1em] text-[var(--ink)] cursor-pointer"
            >
              {t.atelier.mobileTrayOpen}
            </button>
            <button
              type="button"
              onClick={handleHarmonize}
              className="min-h-[44px] bg-[var(--ink)] px-3 text-[11px] uppercase tracking-[0.1em] text-[var(--paper)] cursor-pointer"
            >
              {t.atelier.toolbar.harmonize}
            </button>
          </div>
        </div>
      </div>

      {/* Compatible Slot Picker Modal */}
      {pickerSlot && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${getSlotDisplayName(pickerSlot)} — ${t.atelier.pickForSlot}`}
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-black/75 backdrop-blur-sm p-3 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPickerSlot(null);
          }}
        >
          <div
            className="relative my-auto w-full max-w-xl max-h-[85dvh] border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 flex flex-col shadow-2xl"
            style={{ backgroundColor: 'var(--paper-elevated)' }}
          >
            <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-3 mb-3">
              <div>
                <span className="micro-label text-[var(--muted)] block">
                  {getSlotDisplayName(pickerSlot)}
                </span>
                <h3 className="font-editorial text-2xl text-[var(--ink)]">
                  {t.atelier.pickForSlot}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPickerSlot(null)}
                className="min-h-[44px] min-w-[44px] border border-[var(--hairline)] text-sm text-[var(--ink)] hover:border-[var(--ink)] cursor-pointer"
                aria-label={t.atelier.closePicker}
              >
                ×
              </button>
            </div>

            <input
              type="search"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder={t.atelier.searchPlaceholder}
              className="mb-3 min-h-[40px] w-full border border-[var(--hairline-strong)] bg-[var(--paper)] px-3 text-xs text-[var(--ink)]"
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto editorial-scroll pr-1">
              {pickerCandidates.map((cand) => {
                const isSelected = slots[pickerSlot] === cand.id;
                return (
                  <button
                    key={cand.id}
                    type="button"
                    onClick={() => {
                      applyGarmentWithNotice(cand, pickerSlot);
                      setPickerSlot(null);
                    }}
                    className={`text-left border p-2.5 transition-colors cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--hairline)] bg-[var(--paper)] hover:border-[var(--ink)]'
                    }`}
                  >
                    <div className="h-24 w-full overflow-hidden flex items-center justify-center mb-2">
                      <GarmentImage garment={cand} className="h-full w-full" />
                    </div>
                    <div className="text-xs text-[var(--ink)] leading-tight">
                      {localize(cand.name_uz)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floating Accidental-Click Protection Toast (stays visible even when scrolled deep inside Garderob) */}
      {lastChange && (
        <div
          style={{ backgroundColor: 'var(--paper-elevated)' }}
          className="fixed bottom-28 md:bottom-6 right-4 z-40 max-w-sm border border-[var(--accent)] bg-[var(--paper-elevated)] p-3 shadow-2xl flex items-center justify-between gap-3"
        >
          <div className="min-w-0 flex-1">
            <span className="text-[9px] uppercase tracking-[0.12em] text-[var(--accent)] font-semibold block">
              {lastChange.slotLabel} ·{' '}
              {lastChange.kind === 'removed'
                ? localize('Yechildi')
                : lastChange.kind === 'replaced'
                  ? localize('Almashtirildi')
                  : localize('Tanlandi')}
            </span>
            <p className="text-xs font-medium text-[var(--ink)] truncate">
              {localize(lastChange.garment.name_uz)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {mobilePanel === 'tray' && (
              <button
                type="button"
                onClick={() => {
                  setMobilePanel('board');
                  setMobileTrayOpen(false);
                }}
                className="md:hidden min-h-[32px] border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 text-[10px] font-semibold text-[var(--accent)] cursor-pointer"
              >
                3D →
              </button>
            )}
            {past.length > 0 && (
              <button
                type="button"
                onClick={handleUndoWithNotice}
                className="min-h-[32px] bg-[var(--ink)] px-2.5 text-[10px] uppercase tracking-[0.08em] font-semibold text-[var(--paper)] hover:bg-[var(--accent)] cursor-pointer"
              >
                ↩ {localize('Bekor')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setLastChange(null)}
              aria-label={t.atelier.closePicker}
              className="min-h-[32px] px-1.5 text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <QrContactModal open={qrOpen} initialMode="outfit" onClose={() => setQrOpen(false)} />
    </section>
  );
}
