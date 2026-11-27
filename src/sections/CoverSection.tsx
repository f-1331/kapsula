import { useReducedMotion, useScroll, useTransform } from 'motion/react';
import * as m from 'motion/react-m';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CONTACT_INFO } from '../config/contact';
import type { PaletteId } from '../data/schema';
import { resolveAssetUrl } from '../data/manifest-loader';
import { estimateOutfitBudget } from '../engine/garment-specs';
import { isGarmentGenderEligible, recommendOutfits } from '../engine/stylist';
import { useTranslation } from '../i18n/useTranslation';
import { useKapsulaStore, type ViewTab } from '../store/useKapsulaStore';
import { Card3D } from '../components/Card3D';
import { GarmentSilhouette } from '../components/GarmentSilhouette';
import { QrContactModal } from '../components/QrContactModal';
import { Studio3DStage } from '../components/Studio3DStage';

export function CoverSection() {
  const { t, localize } = useTranslation();
  const quickHub: Array<{ view: ViewTab; num: string; title: string; desc: string }> = [
    {
      view: 'stilist',
      num: '01',
      title: t.nav.stilist,
      desc: localize('Ob-havo, ofis, maktab, universitet va sport uchun tayyor obrazlar.'),
    },
    {
      view: 'atelye',
      num: '02',
      title: t.nav.atelye,
      desc: localize('WebGL 3D Sahna, sudrab almashtirish, byudjet va brend filtri.'),
    },
    {
      view: 'skaner',
      num: '03',
      title: t.nav.skaner,
      desc: localize('Rasm yoki kamerada kiyimni tahlil qilib, mos juftlik toping.'),
    },
    {
      view: 'brendlar',
      num: '04',
      title: t.nav.brendlar,
      desc: localize('18 xalqaro va mahalliy brend kolleksiyalarini koʻring.'),
    },
    {
      view: 'garderobim',
      num: '05',
      title: t.nav.garderobim,
      desc: localize('7 kunlik ob-havo rejasi, safar kapsulasi va shaxsiy buyumlar.'),
    },
    {
      view: 'ranglar',
      num: '06',
      title: t.nav.ranglar,
      desc: localize('OKLCH fazosida rang uygʻunligi kalkulyatori va 16 palitra.'),
    },
  ];

  const manifest = useKapsulaStore((s) => s.manifest);
  const query = useKapsulaStore((s) => s.query);
  const hasWebpAssets = useKapsulaStore((s) => s.hasWebpAssets);
  const location = useKapsulaStore((s) => s.location);
  const liveWeather = useKapsulaStore((s) => s.liveWeather);
  const loadItemsToBoard = useKapsulaStore((s) => s.loadItemsToBoard);
  const setActiveView = useKapsulaStore((s) => s.setActiveView);
  const selectUserGender = useKapsulaStore((s) => s.selectUserGender);
  const reducedMotion = useReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [heroFailed, setHeroFailed] = useState(false);
  const [heroMode, setHeroMode] = useState<'3d' | 'poster'>('3d');
  const [heroPalette, setHeroPalette] = useState<PaletteId>('sand');
  const [qrOpen, setQrOpen] = useState(false);

  const byId = useMemo(
    () => new Map(manifest.garments.map((g) => [g.id, g])),
    [manifest.garments],
  );

  const heroRecommendation = useMemo(() => {
    const res = recommendOutfits(manifest, {
      weather: query.weather,
      rain: query.rain,
      occasion: query.occasion,
      palette: heroPalette,
      gender: query.gender,
    });
    return res.outfits[0] ?? null;
  }, [manifest, query.weather, query.rain, query.occasion, query.gender, heroPalette]);

  const brandCount = useMemo(() => {
    const s = new Set<string>();
    for (const g of manifest.garments) {
      if (g.brand && !g.isUserUploaded && isGarmentGenderEligible(g, query.gender)) s.add(g.brand);
    }
    return s.size || 18;
  }, [manifest.garments, query.gender]);

  const activeGarmentCount = useMemo(
    () => manifest.garments.filter((g) => isGarmentGenderEligible(g, query.gender)).length,
    [manifest.garments, query.gender],
  );
  const activeLookCount = useMemo(
    () =>
      query.gender === 'all'
        ? manifest.looks.length
        : manifest.looks.filter((l) => l.model === query.gender).length,
    [manifest.looks, query.gender],
  );

  const heroSrc = resolveAssetUrl(manifest.hero.cover);
  useEffect(() => {
    setHeroFailed(false);
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setHeroFailed(true);
    }
  }, [heroSrc]);

  const { scrollYProgress } = useScroll({
    target: frameRef,
    offset: ['start start', 'end start'],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], reducedMotion ? [0, 0] : [0, 18]);

  const heroBudget = heroRecommendation
    ? estimateOutfitBudget(heroRecommendation.garments)
    : null;

  return (
    <section
      id="top"
      aria-labelledby="cover-heading"
      className="border-b border-[var(--hairline)] bg-[var(--paper)]"
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8 pt-6 pb-12 sm:py-12 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left editorial masthead & promise */}
          <div className="lg:col-span-6 flex flex-col items-start min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4 w-full justify-between">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="micro-label text-[var(--muted)]">{t.sections.cover}</span>
                <span className="h-3 w-px bg-[var(--hairline-strong)]" aria-hidden="true" />
                <span className="micro-label text-[var(--accent)]">{t.cover.kicker}</span>
              </div>
              <div
                role="group"
                aria-label={t.gender.label}
                className="inline-flex border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] p-0.5"
              >
                {(['m', 'w', 'all'] as const).map((gOpt) => (
                  <button
                    key={gOpt}
                    type="button"
                    onClick={() => selectUserGender(gOpt, true)}
                    className={`min-h-[28px] px-2.5 text-[10px] uppercase tracking-[0.09em] transition-colors cursor-pointer ${
                      query.gender === gOpt
                        ? 'bg-[var(--ink)] text-[var(--paper)] font-semibold'
                        : 'text-[var(--muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {gOpt === 'm' ? t.gender.m : gOpt === 'w' ? t.gender.w : t.gender.all}
                  </button>
                ))}
              </div>
            </div>

            <div
              aria-hidden="true"
              className="font-editorial italic text-[clamp(3.2rem,10vw,6.4rem)] leading-[0.88] tracking-[-0.025em] text-[var(--ink)] mb-4 select-none drop-shadow-[0_6px_12px_rgba(21,20,18,0.08)]"
            >
              {t.meta.brand}
            </div>

            <h1
              id="cover-heading"
              className="font-editorial text-[clamp(2rem,4.6vw,3.3rem)] leading-[1.04] tracking-[-0.015em] text-[var(--ink)] mb-4"
            >
              {t.cover.title}
            </h1>

            <p className="max-w-xl text-sm sm:text-base leading-relaxed text-[var(--ink-2)] mb-5">
              {t.cover.promise}
            </p>

            {/* Live Geo-Weather Auto Insight Strip */}
            {liveWeather && (
              <div className="panel-3d w-full max-w-xl mb-5 border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] px-4 py-3 flex items-start gap-3">
                <span
                  className="mt-1.5 h-2 w-2 rounded-full bg-[var(--accent)] shrink-0"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs font-medium text-[var(--ink)]">
                    <span>
                      {location.city}, {location.country}
                    </span>
                    <span className="text-[var(--muted)]">·</span>
                    <span className="font-tabular text-[var(--accent)]">
                      {liveWeather.temperatureC > 0
                        ? `+${liveWeather.temperatureC}`
                        : liveWeather.temperatureC}
                      °C
                    </span>
                    <span className="text-[var(--muted)]">· {localize(liveWeather.conditionUz)}</span>
                  </div>
                  <p className="text-xs text-[var(--ink-2)] mt-1 leading-snug">
                    {localize(liveWeather.adviceUz)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2.5 mb-6">
              <button
                type="button"
                onClick={() => setActiveView('stilist')}
                className="panel-3d min-h-[46px] inline-flex items-center justify-center bg-[var(--ink)] px-5 py-3 text-xs uppercase tracking-[0.14em] text-[var(--paper)] hover:bg-[var(--accent)] transition-colors cursor-pointer"
              >
                {t.cover.ctaPrimary}
              </button>
              <button
                type="button"
                onClick={() => setActiveView('atelye')}
                className="min-h-[46px] inline-flex items-center justify-center border border-[var(--accent)] bg-[var(--accent-soft)] px-5 py-3 text-xs uppercase tracking-[0.14em] text-[var(--accent)] font-semibold hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] transition-colors cursor-pointer"
              >
                {t.studio.mode3d}
              </button>
              <button
                type="button"
                onClick={() => setActiveView('skaner')}
                className="min-h-[46px] inline-flex items-center justify-center border border-[var(--ink)] px-5 py-3 text-xs uppercase tracking-[0.14em] text-[var(--ink)] hover:bg-[var(--paper-2)] transition-colors cursor-pointer"
              >
                {t.cover.ctaSecondary}
              </button>
            </div>

            {/* Direct Phone + QR Bar right on Hero */}
            <div className="w-full max-w-xl mb-5 flex flex-wrap items-center justify-between gap-2 border border-[var(--hairline)] bg-[var(--paper-elevated)] px-3.5 py-2.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[var(--accent)] font-semibold" aria-hidden="true">☎</span>
                <span className="text-[var(--muted)] uppercase tracking-[0.1em] text-[10px]">
                  {localize('Stilist aloqa')}:
                </span>
                <a
                  href={CONTACT_INFO.phoneHref}
                  className="font-tabular font-semibold text-[var(--ink)] hover:text-[var(--accent)] transition-colors"
                >
                  {CONTACT_INFO.phoneDisplay}
                </a>
              </div>
              <button
                type="button"
                onClick={() => setQrOpen(true)}
                className="min-h-[32px] border border-[var(--hairline-strong)] bg-[var(--paper)] px-3 text-[10px] uppercase tracking-[0.1em] text-[var(--ink)] hover:border-[var(--ink)] cursor-pointer"
              >
                {localize('QR Kod · Ulashish')}
              </button>
            </div>

            <div className="w-full border-t border-[var(--hairline)] pt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="micro-label text-[var(--muted)] font-tabular">
                {t.cover.counters(
                  activeGarmentCount,
                  activeLookCount,
                  manifest.palettes.length,
                  brandCount,
                )}
              </p>
              <p className="font-editorial italic text-sm text-[var(--ink-2)]">
                {t.cover.coverCaption}
              </p>
            </div>
          </div>

          {/* Right Live Interactive WebGL 3D Runway Showcase OR Editorial Poster */}
          <div ref={frameRef} className="lg:col-span-6 relative">
            <div className="panel-3d border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] p-3 sm:p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex border border-[var(--hairline-strong)] bg-[var(--paper)] p-0.5">
                  <button
                    type="button"
                    onClick={() => setHeroMode('3d')}
                    className={`min-h-[32px] px-3 text-[10px] uppercase tracking-[0.12em] cursor-pointer ${
                      heroMode === '3d'
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-semibold'
                        : 'text-[var(--ink-2)]'
                    }`}
                  >
                    WebGL 3D Podium
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroMode('poster')}
                    className={`min-h-[32px] px-3 text-[10px] uppercase tracking-[0.12em] cursor-pointer ${
                      heroMode === 'poster'
                        ? 'bg-[var(--ink)] text-[var(--paper)] font-semibold'
                        : 'text-[var(--ink-2)]'
                    }`}
                  >
                    {localize('Jurnal Muqova')}
                  </button>
                </div>

                {heroRecommendation && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-numeral text-xl text-[var(--accent)]">
                      {heroRecommendation.harmony.score}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
                      / 100 {t.colorLab.scoreUnit}
                    </span>
                  </div>
                )}
              </div>

              {heroMode === '3d' && heroRecommendation ? (
                <Studio3DStage
                  slots={heroRecommendation.slots}
                  byId={byId}
                  compact
                  onSelectSlot={() => {
                    loadItemsToBoard(heroRecommendation.garments.map((g) => g.id));
                    setActiveView('atelye');
                  }}
                  labels={{
                    spin: t.studio.spin360,
                    layers: t.studio.zLayers,
                    dragHint: t.studio.dragHint,
                  }}
                />
              ) : (
                <m.div
                  style={{ y: parallaxY }}
                  className="relative aspect-[3/4] max-h-[420px] mx-auto w-full max-w-[340px] overflow-hidden border border-[var(--ink)]/25 bg-[var(--paper-2)]"
                >
                  {hasWebpAssets && !heroFailed ? (
                    <img
                      ref={imgRef}
                      src={heroSrc}
                      alt={t.meta.brandFull}
                      width={manifest.hero.w}
                      height={manifest.hero.h}
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                      onError={() => setHeroFailed(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      role="img"
                      aria-label={t.meta.brandFull}
                      className="relative flex h-full w-full flex-col justify-between p-5 sm:p-6"
                      style={{
                        background:
                          'linear-gradient(160deg, #EFE7D6 0%, #E2D3BA 54%, #C4A27A 100%)',
                      }}
                    >
                      <div className="flex items-center justify-between border-b border-[#151412]/20 pb-2.5">
                        <span className="micro-label text-[#151412]">NASHR № 01</span>
                        <span className="font-editorial italic text-base text-[#8F1D2C]">
                          Kapsula
                        </span>
                      </div>
                      <div className="my-auto grid grid-cols-12 gap-2 items-center h-[68%]">
                        <div className="col-span-6 h-full flex items-center justify-center overflow-hidden">
                          <GarmentSilhouette
                            category="outerwear"
                            color="#B98E5E"
                            color2="#2F2A26"
                            garmentId="outerwear-palto-camel-1"
                            className="h-full w-auto max-h-full max-w-full garment-cutout"
                          />
                        </div>
                        <div className="col-span-6 flex flex-col gap-2 h-full justify-center">
                          <div className="h-[46%] flex items-center justify-center overflow-hidden">
                            <GarmentSilhouette
                              category="top"
                              color="#8F1D2C"
                              color2="#F4EFE6"
                              garmentId="top-hoodie-crimson-1"
                              className="h-full w-auto max-h-full max-w-full garment-cutout"
                            />
                          </div>
                          <div className="h-[42%] flex items-center justify-center overflow-hidden">
                            <GarmentSilhouette
                              category="shoes"
                              color="#151412"
                              color2="#C4A27A"
                              garmentId="shoes-chelsea_boots-noir-1"
                              className="h-full w-auto max-h-full max-w-full garment-cutout"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-[#151412]/20 pt-3 flex items-end justify-between">
                        <p className="font-editorial italic text-xl text-[#151412] leading-none">
                          {localize('Qum & Qirmizi')}
                        </p>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-[#3B3731]">
                          {location.city}
                        </p>
                      </div>
                    </div>
                  )}
                </m.div>
              )}

              {/* Quick Live 3D Repaint Palettes + Budget + CTA */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--hairline)]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {manifest.palettes.slice(0, 6).map((pal) => {
                    const active = heroPalette === pal.id;
                    return (
                      <button
                        key={pal.id}
                        type="button"
                        onClick={() => {
                          setHeroPalette(pal.id);
                          setHeroMode('3d');
                        }}
                        className={`min-h-[30px] px-2 py-1 text-[10px] border inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                          active
                            ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] font-semibold'
                            : 'border-[var(--hairline)] bg-[var(--paper)] text-[var(--ink-2)] hover:border-[var(--ink)]'
                        }`}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-black/20"
                          style={{ backgroundColor: pal.colors[2] ?? pal.colors[0] }}
                        />
                        <span>{localize(pal.name_uz)}</span>
                      </button>
                    );
                  })}
                </div>

                {heroRecommendation && (
                  <button
                    type="button"
                    onClick={() => {
                      loadItemsToBoard(heroRecommendation.garments.map((g) => g.id));
                      setActiveView('atelye');
                    }}
                    className="min-h-[32px] px-3 py-1 bg-[var(--ink)] text-[10px] uppercase tracking-[0.12em] text-[var(--paper)] hover:bg-[var(--accent)] cursor-pointer"
                  >
                    {t.stylist.openInAtelier} →
                  </button>
                )}
              </div>

              {heroBudget && (
                <div className="flex items-center justify-between text-[11px] text-[var(--muted)] pt-1">
                  <span>{localize('Taxminiy byudjet')}</span>
                  <span className="font-semibold font-tabular text-[var(--ink)]">
                    {localize(heroBudget.labelUz)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dedicated Quick-Jump Hub into Separate Pages with 3D Kinetic Cards */}
        <div className="mt-10 pt-8 border-t border-[var(--hairline)]">
          <p className="micro-label text-[var(--muted)] mb-4">{t.cover.hubTitle}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickHub.map((item) => (
              <Card3D key={item.view} intensity={7}>
                <button
                  type="button"
                  onClick={() => setActiveView(item.view)}
                  className="group w-full h-full border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] p-5 text-left hover:border-[var(--ink)] transition-colors cursor-pointer flex items-start justify-between gap-3"
                >
                  <div>
                    <span className="micro-label text-[var(--accent)]">{item.num}</span>
                    <h2 className="mt-1 font-editorial text-2xl text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--ink-2)] leading-relaxed">{item.desc}</p>
                  </div>
                  <span className="text-lg text-[var(--muted)] group-hover:text-[var(--ink)] transition-colors">
                    →
                  </span>
                </button>
              </Card3D>
            ))}
          </div>
        </div>

        {/* Rich 3D Ecosystem Capabilities Strip */}
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            {
              val: `${manifest.garments.length}+`,
              title: localize('Brend kiyim & 100 ta 3D siluet'),
              sub: localize('18 xalqaro va mahalliy brendlar'),
            },
            {
              val: '360°',
              title: localize('WebGL 3D Podium & Z-Qatlam'),
              sub: localize('PBR mato yoritilishi va burilish'),
            },
            {
              val: '16 · 10 · 5',
              title: localize('Palitra · Dizayn · Tillar'),
              sub: localize('Toʻliq sozlanadigan studiya muhiti'),
            },
            {
              val: 'QR',
              title: CONTACT_INFO.phoneDisplay,
              sub: localize('Skanerlash, ulashish va tezkor qoʻngʻiroq'),
            },
          ].map((stat) => (
            <Card3D key={stat.val} intensity={5}>
              <div className="h-full border border-[var(--hairline)] bg-[var(--paper-elevated)] p-4 flex flex-col justify-between">
                <span className="font-numeral text-3xl text-[var(--accent)] leading-none">
                  {stat.val}
                </span>
                <div className="mt-3">
                  <p className="text-xs font-semibold text-[var(--ink)]">{stat.title}</p>
                  <p className="text-[11px] text-[var(--muted)] mt-0.5">{stat.sub}</p>
                </div>
              </div>
            </Card3D>
          ))}
        </div>
      </div>

      <QrContactModal
        open={qrOpen}
        initialMode="outfit"
        customUrl={
          heroRecommendation
            ? `${CONTACT_INFO.siteUrl}/?items=${encodeURIComponent(
                heroRecommendation.garments.map((g) => g.id).join(','),
              )}#atelye`
            : CONTACT_INFO.siteUrl
        }
        onClose={() => setQrOpen(false)}
      />
    </section>
  );
}
