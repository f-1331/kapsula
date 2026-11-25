import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import { useEffect, useMemo } from 'react';
import { LookbookModal } from './components/LookbookModal';
import { StickyHeader } from './components/StickyHeader';
import { loadManifest } from './data/manifest-loader';
import { AtelierSection } from './sections/AtelierSection';
import { ColorLabSection } from './sections/ColorLabSection';
import { CoverSection } from './sections/CoverSection';
import { FooterSection } from './sections/FooterSection';
import { LookbookSection } from './sections/LookbookSection';
import { StylistSection } from './sections/StylistSection';
import { useKapsulaStore } from './store/useKapsulaStore';
import { detectUserLocation, fetchLiveWeatherAnalysis } from './utils/weather-api';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready?: () => void;
        expand?: () => void;
        colorScheme?: 'light' | 'dark';
      };
    };
  }
}

export default function App() {
  const manifest = useKapsulaStore((s) => s.manifest);
  const activeLookId = useKapsulaStore((s) => s.activeLookId);
  const setManifestData = useKapsulaStore((s) => s.setManifestData);
  const setActiveLookId = useKapsulaStore((s) => s.setActiveLookId);
  const setWeatherLoading = useKapsulaStore((s) => s.setWeatherLoading);
  const setLiveWeather = useKapsulaStore((s) => s.setLiveWeather);

  // Initialize Telegram Mini App integration if running inside Telegram
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready?.();
      tg.expand?.();
    }
  }, []);

  // Load 2,134+ catalog manifest.json
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

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <div className="min-h-dvh bg-[var(--paper)] text-[var(--ink)]">
          <StickyHeader />
          <main>
            <CoverSection />
            <StylistSection />
            <AtelierSection />
            <LookbookSection />
            <ColorLabSection />
          </main>
          <FooterSection />
          <LookbookModal
            look={activeLook}
            allLooks={manifest.looks}
            onClose={() => setActiveLookId(null)}
            onNavigateLook={(id) => setActiveLookId(id)}
          />
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
