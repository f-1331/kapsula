import { useReducedMotion, useScroll, useTransform } from 'motion/react';
import * as m from 'motion/react-m';
import { useEffect, useMemo, useRef, useState } from 'react';
import { resolveAssetUrl } from '../data/manifest-loader';
import { UZ } from '../i18n/uz';
import { useKapsulaStore, type ViewTab } from '../store/useKapsulaStore';
import { GarmentSilhouette } from '../components/GarmentSilhouette';

const QUICK_HUB: Array<{ view: ViewTab; num: string; title: string; desc: string }> = [
  {
    view: 'stilist',
    num: '01',
    title: UZ.nav.stilist,
    desc: 'Ob-havo, ofis, maktab, universitet va sport uchun tayyor obrazlar.',
  },
  {
    view: 'atelye',
    num: '02',
    title: UZ.nav.atelye,
    desc: 'Sudrab almashtirish, brend filtri va aqlli qoʻshimcha maslahat.',
  },
  {
    view: 'skaner',
    num: '03',
    title: UZ.nav.skaner,
    desc: 'Rasm yoki kamerada kiyimni tahlil qilib, mos juftlik toping.',
  },
  {
    view: 'brendlar',
    num: '04',
    title: UZ.nav.brendlar,
    desc: '16 xalqaro va mahalliy brend kolleksiyalarini koʻring.',
  },
  {
    view: 'garderobim',
    num: '05',
    title: UZ.nav.garderobim,
    desc: '7 kunlik ob-havo rejasi, safar kapsulasi va shaxsiy buyumlar.',
  },
  {
    view: 'ranglar',
    num: '06',
    title: UZ.nav.ranglar,
    desc: 'OKLCH fazosida rang uygʻunligi kalkulyatori.',
  },
];

export function CoverSection() {
  const manifest = useKapsulaStore((s) => s.manifest);
  const hasWebpAssets = useKapsulaStore((s) => s.hasWebpAssets);
  const location = useKapsulaStore((s) => s.location);
  const liveWeather = useKapsulaStore((s) => s.liveWeather);
  const setActiveView = useKapsulaStore((s) => s.setActiveView);
  const reducedMotion = useReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [heroFailed, setHeroFailed] = useState(false);

  const brandCount = useMemo(() => {
    const s = new Set<string>();
    for (const g of manifest.garments) {
      if (g.brand && !g.isUserUploaded) s.add(g.brand);
    }
    return s.size || 16;
  }, [manifest.garments]);

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
  const parallaxY = useTransform(scrollYProgress, [0, 1], reducedMotion ? [0, 0] : [0, 24]);

  return (
    <section
      id="top"
      aria-labelledby="cover-heading"
      className="border-b border-[var(--hairline)] bg-[var(--paper)]"
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8 pt-6 pb-10 sm:py-12 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left editorial masthead & promise */}
          <div className="lg:col-span-7 flex flex-col items-start min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
              <span className="micro-label text-[var(--muted)]">{UZ.sections.cover}</span>
              <span className="h-3 w-px bg-[var(--hairline-strong)]" aria-hidden="true" />
              <span className="micro-label text-[var(--accent)]">{UZ.cover.kicker}</span>
            </div>

            <div
              aria-hidden="true"
              className="font-editorial italic text-[clamp(3.2rem,11vw,7rem)] leading-[0.88] tracking-[-0.025em] text-[var(--ink)] mb-4 select-none"
            >
              {UZ.meta.brand}
            </div>

            <h1
              id="cover-heading"
              className="font-editorial text-[clamp(2rem,5vw,3.5rem)] leading-[1.04] tracking-[-0.015em] text-[var(--ink)] mb-4"
            >
              {UZ.cover.title}
            </h1>

            <p className="max-w-xl text-sm sm:text-base leading-relaxed text-[var(--ink-2)] mb-5">
              {UZ.cover.promise}
            </p>

            {/* Live Geo-Weather Auto Insight Strip */}
            {liveWeather && (
              <div className="w-full max-w-xl mb-6 border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] px-4 py-3 flex items-start gap-3">
                <span
                  className="mt-1.5 h-2 w-2 rounded-full bg-[var(--accent)] shrink-0"
                  aria-hidden="true"
                />
                <div className="min-w-0">
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
                    <span className="text-[var(--muted)]">· {liveWeather.conditionUz}</span>
                  </div>
                  <p className="text-xs text-[var(--ink-2)] mt-1 leading-snug">
                    {liveWeather.adviceUz}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-7">
              <button
                type="button"
                onClick={() => setActiveView('stilist')}
                className="min-h-[46px] inline-flex items-center justify-center bg-[var(--ink)] px-6 py-3 text-xs uppercase tracking-[0.14em] text-[var(--paper)] hover:bg-[var(--accent)] transition-colors cursor-pointer"
              >
                {UZ.cover.ctaPrimary}
              </button>
              <button
                type="button"
                onClick={() => setActiveView('skaner')}
                className="min-h-[46px] inline-flex items-center justify-center border border-[var(--ink)] px-6 py-3 text-xs uppercase tracking-[0.14em] text-[var(--ink)] hover:bg-[var(--paper-2)] transition-colors cursor-pointer"
              >
                {UZ.cover.ctaSecondary}
              </button>
            </div>

            <div className="w-full border-t border-[var(--hairline)] pt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="micro-label text-[var(--muted)] font-tabular">
                {UZ.cover.counters(
                  manifest.garments.length,
                  manifest.looks.length,
                  manifest.palettes.length,
                  brandCount,
                )}
              </p>
              <p className="font-editorial italic text-sm text-[var(--ink-2)]">
                {UZ.cover.coverCaption}
              </p>
            </div>
          </div>

          {/* Right tall 2:3 editorial cover frame */}
          <div ref={frameRef} className="lg:col-span-5 relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[340px] sm:max-w-[400px] pr-2.5 pb-2.5">
              <div
                aria-hidden="true"
                className="absolute inset-0 translate-x-2.5 translate-y-2.5 border border-[var(--hairline-strong)] pointer-events-none"
              />

              <m.div
                style={{ y: parallaxY }}
                className="relative aspect-[2/3] w-full overflow-hidden border border-[var(--ink)]/25 bg-[var(--paper-2)]"
              >
                {hasWebpAssets && !heroFailed ? (
                  <img
                    ref={imgRef}
                    src={heroSrc}
                    alt={UZ.meta.brandFull}
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
                    aria-label={UZ.meta.brandFull}
                    className="relative flex h-full w-full flex-col justify-between p-5 sm:p-7"
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
                      <div>
                        <p className="font-editorial italic text-2xl text-[#151412] leading-none">
                          Qum &amp; Qirmizi
                        </p>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-[#3B3731] mt-1">
                          {location.city} · {manifest.garments.length}+ buyum
                        </p>
                      </div>
                      <span className="h-3 w-3 rounded-full bg-[#8F1D2C]" />
                    </div>
                  </div>
                )}
              </m.div>
            </div>
          </div>
        </div>

        {/* Dedicated Quick-Jump Hub into Separate Pages */}
        <div className="mt-10 pt-8 border-t border-[var(--hairline)]">
          <p className="micro-label text-[var(--muted)] mb-4">{UZ.cover.hubTitle}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {QUICK_HUB.map((item) => (
              <button
                key={item.view}
                type="button"
                onClick={() => setActiveView(item.view)}
                className="group border border-[var(--hairline)] bg-[var(--paper-elevated)] p-4 text-left hover:border-[var(--ink)] transition-colors cursor-pointer flex items-start justify-between gap-3"
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
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
