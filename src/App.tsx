import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { Suspense, lazy, useEffect, useMemo } from 'react';
import { LookbookModal } from './components/LookbookModal';
import { StickyHeader } from './components/StickyHeader';
import { loadManifest } from './data/manifest-loader';
import { AtelierSection } from './sections/AtelierSection';
import { ColorLabSection } from './sections/ColorLabSection';
import { CoverSection } from './sections/CoverSection';
import { FooterSection } from './sections/FooterSection';
import { LookbookSection } from './sections/LookbookSection';
import { StylistSection } from './sections/StylistSection';
import { parseViewFromLocation, useKapsulaStore } from './store/useKapsulaStore';
import { getTelegramWebApp, syncMiniAppHeartbeat } from './utils/tg-miniapp';
import { detectUserLocation, fetchLiveWeatherAnalysis } from './utils/weather-api';

const PhotoAnalyzerSection = lazy(() =>
  import('./sections/PhotoAnalyzerSection').then((mod) => ({ default: mod.PhotoAnalyzerSection })),
);
const BrandsSection = lazy(() =>
  import('./sections/BrandsSection').then((mod) => ({ default: mod.BrandsSection })),
);
const MyWardrobeSection = lazy(() =>
  import('./sections/MyWardrobeSection').then((mod) => ({ default: mod.MyWardrobeSection })),
);

function SectionLoaderFallback() {
  return (
    <div className="min-h-[60dvh] flex items-center justify-center p-10 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
      Yuklanmoqda...
    </div>
  );
}

export default function App() {
  const manifest = useKapsulaStore((s) => s.manifest);
  const activeView = useKapsulaStore((s) => s.activeView);
  const location = useKapsulaStore((s) => s.location);
  const gender = useKapsulaStore((s) => s.query.gender);
  const activeLookId = useKapsulaStore((s) => s.activeLookId);
  const setActiveView = useKapsulaStore((s) => s.setActiveView);
  const setManifestData = useKapsulaStore((s) => s.setManifestData);
  const setActiveLookId = useKapsulaStore((s) => s.setActiveLookId);
  const setWeatherLoading = useKapsulaStore((s) => s.setWeatherLoading);
  const setLiveWeather = useKapsulaStore((s) => s.setLiveWeather);
  const reducedMotion = useReducedMotion();

  // Initialize Telegram Mini App integration & keep hash routing synced
  useEffect(() => {
    const tg = getTelegramWebApp();
    if (tg) {
      tg.ready?.();
      tg.expand?.();
    }

    const onHashChange = () => {
      setActiveView(parseViewFromLocation(), false);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [setActiveView]);

  // Send lightweight Telegram Mini App live presence heartbeat when inside Telegram
  useEffect(() => {
    void syncMiniAppHeartbeat({ view: activeView, city: location.city, gender });
  }, [activeView, location.city, gender]);

  // Load 3,894+ branded catalog manifest.json
  useEffect(() => {
    const controller = new AbortController();
    void loadManifest(controller.signal).then(
      ({ manifest: loaded, isSampleData, hasWebpAssets }) => {
        if (!controller.signal.aborted) {
          setManifestData(loaded, isSampleData, hasWebpAssets);
        }
      },
    );
    return () => controller.abort();
  }, [setManifestData]);

  // Automatic Country/City Detection & Live Weather Analysis (+ periodic 15-min refresh)
  useEffect(() => {
    let cancelled = false;
    const syncWeather = async () => {
      setWeatherLoading(true);
      const loc = await detectUserLocation();
      if (cancelled) return;
      const analysis = await fetchLiveWeatherAnalysis(loc);
      if (cancelled) return;
      if (analysis) {
        setLiveWeather(analysis, useKapsulaStore.getState().autoWeatherEnabled);
      } else {
        setWeatherLoading(false);
      }
    };

    void syncWeather();
    const intervalId = window.setInterval(() => {
      if (useKapsulaStore.getState().autoWeatherEnabled) {
        void syncWeather();
      }
    }, 15 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [setLiveWeather, setWeatherLoading]);

  const activeLook = useMemo(
    () => manifest.looks.find((l) => l.id === activeLookId) ?? null,
    [manifest.looks, activeLookId],
  );

  const renderActiveSection = () => {
    switch (activeView) {
      case 'cover':
        return (
          <>
            <CoverSection />
            <FooterSection />
          </>
        );
      case 'stilist':
        return <StylistSection />;
      case 'atelye':
        return <AtelierSection />;
      case 'skaner':
        return (
          <Suspense fallback={<SectionLoaderFallback />}>
            <PhotoAnalyzerSection />
          </Suspense>
        );
      case 'brendlar':
        return (
          <Suspense fallback={<SectionLoaderFallback />}>
            <BrandsSection />
          </Suspense>
        );
      case 'lookbook':
        return <LookbookSection />;
      case 'garderobim':
        return (
          <Suspense fallback={<SectionLoaderFallback />}>
            <MyWardrobeSection />
          </Suspense>
        );
      case 'ranglar':
        return <ColorLabSection />;
      default:
        return (
          <>
            <CoverSection />
            <FooterSection />
          </>
        );
    }
  };

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <div className="min-h-dvh bg-[var(--paper)] text-[var(--ink)] pb-16 md:pb-0">
          <StickyHeader />
          <main>
            <AnimatePresence mode="wait">
              <m.div
                key={activeView}
                initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              >
                {renderActiveSection()}
              </m.div>
            </AnimatePresence>
          </main>
          <LookbookModal
            look={activeLook}
            allLooks={manifest.looks}
            onClose={() => setActiveLookId(null)}
            onNavigateLook={(lookId) => setActiveLookId(lookId)}
          />
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
