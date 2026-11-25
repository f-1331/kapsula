import { useEffect, useMemo, useState } from 'react';
import { GarmentImage } from '../components/GarmentImage';
import { ReadOnlyBoard } from '../components/ReadOnlyBoard';
import type { Garment, Occasion, WeatherBand } from '../data/schema';
import { garmentsToBoardSlots, recommendOutfits } from '../engine/stylist';
import { UZ } from '../i18n/uz';
import { useKapsulaStore } from '../store/useKapsulaStore';
import { fetchWeeklyForecast, type DailyForecastItem } from '../utils/weather-api';

type WardrobeSubTab = 'weekly' | 'packing' | 'custom' | 'saved';

export function MyWardrobeSection() {
  const manifest = useKapsulaStore((s) => s.manifest);
  const location = useKapsulaStore((s) => s.location);
  const query = useKapsulaStore((s) => s.query);
  const customGarments = useKapsulaStore((s) => s.customGarments);
  const savedOutfits = useKapsulaStore((s) => s.savedOutfits);
  const weeklyPlan = useKapsulaStore((s) => s.weeklyPlan);
  const packingChecked = useKapsulaStore((s) => s.packingChecked);
  const setDayPlan = useKapsulaStore((s) => s.setDayPlan);
  const removeCustomGarment = useKapsulaStore((s) => s.removeCustomGarment);
  const deleteSavedOutfit = useKapsulaStore((s) => s.deleteSavedOutfit);
  const togglePackingItem = useKapsulaStore((s) => s.togglePackingItem);
  const loadItemsToBoard = useKapsulaStore((s) => s.loadItemsToBoard);
  const placeGarmentOnBoard = useKapsulaStore((s) => s.placeGarmentOnBoard);
  const setActiveView = useKapsulaStore((s) => s.setActiveView);

  const [subTab, setSubTab] = useState<WardrobeSubTab>('weekly');
  const [forecast, setForecast] = useState<DailyForecastItem[]>([]);
  const [forecastLoading, setForecastLoading] = useState(false);

  // Packing configurator state
  const [tripDays, setTripDays] = useState<3 | 5 | 7>(5);
  const [tripWeather, setTripWeather] = useState<WeatherBand>(query.weather);
  const [tripOccasion, setTripOccasion] = useState<Occasion>('travel');

  const byId = useMemo(
    () => new Map(manifest.garments.map((g) => [g.id, g])),
    [manifest.garments],
  );

  useEffect(() => {
    let cancelled = false;
    setForecastLoading(true);
    void fetchWeeklyForecast(location).then((rows) => {
      if (cancelled) return;
      if (rows.length > 0) {
        setForecast(rows);
      } else {
        // Fallback deterministic 7-day preview so UI is never empty offline
        const dayNames = ['Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan', 'Yak'];
        const now = Date.now();
        setForecast(
          dayNames.map((dayNameUz, idx) => ({
            date: new Date(now + idx * 86400000).toISOString().slice(0, 10),
            dayNameUz,
            tempMaxC: 16 + ((idx * 2) % 6),
            tempMinC: 7 + (idx % 4),
            rain: idx === 2 || idx === 5,
            conditionUz: idx === 2 || idx === 5 ? 'Yomgʻir ehtimoli' : 'Oʻzgaruvchan bulutli',
            weatherBand: idx >= 4 ? 'warm' : 'cool',
          })),
        );
      }
      setForecastLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [location]);

  // Build deterministic Trip Capsule Checklist based on days, climate, and occasion
  const packingList = useMemo(() => {
    const recs = recommendOutfits(manifest, {
      weather: tripWeather,
      rain: tripWeather === 'cool' || tripWeather === 'cold',
      occasion: tripOccasion,
      palette: query.palette,
      gender: query.gender,
    });

    const uniqueGarments = new Map<string, Garment>();
    for (const outfit of recs.outfits.slice(0, tripDays === 3 ? 2 : tripDays === 5 ? 3 : 4)) {
      for (const g of outfit.garments) {
        uniqueGarments.set(g.id, g);
      }
    }
    const maxItems = tripDays === 3 ? 8 : tripDays === 5 ? 11 : 14;
    return [...uniqueGarments.values()].slice(0, maxItems);
  }, [manifest, tripDays, tripWeather, tripOccasion, query.palette, query.gender]);

  return (
    <section
      id="garderobim"
      className="min-h-[calc(100dvh-7rem)] py-10 sm:py-16 border-b border-[var(--hairline)]"
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4 pb-6 border-b border-[var(--hairline)]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)] mb-2">
              {UZ.sections.garderobim}
            </p>
            <h2 className="font-editorial text-3xl sm:text-5xl tracking-[-0.02em]">
              {UZ.myWardrobe.heading}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
              {UZ.myWardrobe.subheading}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveView('skaner')}
            className="min-h-[42px] px-4 py-2 bg-[var(--accent)] text-[#FAF7F0] text-xs uppercase tracking-[0.14em] font-medium cursor-pointer"
          >
            + Rasm yuklab kiyim qoʻshish
          </button>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-[var(--hairline)] pb-4">
          {(
            [
              { id: 'weekly', label: UZ.myWardrobe.tabWeekly },
              { id: 'packing', label: UZ.myWardrobe.tabPacking },
              { id: 'custom', label: `${UZ.myWardrobe.tabCustom} (${customGarments.length})` },
              { id: 'saved', label: `${UZ.myWardrobe.tabSaved} (${savedOutfits.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`min-h-[42px] px-4 py-2 text-xs uppercase tracking-[0.12em] border transition-colors cursor-pointer ${
                subTab === tab.id
                  ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] font-medium'
                  : 'border-[var(--hairline)] bg-[var(--paper-elevated)] text-[var(--ink-2)] hover:border-[var(--ink)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 1. 7-Day Weather-Aware Weekly Planner */}
        {subTab === 'weekly' && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-[var(--muted)]">
                {location.city}, {location.country} — 7 kunlik ob-havoga mos kunlik kapsula tavsiyalari
              </p>
              {forecastLoading && (
                <span className="text-xs text-[var(--muted)]">Ob-havo yuklanmoqda...</span>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {forecast.map((day, idx) => {
                const defaultOccasions: Occasion[] = [
                  'office',
                  'university',
                  'office',
                  'walk',
                  'date',
                  'walk',
                  'travel',
                ];
                const dayOccasion = defaultOccasions[idx % defaultOccasions.length] ?? query.occasion;
                const savedDayIds = weeklyPlan[day.date];
                const autoRec = recommendOutfits(manifest, {
                  weather: day.weatherBand,
                  rain: day.rain,
                  occasion: dayOccasion,
                  palette: query.palette,
                  gender: query.gender,
                }).outfits[0];

                const dayGarments: Garment[] = savedDayIds
                  ? savedDayIds.map((id) => byId.get(id)).filter((g): g is Garment => Boolean(g))
                  : autoRec?.garments ?? [];

                const activeIds = dayGarments.map((g) => g.id);

                return (
                  <div
                    key={day.date}
                    className="border border-[var(--hairline)] bg-[var(--paper-elevated)] p-4 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-2">
                        <div>
                          <p className="text-sm font-semibold text-[var(--ink)]">{day.dayNameUz}</p>
                          <p className="text-[11px] text-[var(--muted)] font-tabular">{day.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold font-tabular text-[var(--ink)]">
                            {day.tempMaxC > 0 ? `+${day.tempMaxC}` : day.tempMaxC}° / {day.tempMinC}°
                          </p>
                          <p className="text-[10px] text-[var(--muted)]">
                            {day.rain ? 'Yomgʻirli' : day.conditionUz}
                          </p>
                        </div>
                      </div>

                      <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-[var(--accent)]">
                        {UZ.occasions[dayOccasion].label}
                      </p>

                      <div className="mt-2 space-y-1.5">
                        {dayGarments.slice(0, 5).map((g) => (
                          <div key={g.id} className="flex items-center gap-2 text-xs text-[var(--ink-2)]">
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-[var(--ink)]/20 shrink-0"
                              style={{ backgroundColor: g.color }}
                            />
                            <span className="truncate">{g.name_uz}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-[var(--hairline)]">
                      <button
                        type="button"
                        onClick={() => {
                          setDayPlan(day.date, activeIds);
                          loadItemsToBoard(activeIds);
                          setActiveView('atelye');
                        }}
                        className="flex-1 min-h-[38px] bg-[var(--ink)] text-[var(--paper)] px-2 text-[11px] uppercase tracking-[0.1em] hover:bg-[var(--accent)] transition-colors cursor-pointer"
                      >
                        Atelyeda ochish
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Trip Capsule Packing Checklist */}
        {subTab === 'packing' && (
          <div className="mt-6 space-y-6">
            <div className="border border-[var(--hairline)] bg-[var(--paper-elevated)] p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-editorial text-2xl text-[var(--ink)]">
                  {UZ.myWardrobe.packingTitle}
                </h3>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Tanlangan safar muddati va iqlimga mos eng ixcham roʻyxat
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {([3, 5, 7] as const).map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setTripDays(days)}
                    className={`min-h-[38px] px-3.5 text-xs border cursor-pointer ${
                      tripDays === days
                        ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                        : 'border-[var(--hairline)] bg-[var(--paper)]'
                    }`}
                  >
                    {UZ.myWardrobe.packingDays(days)}
                  </button>
                ))}
                {(['hot', 'warm', 'cool', 'cold'] as WeatherBand[]).map((band) => (
                  <button
                    key={band}
                    type="button"
                    onClick={() => setTripWeather(band)}
                    className={`min-h-[38px] px-3 text-xs border cursor-pointer ${
                      tripWeather === band
                        ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                        : 'border-[var(--hairline)] bg-[var(--paper)] text-[var(--muted)]'
                    }`}
                  >
                    {UZ.weather[band].label}
                  </button>
                ))}
                {(['travel', 'office', 'walk', 'sport'] as Occasion[]).map((occ) => (
                  <button
                    key={occ}
                    type="button"
                    onClick={() => setTripOccasion(occ)}
                    className={`min-h-[38px] px-3 text-xs border cursor-pointer ${
                      tripOccasion === occ
                        ? 'border-[var(--ink)] bg-[var(--paper-2)] font-medium'
                        : 'border-[var(--hairline)] bg-[var(--paper)] text-[var(--muted)]'
                    }`}
                  >
                    {UZ.occasions[occ].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {packingList.map((g) => {
                const checked = Boolean(packingChecked[g.id]);
                return (
                  <div
                    key={g.id}
                    className={`border p-3 flex flex-col justify-between transition-colors ${
                      checked
                        ? 'border-[var(--positive)] bg-[var(--paper-2)]/70'
                        : 'border-[var(--hairline)] bg-[var(--paper-elevated)]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => togglePackingItem(g.id)}
                      className="flex items-center justify-between text-xs cursor-pointer"
                    >
                      <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
                        {UZ.categories[g.category]}
                      </span>
                      <span
                        className={`h-5 w-5 border flex items-center justify-center text-xs ${
                          checked
                            ? 'border-[var(--positive)] bg-[var(--positive)] text-white'
                            : 'border-[var(--hairline-strong)]'
                        }`}
                      >
                        {checked ? '✓' : ''}
                      </span>
                    </button>
                    <div className="h-24 w-full my-2 flex items-center justify-center">
                      <GarmentImage garment={g} className="h-full w-full" />
                    </div>
                    <p className={`text-xs ${checked ? 'line-through text-[var(--muted)]' : 'text-[var(--ink)]'}`}>
                      {g.name_uz}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Custom User-Uploaded Wardrobe */}
        {subTab === 'custom' && (
          <div className="mt-6">
            {customGarments.length === 0 ? (
              <div className="border border-dashed border-[var(--hairline-strong)] bg-[var(--paper-elevated)] p-10 text-center space-y-4">
                <p className="text-sm text-[var(--muted)] max-w-md mx-auto">
                  {UZ.myWardrobe.noCustomItems}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveView('skaner')}
                  className="min-h-[44px] px-5 bg-[var(--ink)] text-[var(--paper)] text-xs uppercase tracking-[0.14em] cursor-pointer"
                >
                  Foto-tahlil boʻlimiga oʻtish
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {customGarments.map((g) => (
                  <div
                    key={g.id}
                    className="border border-[var(--hairline)] bg-[var(--paper-elevated)] p-3 flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
                      <span>{UZ.categories[g.category]}</span>
                      <button
                        type="button"
                        onClick={() => removeCustomGarment(g.id)}
                        className="text-[var(--negative)] hover:underline cursor-pointer"
                      >
                        Oʻchirish
                      </button>
                    </div>
                    <div className="h-32 w-full flex items-center justify-center">
                      <GarmentImage garment={g} className="h-full w-full" />
                    </div>
                    <p className="text-xs font-medium text-[var(--ink)] line-clamp-2">{g.name_uz}</p>
                    <button
                      type="button"
                      onClick={() => {
                        placeGarmentOnBoard(g);
                        setActiveView('atelye');
                      }}
                      className="min-h-[38px] w-full bg-[var(--ink)] text-[var(--paper)] text-[11px] uppercase tracking-[0.1em] hover:bg-[var(--accent)] cursor-pointer"
                    >
                      Atelyeda kiyish
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Saved Outfits Gallery */}
        {subTab === 'saved' && (
          <div className="mt-6">
            {savedOutfits.length === 0 ? (
              <div className="border border-dashed border-[var(--hairline-strong)] bg-[var(--paper-elevated)] p-10 text-center text-sm text-[var(--muted)]">
                {UZ.atelier.noSaved}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {savedOutfits.map((outfit) => {
                  const items = outfit.items
                    .map((id) => byId.get(id))
                    .filter((g): g is Garment => Boolean(g));
                  return (
                    <div
                      key={outfit.id}
                      className="border border-[var(--hairline)] bg-[var(--paper-elevated)] p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-editorial text-xl text-[var(--ink)]">{outfit.title}</p>
                        <button
                          type="button"
                          onClick={() => deleteSavedOutfit(outfit.id)}
                          className="text-xs text-[var(--muted)] hover:text-[var(--negative)] cursor-pointer"
                        >
                          {UZ.atelier.deleteSaved}
                        </button>
                      </div>
                      <ReadOnlyBoard slots={garmentsToBoardSlots(items)} byId={byId} compact />
                      <button
                        type="button"
                        onClick={() => {
                          loadItemsToBoard(outfit.items);
                          setActiveView('atelye');
                        }}
                        className="w-full min-h-[40px] bg-[var(--ink)] text-[var(--paper)] text-xs uppercase tracking-[0.12em] hover:bg-[var(--accent)] cursor-pointer"
                      >
                        {UZ.atelier.loadSaved}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
