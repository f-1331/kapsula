import { useMemo, useState } from 'react';
import { GarmentImage } from '../components/GarmentImage';
import { CATEGORY_ORDER, type Category, type PriceTier } from '../data/schema';
import { useTranslation } from '../i18n/useTranslation';
import { useKapsulaStore } from '../store/useKapsulaStore';

const PAGE_SIZE = 24;

export function BrandsSection() {
  const { t, localize } = useTranslation();
  const manifest = useKapsulaStore((s) => s.manifest);
  const query = useKapsulaStore((s) => s.query);
  const placeGarmentOnBoard = useKapsulaStore((s) => s.placeGarmentOnBoard);
  const setAtelierBrandFilter = useKapsulaStore((s) => s.setAtelierBrandFilter);
  const setActiveView = useKapsulaStore((s) => s.setActiveView);

  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<PriceTier | 'all'>('all');
  const [selectedCat, setSelectedCat] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const brandStats = useMemo(() => {
    const map = new Map<string, { name: string; count: number; tier: PriceTier }>();
    for (const g of manifest.garments) {
      if (!g.brand || g.isUserUploaded) continue;
      const existing = map.get(g.brand);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(g.brand, {
          name: g.brand,
          count: 1,
          tier: g.priceTier ?? 'mid',
        });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [manifest.garments]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return manifest.garments.filter((g) => {
      if (g.isUserUploaded) return false;
      if (query.gender === 'm' && g.gender === 'w') return false;
      if (selectedBrand !== 'all' && g.brand !== selectedBrand) return false;
      if (selectedTier !== 'all' && g.priceTier !== selectedTier) return false;
      if (selectedCat !== 'all' && g.category !== selectedCat) return false;
      if (q && !`${g.name_uz} ${g.name_en} ${g.brand ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [manifest.garments, query.gender, selectedBrand, selectedTier, selectedCat, searchQuery]);

  const visibleItems = filteredItems.slice(0, limit);

  return (
    <section
      id="brendlar"
      className="min-h-[calc(100dvh-7rem)] py-10 sm:py-16 border-b border-[var(--hairline)]"
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4 pb-6 border-b border-[var(--hairline)]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)] mb-2">
              {t.sections.brendlar}
            </p>
            <h2 className="font-editorial text-3xl sm:text-5xl tracking-[-0.02em]">
              {t.brands.heading}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
              {t.brands.subheading}
            </p>
          </div>
          {selectedBrand !== 'all' && (
            <button
              type="button"
              onClick={() => {
                setAtelierBrandFilter(selectedBrand);
                setActiveView('atelye');
              }}
              className="min-h-[42px] px-4 py-2 bg-[var(--accent)] text-[var(--accent-ink)] text-xs uppercase tracking-[0.14em] font-medium cursor-pointer"
            >
              {selectedBrand} — {localize('Atelye trayda ochish')}
            </button>
          )}
        </div>

        {/* Brand Selector Cards */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setSelectedBrand('all');
              setLimit(PAGE_SIZE);
            }}
            className={`p-3 border text-left transition-colors cursor-pointer ${
              selectedBrand === 'all'
                ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                : 'border-[var(--hairline)] bg-[var(--paper-elevated)] hover:border-[var(--ink)]'
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.1em]">
              {t.brands.allBrands}
            </p>
            <p className="mt-1 text-[11px] opacity-80 font-tabular">
              {manifest.garments.length} {t.brands.itemsSuffix}
            </p>
          </button>

          {brandStats.map((b) => {
            const active = selectedBrand === b.name;
            return (
              <button
                key={b.name}
                type="button"
                onClick={() => {
                  setSelectedBrand(b.name);
                  setLimit(PAGE_SIZE);
                }}
                className={`p-3 border text-left transition-colors cursor-pointer ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--hairline)] bg-[var(--paper-elevated)] hover:border-[var(--ink)]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <p className="text-xs font-semibold text-[var(--ink)]">{b.name}</p>
                  <span className="text-[9px] uppercase tracking-[0.06em] px-1.5 py-0.5 border border-[var(--hairline)] text-[var(--muted)] shrink-0">
                    {t.brands.tierLabels[b.tier]}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[var(--muted)] font-tabular">
                  {b.count} {t.brands.itemsSuffix}
                </p>
              </button>
            );
          })}
        </div>

        {/* Filter Bar: Tier + Category + Search */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border border-[var(--hairline)] bg-[var(--paper-elevated)] p-3.5">
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'budget', 'mid', 'premium'] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => {
                  setSelectedTier(tier);
                  setLimit(PAGE_SIZE);
                }}
                className={`min-h-[36px] px-3 py-1 text-[11px] uppercase tracking-[0.1em] border cursor-pointer ${
                  selectedTier === tier
                    ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                    : 'border-[var(--hairline)] bg-[var(--paper)] text-[var(--ink-2)]'
                }`}
              >
                {tier === 'all' ? t.categories.all : t.brands.tierLabels[tier]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCat('all')}
              className={`min-h-[36px] px-2.5 py-1 text-[11px] border cursor-pointer ${
                selectedCat === 'all'
                  ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                  : 'border-[var(--hairline)] text-[var(--muted)]'
              }`}
            >
              {t.categories.all}
            </button>
            {CATEGORY_ORDER.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCat(cat);
                  setLimit(PAGE_SIZE);
                }}
                className={`min-h-[36px] px-2.5 py-1 text-[11px] border cursor-pointer ${
                  selectedCat === cat
                    ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                    : 'border-[var(--hairline)] text-[var(--muted)]'
                }`}
              >
                {t.categories[cat]}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setLimit(PAGE_SIZE);
            }}
            placeholder={t.atelier.searchPlaceholder}
            className="w-full sm:w-64 min-h-[38px] border border-[var(--hairline)] bg-[var(--paper)] px-3 text-xs text-[var(--ink)] placeholder:text-[var(--muted)]"
          />
        </div>

        {/* Results Count */}
        <p className="mt-4 text-xs text-[var(--muted)] font-tabular">
          {localize('Topildi')}: {filteredItems.length} {localize('ta kiyim')}
        </p>

        {/* Brand Items Grid */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {visibleItems.map((garment) => (
            <div
              key={garment.id}
              className="border border-[var(--hairline)] bg-[var(--paper-elevated)] p-3 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-1 text-[10px]">
                <span className="uppercase tracking-[0.08em] text-[var(--muted)] truncate">
                  {garment.brand ?? 'Kapsula'}
                </span>
                <span
                  className="h-2.5 w-2.5 rounded-full border border-[var(--ink)]/20 shrink-0"
                  style={{ backgroundColor: garment.color }}
                />
              </div>

              <div className="h-28 w-full my-2 flex items-center justify-center">
                <GarmentImage garment={garment} className="h-full w-full" />
              </div>

              <div className="space-y-2 border-t border-[var(--hairline)] pt-2">
                <p className="text-xs font-medium text-[var(--ink)] line-clamp-2 min-h-[2rem]">
                  {localize(garment.name_uz)}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    placeGarmentOnBoard(garment);
                    if (garment.brand) setAtelierBrandFilter(garment.brand);
                    setActiveView('atelye');
                  }}
                  className="w-full min-h-[38px] border border-[var(--ink)] bg-[var(--paper)] px-2 text-[11px] uppercase tracking-[0.1em] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors cursor-pointer"
                >
                  {t.brands.addToAtelier}
                </button>
              </div>
            </div>
          ))}
        </div>

        {visibleItems.length < filteredItems.length && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setLimit((prev) => prev + PAGE_SIZE)}
              className="min-h-[44px] border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] px-6 py-2.5 text-xs uppercase tracking-[0.14em] text-[var(--ink)] hover:border-[var(--ink)] cursor-pointer"
            >
              {t.atelier.loadMore(visibleItems.length, filteredItems.length)}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
