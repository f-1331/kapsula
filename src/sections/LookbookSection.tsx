import { useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { useMemo, useState } from 'react';
import type { LookModel, Occasion, PaletteId, WeatherBand } from '../data/schema';
import { useTranslation } from '../i18n/useTranslation';
import { useKapsulaStore } from '../store/useKapsulaStore';
import { Card3D } from '../components/Card3D';
import { LookImage } from '../components/LookImage';

export function LookbookSection() {
  const { t, localize } = useTranslation();
  const manifest = useKapsulaStore((s) => s.manifest);
  const query = useKapsulaStore((s) => s.query);
  const setActiveLookId = useKapsulaStore((s) => s.setActiveLookId);
  const updateQuery = useKapsulaStore((s) => s.updateQuery);
  const setActiveView = useKapsulaStore((s) => s.setActiveView);
  const reducedMotion = useReducedMotion();

  const [occasionFilter, setOccasionFilter] = useState<Occasion | 'all'>('all');
  const [weatherFilter, setWeatherFilter] = useState<WeatherBand | 'all'>('all');
  const [paletteFilter, setPaletteFilter] = useState<PaletteId | 'all'>('all');
  const [modelFilter, setModelFilter] = useState<LookModel | 'all'>('all');

  const paletteById = useMemo(
    () => new Map(manifest.palettes.map((p) => [p.id, p])),
    [manifest.palettes],
  );

  const matchesFilter = (look: (typeof manifest.looks)[number]) => {
    if (occasionFilter !== 'all' && look.occasion !== occasionFilter) return false;
    if (weatherFilter !== 'all' && look.weather !== weatherFilter) return false;
    if (paletteFilter !== 'all' && look.palette !== paletteFilter) return false;
    if (modelFilter !== 'all' && look.model !== modelFilter) return false;
    return true;
  };

  return (
    <section
      id="lookbook"
      aria-labelledby="lookbook-heading"
      className="min-h-[calc(100dvh-7rem)] border-b border-[var(--hairline)] bg-[var(--paper)]"
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8 py-10 sm:py-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--hairline)] pb-6 mb-7">
          <div>
            <span className="micro-label text-[var(--muted)] block mb-2">
              {t.sections.lookbook}
            </span>
            <h2
              id="lookbook-heading"
              className="font-editorial text-3xl sm:text-5xl leading-none text-[var(--ink)]"
            >
              {t.lookbook.heading}
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[var(--ink-2)] max-w-md">
            {t.lookbook.subheading}
          </p>
        </div>

        {/* Filter Chips */}
        <div className="space-y-2.5 mb-8 border border-[var(--hairline)] bg-[var(--paper-elevated)] p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="micro-label text-[var(--muted)] mr-1">{t.stylist.step2Title.slice(3)}:</span>
            {(
              ['all', 'office', 'university', 'school', 'walk', 'party', 'date', 'sport', 'travel'] as const
            ).map((oc) => (
              <button
                key={oc}
                type="button"
                onClick={() => setOccasionFilter(oc)}
                className={`min-h-[38px] px-3 py-1.5 text-xs border transition-colors cursor-pointer ${
                  occasionFilter === oc
                    ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                    : 'border-[var(--hairline)] bg-[var(--paper)] text-[var(--ink-2)] hover:border-[var(--ink)]'
                }`}
              >
                {oc === 'all' ? t.lookbook.allFilter : t.occasions[oc].label}
              </button>
            ))}

            <span className="h-4 w-px bg-[var(--hairline-strong)] mx-1 hidden sm:inline-block" />

            <span className="micro-label text-[var(--muted)] mr-1">{t.stylist.step1Title.slice(3)}:</span>
            {(['all', 'hot', 'warm', 'cool', 'cold'] as const).map((wx) => (
              <button
                key={wx}
                type="button"
                onClick={() => setWeatherFilter(wx)}
                className={`min-h-[38px] px-3 py-1.5 text-xs border transition-colors cursor-pointer ${
                  weatherFilter === wx
                    ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                    : 'border-[var(--hairline)] bg-[var(--paper)] text-[var(--ink-2)] hover:border-[var(--ink)]'
                }`}
              >
                {wx === 'all' ? t.lookbook.allFilter : t.weather[wx].label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--hairline)]">
            <span className="micro-label text-[var(--muted)] mr-1">{t.stylist.step3Title.slice(3)}:</span>
            <button
              type="button"
              onClick={() => setPaletteFilter('all')}
              className={`min-h-[38px] px-3 py-1.5 text-xs border transition-colors cursor-pointer ${
                paletteFilter === 'all'
                  ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                  : 'border-[var(--hairline)] bg-[var(--paper)] text-[var(--ink-2)] hover:border-[var(--ink)]'
              }`}
            >
              {t.lookbook.allFilter}
            </button>
            {manifest.palettes.map((pal) => (
              <button
                key={pal.id}
                type="button"
                onClick={() => setPaletteFilter(pal.id)}
                className={`min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-colors cursor-pointer ${
                  paletteFilter === pal.id
                    ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                    : 'border-[var(--hairline)] bg-[var(--paper)] text-[var(--ink-2)] hover:border-[var(--ink)]'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full border border-current/30"
                  style={{ backgroundColor: pal.colors[2] }}
                />
                {localize(pal.name_uz)}
              </button>
            ))}

            <span className="h-4 w-px bg-[var(--hairline-strong)] mx-1 hidden sm:inline-block" />

            {(['all', 'w', 'm'] as const).map((model) => (
              <button
                key={model}
                type="button"
                onClick={() => setModelFilter(model)}
                className={`min-h-[38px] px-3 py-1.5 text-xs border transition-colors cursor-pointer ${
                  modelFilter === model
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
                    : 'border-[var(--hairline)] bg-[var(--paper)] text-[var(--ink-2)] hover:border-[var(--ink)]'
                }`}
              >
                {model === 'all'
                  ? t.gender.all
                  : model === 'w'
                    ? t.gender.w
                    : t.gender.m}
              </button>
            ))}

            <div className="ml-auto flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setOccasionFilter(query.occasion);
                  setWeatherFilter(query.weather);
                  setPaletteFilter(query.palette === 'any' ? 'all' : query.palette);
                  setModelFilter(query.gender);
                }}
                className="min-h-[38px] px-3 py-1.5 text-xs border border-[var(--hairline-strong)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--ink)] cursor-pointer"
              >
                {localize('Stilist filtrini yuklash')}
              </button>
              <button
                type="button"
                onClick={() => {
                  updateQuery({
                    occasion: occasionFilter === 'all' ? query.occasion : occasionFilter,
                    weather: weatherFilter === 'all' ? query.weather : weatherFilter,
                    palette: paletteFilter === 'all' ? 'any' : paletteFilter,
                    gender: modelFilter,
                  });
                  setActiveView('stilist');
                }}
                className="min-h-[38px] px-3 py-1.5 text-xs bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--accent)] transition-colors cursor-pointer"
              >
                {localize('Stilistda ochish')}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile snap carousel -> Tablet 2-col -> Desktop staggered 3-col */}
        <div className="lookbook-grid flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 sm:pb-0 sm:overflow-visible sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-6 items-start">
          {manifest.looks.map((look, index) => {
            const matched = matchesFilter(look);
            const palette = paletteById.get(look.palette);
            return (
              <m.article
                key={look.id}
                initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: matched ? 1 : 0.28, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.25) }}
                className={`snap-center shrink-0 w-[78vw] max-w-[320px] sm:w-auto sm:max-w-none transition-all duration-300 ${
                  index % 3 === 1 ? 'lg:mt-10' : ''
                } ${matched ? 'opacity-100' : 'opacity-30 saturate-50'}`}
              >
                <Card3D intensity={6}>
                  <button
                    type="button"
                    onClick={() => setActiveLookId(look.id)}
                    className="group relative w-full text-left border border-[var(--hairline)] bg-[var(--paper-elevated)] p-3 hover:border-[var(--ink)] transition-colors cursor-pointer"
                  >
                    <span className="absolute top-5 right-5 z-10 border border-[var(--ink)]/20 bg-[var(--paper)]/92 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)] shadow-xs">
                      3D · QR
                    </span>
                    <div className="overflow-hidden mb-3">
                      <LookImage
                        look={look}
                        garments={manifest.garments}
                        palette={palette}
                        className="group-hover:scale-[1.02] transition-transform duration-500"
                      />
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-editorial italic text-2xl text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                        {localize(look.title_uz)}
                      </h3>
                      <span className="micro-label text-[10px] text-[var(--muted)]">
                        {palette ? localize(palette.name_uz) : ''}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-[var(--ink-2)]">
                      <span>
                        {t.occasions[look.occasion].label} · {t.weather[look.weather].label}
                      </span>
                      <span className="text-[var(--muted)]">
                        {t.lookbook.itemsCount(look.items.length)}
                      </span>
                    </div>
                  </button>
                </Card3D>
              </m.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
