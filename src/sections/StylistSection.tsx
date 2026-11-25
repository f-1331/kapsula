import { useEffect, useMemo, useState } from 'react';
import type { Occasion, PaletteId, UserGenderFilter, WeatherBand } from '../data/schema';
import { recommendOutfits, type OutfitRecommendation } from '../engine/stylist';
import { useTranslation } from '../i18n/useTranslation';
import { useKapsulaStore } from '../store/useKapsulaStore';
import {
  PRESET_CITIES,
  detectUserLocation,
  fetchLiveWeatherAnalysis,
  searchCities,
  tempToWeatherBand,
  weatherBandDefaultTemp,
  type GeoLocationInfo,
} from '../utils/weather-api';
import { LookImage } from '../components/LookImage';
import { PaletteArtwork } from '../components/PaletteArtwork';
import { ReadOnlyBoard } from '../components/ReadOnlyBoard';
import { ScoreCounter } from '../components/ScoreCounter';
import { WeatherIcon } from '../components/WeatherIcon';

const WEATHER_CARDS: Array<{ id: WeatherBand }> = [
  { id: 'hot' },
  { id: 'warm' },
  { id: 'cool' },
  { id: 'cold' },
];

const OCCASION_CARDS: Array<{ id: Occasion }> = [
  { id: 'office' },
  { id: 'university' },
  { id: 'school' },
  { id: 'walk' },
  { id: 'party' },
  { id: 'date' },
  { id: 'sport' },
  { id: 'travel' },
];

export function StylistSection() {
  const { t, localize } = useTranslation();
  const genderOptions: Array<{ id: UserGenderFilter; label: string }> = [
    { id: 'w', label: t.gender.w },
    { id: 'm', label: t.gender.m },
    { id: 'all', label: t.gender.all },
  ];
  const manifest = useKapsulaStore((s) => s.manifest);
  const query = useKapsulaStore((s) => s.query);
  const temperatureC = useKapsulaStore((s) => s.temperatureC);
  const location = useKapsulaStore((s) => s.location);
  const liveWeather = useKapsulaStore((s) => s.liveWeather);
  const autoWeatherEnabled = useKapsulaStore((s) => s.autoWeatherEnabled);
  const weatherLoading = useKapsulaStore((s) => s.weatherLoading);

  const updateQuery = useKapsulaStore((s) => s.updateQuery);
  const setTemperatureC = useKapsulaStore((s) => s.setTemperatureC);
  const setAutoWeatherEnabled = useKapsulaStore((s) => s.setAutoWeatherEnabled);
  const setWeatherLoading = useKapsulaStore((s) => s.setWeatherLoading);
  const setLiveWeather = useKapsulaStore((s) => s.setLiveWeather);
  const loadItemsToBoard = useKapsulaStore((s) => s.loadItemsToBoard);
  const saveOutfit = useKapsulaStore((s) => s.saveOutfit);
  const setActiveLookId = useKapsulaStore((s) => s.setActiveLookId);
  const setActiveView = useKapsulaStore((s) => s.setActiveView);

  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 120);
    return () => window.clearTimeout(timer);
  }, [query]);

  const [savedNoticeId, setSavedNoticeId] = useState<string | null>(null);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [cityResults, setCityResults] = useState<GeoLocationInfo[]>(PRESET_CITIES);
  const [citySearching, setCitySearching] = useState(false);

  useEffect(() => {
    if (!cityModalOpen) return;
    const timer = window.setTimeout(async () => {
      if (citySearch.trim().length < 2) {
        setCityResults(PRESET_CITIES);
        return;
      }
      setCitySearching(true);
      const found = await searchCities(citySearch);
      setCityResults(found.length > 0 ? found : PRESET_CITIES);
      setCitySearching(false);
    }, 240);
    return () => window.clearTimeout(timer);
  }, [citySearch, cityModalOpen]);

  const byId = useMemo(
    () => new Map(manifest.garments.map((g) => [g.id, g])),
    [manifest.garments],
  );
  const paletteById = useMemo(
    () => new Map(manifest.palettes.map((p) => [p.id, p])),
    [manifest.palettes],
  );

  const stylistResult = useMemo(
    () => recommendOutfits(manifest, debouncedQuery),
    [manifest, debouncedQuery],
  );

  const topOutfit = stylistResult.outfits[0];
  const alternatives = stylistResult.outfits.slice(1, 6);

  const handleWeatherCardClick = (band: WeatherBand) => {
    updateQuery({ weather: band }, weatherBandDefaultTemp(band), true);
  };

  const handleTempSliderChange = (rawVal: number) => {
    const band = tempToWeatherBand(rawVal);
    setTemperatureC(rawVal, band, true);
  };

  const handleSelectLocation = async (loc: GeoLocationInfo) => {
    setCityModalOpen(false);
    setWeatherLoading(true);
    setAutoWeatherEnabled(true);
    const analysis = await fetchLiveWeatherAnalysis(loc);
    if (analysis) {
      setLiveWeather(analysis, true);
    } else {
      setWeatherLoading(false);
    }
  };

  const handleAutoDetectLocation = async () => {
    setCityModalOpen(false);
    setWeatherLoading(true);
    setAutoWeatherEnabled(true);
    const detected = await detectUserLocation();
    const analysis = await fetchLiveWeatherAnalysis(detected);
    if (analysis) {
      setLiveWeather(analysis, true);
    } else {
      setWeatherLoading(false);
    }
  };

  const handleOpenInAtelier = (outfit: OutfitRecommendation) => {
    loadItemsToBoard(outfit.garments.map((g) => g.id));
    setActiveView('atelye');
  };

  const handleSaveTopPick = (outfit: OutfitRecommendation) => {
    const ok = saveOutfit(
      outfit.garments.map((g) => g.id),
      `${t.occasions[query.occasion].label} · ${t.weather[query.weather].label}`,
    );
    if (ok) {
      setSavedNoticeId(outfit.id);
      window.setTimeout(() => setSavedNoticeId((cur) => (cur === outfit.id ? null : cur)), 2000);
    }
  };

  return (
    <section
      id="stilist"
      aria-labelledby="stilist-heading"
      className="min-h-[calc(100dvh-7rem)] border-b border-[var(--hairline)] bg-[var(--paper)]"
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8 py-12 sm:py-16">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--hairline)] pb-6 mb-8">
          <div>
            <span className="micro-label text-[var(--muted)] block mb-2">
              {t.sections.stilist}
            </span>
            <h2
              id="stilist-heading"
              className="font-editorial text-3xl sm:text-5xl leading-none text-[var(--ink)]"
            >
              {t.stylist.heading}
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[var(--ink-2)] max-w-md">
            {t.stylist.subheading}
          </p>
        </div>

        {/* Live Geo-Weather Automatic Diagnostic Panel */}
        <div className="mb-10 border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="micro-label text-[var(--accent)]">{t.weather.autoBadge}</span>
                <span className="text-xs text-[var(--muted)]">·</span>
                <span className="text-xs font-medium text-[var(--ink)]">
                  {location.city}, {location.country}
                </span>
                {liveWeather && (
                  <span className="border border-[var(--hairline)] bg-[var(--paper)] px-2 py-0.5 text-[11px] font-tabular text-[var(--ink-2)]">
                    {localize(liveWeather.conditionUz)}
                  </span>
                )}
              </div>

              {liveWeather ? (
                <>
                  <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 mb-2">
                    <span className="font-numeral text-3xl sm:text-4xl text-[var(--ink)]">
                      {liveWeather.temperatureC > 0
                        ? `+${liveWeather.temperatureC}`
                        : liveWeather.temperatureC}
                      °C
                    </span>
                    <span className="text-xs text-[var(--ink-2)] font-tabular">
                      {t.weather.feelsLike}:{' '}
                      <strong>
                        {liveWeather.apparentTempC > 0
                          ? `+${liveWeather.apparentTempC}`
                          : liveWeather.apparentTempC}
                        °C
                      </strong>
                    </span>
                    <span className="text-xs text-[var(--ink-2)] font-tabular">
                      {t.weather.wind}: <strong>{liveWeather.windKmh} km/s</strong>
                    </span>
                    <span className="text-xs text-[var(--ink-2)] font-tabular">
                      {t.weather.humidity}: <strong>{liveWeather.humidityPct}%</strong>
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        liveWeather.rain ? 'text-[var(--accent)]' : 'text-[var(--positive)]'
                      }`}
                    >
                      {liveWeather.rain ? t.weather.rainYes : t.weather.rainNo}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--ink-2)] leading-relaxed">
                    {localize(liveWeather.adviceUz)}
                  </p>
                </>
              ) : (
                <p className="text-xs sm:text-sm text-[var(--muted)]">
                  {weatherLoading ? t.weather.tashkentLoading : t.weather.rainHint}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setCityModalOpen(true)}
                className="min-h-[44px] border border-[var(--hairline-strong)] bg-[var(--paper)] px-4 py-2 text-xs uppercase tracking-[0.1em] text-[var(--ink)] hover:border-[var(--ink)] transition-colors cursor-pointer"
              >
                {t.weather.changeCity}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!autoWeatherEnabled) {
                    setAutoWeatherEnabled(true);
                  } else {
                    void handleAutoDetectLocation();
                  }
                }}
                className={`min-h-[44px] border px-4 py-2 text-xs uppercase tracking-[0.1em] transition-colors cursor-pointer ${
                  autoWeatherEnabled
                    ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                    : 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                }`}
              >
                {autoWeatherEnabled ? t.weather.autoOn : t.weather.detectCity}
              </button>
            </div>
          </div>
        </div>

        {/* Step 01: Weather */}
        <div className="mb-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="micro-label text-[var(--ink)]">{t.stylist.step1Title}</h3>
            <button
              type="button"
              role="switch"
              aria-checked={query.rain}
              onClick={() => updateQuery({ rain: !query.rain }, undefined, true)}
              className={`min-h-[44px] inline-flex items-center gap-2.5 border px-4 py-2 text-xs uppercase tracking-[0.12em] transition-colors cursor-pointer ${
                query.rain
                  ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                  : 'border-[var(--hairline-strong)] bg-[var(--paper-elevated)] text-[var(--ink)] hover:border-[var(--ink)]'
              }`}
            >
              <WeatherIcon kind="rain" className="h-4 w-4" />
              <span>{t.weather.rain}</span>
              <span
                aria-hidden="true"
                className={`inline-block h-2 w-2 rounded-full ${
                  query.rain ? 'bg-[var(--accent)]' : 'bg-[var(--hairline-strong)]'
                }`}
              />
            </button>
          </div>

          <div
            role="radiogroup"
            aria-label={t.stylist.step1Title}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {WEATHER_CARDS.map(({ id }) => {
              const info = t.weather[id];
              const active = query.weather === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => handleWeatherCardClick(id)}
                  className={`min-h-[112px] text-left border p-4 sm:p-5 transition-colors cursor-pointer flex flex-col justify-between ${
                    active
                      ? 'border-[var(--ink)] bg-[var(--paper-elevated)] shadow-[inset_0_0_0_1px_var(--ink)]'
                      : 'border-[var(--hairline)] bg-[var(--paper)] hover:border-[var(--hairline-strong)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <WeatherIcon
                      kind={id}
                      className={`h-6 w-6 ${active ? 'text-[var(--accent)]' : 'text-[var(--ink-2)]'}`}
                    />
                    <span className="font-numeral text-lg text-[var(--ink)]">{info.range}</span>
                  </div>
                  <div className="mt-3">
                    <div className="font-editorial text-2xl leading-none text-[var(--ink)]">
                      {info.label}
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-1">{info.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 border border-[var(--hairline)] bg-[var(--paper-2)]/65 px-4 py-3">
            <label
              htmlFor="temp-slider"
              className="micro-label text-[var(--ink-2)] whitespace-nowrap"
            >
              {t.weather.tempSliderLabel}:{' '}
              <span className="font-tabular text-[var(--ink)] font-semibold">
                {temperatureC > 0 ? `+${temperatureC}` : temperatureC}°C
              </span>
            </label>
            <input
              id="temp-slider"
              type="range"
              min={-15}
              max={42}
              step={1}
              value={temperatureC}
              onChange={(e) => handleTempSliderChange(Number(e.target.value))}
              className="w-full accent-[var(--accent)] h-7 cursor-pointer"
            />
          </div>
        </div>

        {/* Step 02: Occasion + Gender */}
        <div className="mb-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="micro-label text-[var(--ink)]">{t.stylist.step2Title}</h3>

            <div className="flex items-center gap-2">
              <span className="micro-label text-[var(--muted)] mr-1">{t.gender.label}:</span>
              <div
                role="radiogroup"
                aria-label={t.gender.label}
                className="inline-flex border border-[var(--hairline-strong)] bg-[var(--paper-elevated)]"
              >
                {genderOptions.map((opt) => {
                  const selected = query.gender === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => updateQuery({ gender: opt.id })}
                      className={`min-h-[44px] px-3.5 py-2 text-xs uppercase tracking-[0.12em] transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[var(--ink)] text-[var(--paper)]'
                          : 'text-[var(--ink-2)] hover:bg-[var(--paper-2)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            role="radiogroup"
            aria-label={t.stylist.step2Title}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {OCCASION_CARDS.map(({ id }, index) => {
              const info = t.occasions[id];
              const active = query.occasion === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => updateQuery({ occasion: id })}
                  className={`min-h-[118px] text-left border p-5 transition-colors cursor-pointer flex flex-col justify-between ${
                    active
                      ? 'border-[var(--ink)] bg-[var(--paper-elevated)] shadow-[inset_0_0_0_1px_var(--ink)]'
                      : 'border-[var(--hairline)] bg-[var(--paper)] hover:border-[var(--hairline-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="micro-label text-[var(--muted)]">0{index + 1}</span>
                    {active && (
                      <span
                        aria-hidden="true"
                        className="text-xs font-medium text-[var(--accent)] tracking-[0.12em] uppercase"
                      >
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="mt-4">
                    <div className="font-editorial text-3xl leading-none text-[var(--ink)]">
                      {info.label}
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--ink-2)] mt-2 leading-snug">
                      {info.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 03: Palette */}
        <div className="mb-12">
          <h3 className="micro-label text-[var(--ink)] mb-4">{t.stylist.step3Title}</h3>

          <div
            role="radiogroup"
            aria-label={t.stylist.step3Title}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5"
          >
            {manifest.palettes.map((palette) => {
              const active = query.palette === palette.id;
              return (
                <button
                  key={palette.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => updateQuery({ palette: palette.id as PaletteId })}
                  className={`group text-left border transition-colors cursor-pointer flex flex-col overflow-hidden ${
                    active
                      ? 'border-[var(--ink)] bg-[var(--paper-elevated)] shadow-[inset_0_0_0_1px_var(--ink)]'
                      : 'border-[var(--hairline)] bg-[var(--paper)] hover:border-[var(--hairline-strong)]'
                  }`}
                >
                  <div className="relative h-20 sm:h-24 w-full border-b border-[var(--hairline)] overflow-hidden">
                    <PaletteArtwork
                      palette={palette}
                      className="group-hover:scale-[1.02] transition-transform duration-300"
                    />
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center bg-[var(--ink)] text-[var(--paper)] text-[11px]"
                      >
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="font-editorial text-lg leading-tight text-[var(--ink)]">
                        {localize(palette.name_uz)}
                      </div>
                      <div className="text-[11px] text-[var(--muted)] mt-0.5 leading-snug line-clamp-2">
                        {localize(palette.tagline_uz)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      {palette.colors.slice(0, 5).map((hex) => (
                        <span
                          key={hex}
                          className="h-3 w-3 rounded-full border border-[var(--ink)]/20"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}

            <button
              type="button"
              role="radio"
              aria-checked={query.palette === 'any'}
              onClick={() => updateQuery({ palette: 'any' })}
              className={`text-left border p-3.5 transition-colors cursor-pointer flex flex-col justify-between min-h-[144px] ${
                query.palette === 'any'
                  ? 'border-[var(--ink)] bg-[var(--paper-elevated)] shadow-[inset_0_0_0_1px_var(--ink)]'
                  : 'border-[var(--hairline)] bg-[var(--paper-2)]/50 hover:border-[var(--hairline-strong)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="micro-label text-[var(--muted)]">∞</span>
                {query.palette === 'any' && (
                  <span
                    aria-hidden="true"
                    className="flex h-5 w-5 items-center justify-center bg-[var(--ink)] text-[var(--paper)] text-[11px]"
                  >
                    ✓
                  </span>
                )}
              </div>
              <div>
                <div className="font-editorial italic text-xl leading-tight text-[var(--ink)]">
                  {t.palette.any}
                </div>
                <p className="text-[11px] text-[var(--muted)] mt-1 leading-snug">
                  {t.palette.anyTagline}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Relaxation notice */}
        {stylistResult.relaxationNotice && (
          <div
            role="status"
            className="mb-6 border-l-2 border-[var(--accent)] bg-[var(--paper-2)] px-4 py-2.5 text-xs sm:text-sm text-[var(--ink-2)]"
          >
            {localize(stylistResult.relaxationNotice)}
          </div>
        )}

        {/* Top Recommendation ("Stilist tavsiyasi") */}
        {topOutfit && (
          <div className="mb-12 border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] p-4 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              <div
                className={
                  topOutfit.matchedLook
                    ? 'lg:col-span-8 grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch'
                    : 'lg:col-span-7'
                }
              >
                <div className={topOutfit.matchedLook ? 'sm:col-span-7' : 'w-full'}>
                  <ReadOnlyBoard slots={topOutfit.slots} byId={byId} />
                </div>

                {topOutfit.matchedLook && (
                  <div className="sm:col-span-5 flex flex-col justify-between border border-[var(--hairline)] bg-[var(--paper)] p-3">
                    <LookImage
                      look={topOutfit.matchedLook}
                      garments={manifest.garments}
                      palette={paletteById.get(topOutfit.matchedLook.palette)}
                    />
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <span className="font-editorial italic text-lg text-[var(--ink)]">
                        {localize(topOutfit.matchedLook.title_uz)}
                      </span>
                      <span className="micro-label text-[var(--accent)]">
                        {t.stylist.overlapBadge}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`${
                  topOutfit.matchedLook ? 'lg:col-span-4' : 'lg:col-span-5'
                } flex flex-col justify-between h-full`}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-3 mb-4">
                    <span className="micro-label text-[var(--accent)]">
                      {t.stylist.topPickTitle}
                    </span>
                    <span className="micro-label text-[var(--muted)]">
                      {localize(topOutfit.harmony.schemeName)}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-3 mb-4">
                    <ScoreCounter
                      value={topOutfit.harmony.score}
                      className="text-6xl leading-none text-[var(--accent)]"
                    />
                    <div>
                      <div className="text-sm font-medium text-[var(--ink)]">
                        / 100 {t.colorLab.scoreUnit}
                      </div>
                      <div className="text-xs text-[var(--muted)]">
                        {localize(topOutfit.harmony.label)}
                      </div>
                    </div>
                  </div>

                  <p className="font-editorial italic text-xl sm:text-2xl leading-snug text-[var(--ink)] mb-5">
                    “{localize(topOutfit.note)}”
                  </p>

                  <div className="mb-6">
                    <div className="flex h-2 w-full overflow-hidden border border-[var(--hairline)]">
                      {topOutfit.harmony.proportions.map((slice) => (
                        <div
                          key={slice.hex}
                          style={{
                            width: `${Math.round(slice.share * 100)}%`,
                            backgroundColor: slice.hex,
                          }}
                          title={slice.hex}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[var(--hairline)]">
                  <button
                    type="button"
                    onClick={() => handleOpenInAtelier(topOutfit)}
                    className="min-h-[46px] flex-1 bg-[var(--ink)] px-5 py-3 text-xs uppercase tracking-[0.14em] text-[var(--paper)] hover:bg-[var(--accent)] transition-colors cursor-pointer"
                  >
                    {t.stylist.openInAtelier}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveTopPick(topOutfit)}
                    className="min-h-[46px] border border-[var(--ink)] px-5 py-3 text-xs uppercase tracking-[0.14em] text-[var(--ink)] hover:bg-[var(--paper-2)] transition-colors cursor-pointer"
                  >
                    {savedNoticeId === topOutfit.id ? t.stylist.savedSuccess : t.stylist.saveOutfit}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alternatives */}
        {alternatives.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h3 className="micro-label text-[var(--ink)]">{t.stylist.alternativesTitle}</h3>
              <span className="micro-label text-[var(--muted)] font-tabular">
                {alternatives.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {alternatives.map((alt) => (
                <article
                  key={alt.id}
                  className="border border-[var(--hairline)] bg-[var(--paper-elevated)] p-3 flex flex-col justify-between"
                >
                  <div>
                    {alt.matchedLook ? (
                      <div className="mb-2.5">
                        <LookImage
                          look={alt.matchedLook}
                          garments={manifest.garments}
                          palette={paletteById.get(alt.matchedLook.palette)}
                        />
                      </div>
                    ) : (
                      <div className="mb-2.5">
                        <ReadOnlyBoard slots={alt.slots} byId={byId} compact />
                      </div>
                    )}

                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="font-numeral text-2xl text-[var(--accent)]">
                        {alt.harmony.score}
                      </span>
                      <span className="text-[11px] uppercase tracking-[0.1em] text-[var(--muted)] truncate">
                        {localize(alt.harmony.schemeName)}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--ink-2)] line-clamp-2 mb-3">
                      {localize(alt.note)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenInAtelier(alt)}
                    className="min-h-[44px] w-full border border-[var(--hairline-strong)] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--paper-2)] transition-colors cursor-pointer"
                  >
                    {t.stylist.openInAtelier}
                  </button>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* Inspiration row */}
        {stylistResult.inspirationLooks.length > 0 && (
          <div className="border-t border-[var(--hairline)] pt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
              <h3 className="micro-label text-[var(--ink)]">{t.stylist.inspirationTitle}</h3>
              <span className="text-xs text-[var(--muted)]">{t.stylist.inspirationSub}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stylistResult.inspirationLooks.map(({ look }) => (
                <button
                  key={look.id}
                  type="button"
                  onClick={() => setActiveLookId(look.id)}
                  className="group text-left border border-[var(--hairline)] bg-[var(--paper-elevated)] p-3 flex items-center gap-4 hover:border-[var(--ink)] transition-colors cursor-pointer"
                >
                  <div className="w-20 shrink-0 overflow-hidden">
                    <LookImage
                      look={look}
                      garments={manifest.garments}
                      palette={paletteById.get(look.palette)}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-editorial italic text-xl text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors truncate">
                      {localize(look.title_uz)}
                    </div>
                    <div className="micro-label text-[var(--muted)] mt-1">
                      {t.occasions[look.occasion].label} · {t.weather[look.weather].label}
                    </div>
                    <div className="text-xs text-[var(--ink-2)] mt-1.5">
                      {t.lookbook.itemsCount(look.items.length)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* City & Country Picker Modal */}
      {cityModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.weather.changeCity}
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-black/75 backdrop-blur-sm p-3 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCityModalOpen(false);
          }}
        >
          <div
            className="relative my-auto w-full max-w-lg border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 flex flex-col max-h-[85dvh] shadow-2xl"
            style={{ backgroundColor: 'var(--paper-elevated)' }}
          >
            <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-3 mb-4">
              <h3 className="font-editorial text-2xl text-[var(--ink)]">{t.weather.changeCity}</h3>
              <button
                type="button"
                onClick={() => setCityModalOpen(false)}
                aria-label={t.atelier.closePicker}
                className="min-h-[44px] min-w-[44px] border border-[var(--hairline)] text-sm cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="search"
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                placeholder={t.weather.searchCityPlaceholder}
                className="flex-1 min-h-[44px] border border-[var(--hairline-strong)] bg-[var(--paper)] px-3 text-sm text-[var(--ink)]"
              />
              <button
                type="button"
                onClick={handleAutoDetectLocation}
                className="min-h-[44px] border border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] px-3 text-xs uppercase tracking-[0.1em] cursor-pointer shrink-0"
              >
                {t.weather.detectCity}
              </button>
            </div>

            {citySearching && (
              <p className="text-xs text-[var(--muted)] mb-2">{t.weather.tashkentLoading}</p>
            )}

            <div className="grid grid-cols-2 gap-2 overflow-y-auto editorial-scroll pr-1">
              {cityResults.map((city) => (
                <button
                  key={`${city.city}-${city.country}-${city.latitude}`}
                  type="button"
                  onClick={() => handleSelectLocation(city)}
                  className="min-h-[48px] text-left border border-[var(--hairline)] bg-[var(--paper)] p-3 hover:border-[var(--ink)] transition-colors cursor-pointer"
                >
                  <div className="text-sm font-medium text-[var(--ink)] truncate">{city.city}</div>
                  <div className="text-[11px] text-[var(--muted)] truncate">{city.country}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
