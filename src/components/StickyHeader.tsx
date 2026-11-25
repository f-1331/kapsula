import { useState } from 'react';
import { UZ } from '../i18n/uz';
import { useKapsulaStore, type ViewTab } from '../store/useKapsulaStore';

const DESKTOP_TABS: Array<{ id: ViewTab; label: string }> = [
  { id: 'stilist', label: UZ.nav.stilist },
  { id: 'atelye', label: UZ.nav.atelye },
  { id: 'skaner', label: UZ.nav.skaner },
  { id: 'brendlar', label: UZ.nav.brendlar },
  { id: 'lookbook', label: UZ.nav.lookbook },
  { id: 'garderobim', label: UZ.nav.garderobim },
  { id: 'ranglar', label: UZ.nav.ranglar },
];

const MOBILE_PRIMARY_TABS: Array<{ id: ViewTab; label: string; shortCode: string }> = [
  { id: 'cover', label: 'Bosh', shortCode: '01' },
  { id: 'stilist', label: UZ.nav.stilist, shortCode: '02' },
  { id: 'atelye', label: UZ.nav.atelye, shortCode: '03' },
  { id: 'skaner', label: 'Tahlil', shortCode: '04' },
];

const MOBILE_MORE_TABS: Array<{ id: ViewTab; label: string; desc: string }> = [
  { id: 'brendlar', label: UZ.nav.brendlar, desc: '16 ta brend kolleksiyasi' },
  { id: 'lookbook', label: UZ.nav.lookbook, desc: 'Tahririy obrazlar' },
  { id: 'garderobim', label: UZ.nav.garderobim, desc: '7 kunlik reja va safar' },
  { id: 'ranglar', label: UZ.nav.ranglar, desc: 'OKLCH rang kalkulyatori' },
];

export function StickyHeader() {
  const activeView = useKapsulaStore((s) => s.activeView);
  const setActiveView = useKapsulaStore((s) => s.setActiveView);
  const isSampleData = useKapsulaStore((s) => s.isSampleData);
  const theme = useKapsulaStore((s) => s.theme);
  const toggleTheme = useKapsulaStore((s) => s.toggleTheme);
  const location = useKapsulaStore((s) => s.location);
  const liveWeather = useKapsulaStore((s) => s.liveWeather);
  const temperatureC = useKapsulaStore((s) => s.temperatureC);
  const [moreOpen, setMoreOpen] = useState(false);

  const displayTemp = liveWeather ? liveWeather.temperatureC : temperatureC;
  const isMoreActive = MOBILE_MORE_TABS.some((t) => t.id === activeView);

  const handleSelectView = (view: ViewTab) => {
    setMoreOpen(false);
    setActiveView(view);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--hairline)] bg-[var(--paper)]/95 backdrop-blur-md">
        <button
          type="button"
          onClick={() => handleSelectView('stilist')}
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-[var(--ink)] focus:px-4 focus:py-2 focus:text-xs focus:text-[var(--paper)]"
        >
          {UZ.meta.skipToContent}
        </button>

        <div className="mx-auto max-w-[1360px] px-3 sm:px-8">
          <div className="flex items-center justify-between gap-2 h-14">
            {/* Brand & Live City Weather Chip */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => handleSelectView('cover')}
                className="font-editorial italic text-2xl sm:text-[1.75rem] tracking-[-0.01em] text-[var(--ink)] hover:text-[var(--accent)] transition-colors py-1 shrink-0 cursor-pointer"
              >
                {UZ.meta.brand}
              </button>

              <button
                type="button"
                onClick={() => handleSelectView('stilist')}
                className="inline-flex items-center gap-1.5 border border-[var(--hairline)] bg-[var(--paper-elevated)] px-2.5 py-1 text-[11px] text-[var(--ink-2)] hover:border-[var(--ink)] transition-colors truncate max-w-[155px] sm:max-w-[200px] cursor-pointer"
                title={`${location.city}, ${location.country}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                    liveWeather?.rain ? 'bg-[var(--accent)]' : 'bg-[var(--positive)]'
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{location.city}</span>
                <span className="font-tabular font-medium text-[var(--ink)] shrink-0">
                  {displayTemp > 0 ? `+${displayTemp}` : displayTemp}°
                </span>
              </button>
            </div>

            {/* Desktop Single-Page Navigation (no overlapping tabs) */}
            <nav aria-label={UZ.nav.ariaLabel} className="hidden lg:flex items-center gap-4">
              {DESKTOP_TABS.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectView(item.id)}
                    className={`min-h-[44px] inline-flex items-center px-1.5 text-[11px] uppercase tracking-[0.13em] whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                      isActive
                        ? 'border-[var(--accent)] text-[var(--ink)] font-semibold'
                        : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? UZ.nav.themeLight : UZ.nav.themeDark}
                className="min-h-[40px] min-w-[40px] inline-flex items-center gap-1.5 border border-[var(--hairline)] bg-[var(--paper-elevated)] px-2.5 text-[11px] uppercase tracking-[0.1em] text-[var(--ink)] hover:border-[var(--ink)] transition-colors cursor-pointer shrink-0"
              >
                {theme === 'dark' ? (
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 stroke-current shrink-0" fill="none" strokeWidth="1.6">
                    <circle cx="10" cy="10" r="3.5" />
                    <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 stroke-current shrink-0" fill="none" strokeWidth="1.6">
                    <path d="M16.5 11.8A6.8 6.8 0 0 1 8.2 3.5a7 7 0 1 0 8.3 8.3Z" strokeLinejoin="round" />
                  </svg>
                )}
                <span className="hidden sm:inline">
                  {theme === 'dark' ? UZ.nav.themeLight : UZ.nav.themeDark}
                </span>
              </button>
            </div>
          </div>

          {/* Tablet horizontal strip (md only, between 768px and 1024px) */}
          <nav
            aria-label={UZ.nav.ariaLabel}
            className="hidden md:flex lg:hidden items-center gap-4 overflow-x-auto pb-1.5 pt-0.5 border-t border-[var(--hairline)] no-scrollbar"
          >
            {DESKTOP_TABS.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectView(item.id)}
                  className={`py-2 text-[11px] uppercase tracking-[0.12em] whitespace-nowrap border-b-2 transition-colors shrink-0 cursor-pointer ${
                    isActive
                      ? 'border-[var(--accent)] text-[var(--ink)] font-semibold'
                      : 'border-transparent text-[var(--muted)]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {import.meta.env.DEV && isSampleData && (
          <div className="border-t border-[var(--hairline)] bg-[var(--paper-2)] px-4 py-1.5 text-center text-[11px] tracking-[0.06em] text-[var(--muted)]">
            {UZ.meta.sampleBanner}
          </div>
        )}
      </header>

      {/* Mobile More Drawer (opens above fixed bottom bar) */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-[var(--ink)]/45 backdrop-blur-xs"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute bottom-16 inset-x-3 border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--hairline)]">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                Barcha boʻlimlar
              </p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="px-2 py-1 text-xs text-[var(--ink)] border border-[var(--hairline)] cursor-pointer"
              >
                {UZ.atelier.closePicker}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-3">
              {MOBILE_MORE_TABS.map((tab) => {
                const isActive = activeView === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleSelectView(tab.id)}
                    className={`p-3 border text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--hairline)] bg-[var(--paper)] hover:border-[var(--ink)]'
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--ink)]">
                      {tab.label}
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-[var(--muted)]">
                      {tab.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Fixed Thumb-Friendly Bottom Navigation Bar (< 768px) */}
      <nav
        aria-label={UZ.nav.ariaLabel}
        className="fixed bottom-0 inset-x-0 z-40 border-t border-[var(--hairline)] bg-[var(--paper)]/96 backdrop-blur-md md:hidden pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-14">
          {MOBILE_PRIMARY_TABS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectView(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 px-1 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[var(--accent)] font-semibold bg-[var(--accent-soft)]/50'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                <span className="text-[9px] font-tabular tracking-[0.12em] opacity-75">
                  {item.shortCode}
                </span>
                <span className="text-[11px] leading-none truncate max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            className={`flex flex-col items-center justify-center gap-0.5 px-1 transition-colors cursor-pointer ${
              moreOpen || isMoreActive
                ? 'text-[var(--accent)] font-semibold bg-[var(--accent-soft)]/50'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <span className="text-[9px] font-tabular tracking-[0.12em] opacity-75">•••</span>
            <span className="text-[11px] leading-none">Yana</span>
          </button>
        </div>
      </nav>
    </>
  );
}
