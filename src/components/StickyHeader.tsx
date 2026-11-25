import { useEffect, useState } from 'react';
import { UZ } from '../i18n/uz';
import { useKapsulaStore } from '../store/useKapsulaStore';

const NAV_ITEMS = [
  { id: 'stilist', label: UZ.nav.stilist },
  { id: 'atelye', label: UZ.nav.atelye },
  { id: 'lookbook', label: UZ.nav.lookbook },
  { id: 'ranglar', label: UZ.nav.ranglar },
] as const;

export function StickyHeader() {
  const isSampleData = useKapsulaStore((s) => s.isSampleData);
  const theme = useKapsulaStore((s) => s.theme);
  const toggleTheme = useKapsulaStore((s) => s.toggleTheme);
  const location = useKapsulaStore((s) => s.location);
  const liveWeather = useKapsulaStore((s) => s.liveWeather);
  const temperatureC = useKapsulaStore((s) => s.temperatureC);
  const [activeId, setActiveId] = useState<string>('stilist');

  useEffect(() => {
    const sections = NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (sections.length === 0 || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: 0.01 },
    );

    for (const sec of sections) observer.observe(sec);
    return () => observer.disconnect();
  }, []);

  const displayTemp = liveWeather ? liveWeather.temperatureC : temperatureC;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--hairline)] bg-[var(--paper)]/95 backdrop-blur-sm">
      <a
        href="#stilist"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-[var(--ink)] focus:px-4 focus:py-2 focus:text-xs focus:text-[var(--paper)]"
      >
        {UZ.meta.skipToContent}
      </a>

      <div className="mx-auto max-w-[1360px] px-3 sm:px-8">
        {/* Top Row: Brand + Live Location/Weather Chip + Theme Toggle + Desktop Nav */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 h-14">
          <div className="flex items-center gap-3 min-w-0">
            <a
              href="#top"
              className="font-editorial italic text-2xl sm:text-[1.75rem] tracking-[-0.01em] text-[var(--ink)] hover:text-[var(--accent)] transition-colors py-1 shrink-0"
            >
              {UZ.meta.brand}
            </a>

            <a
              href="#stilist"
              className="inline-flex items-center gap-1.5 border border-[var(--hairline)] bg-[var(--paper-elevated)] px-2.5 py-1 text-[11px] text-[var(--ink-2)] hover:border-[var(--ink)] transition-colors truncate max-w-[165px] sm:max-w-[240px]"
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
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-5">
            {/* Desktop Navigation */}
            <nav aria-label={UZ.nav.ariaLabel} className="hidden md:flex items-center gap-5">
              {NAV_ITEMS.map((item) => {
                const isActive = activeId === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={() => setActiveId(item.id)}
                    className={`min-h-[44px] inline-flex items-center px-1.5 text-xs uppercase tracking-[0.14em] whitespace-nowrap border-b transition-colors ${
                      isActive
                        ? 'border-[var(--accent)] text-[var(--ink)] font-semibold'
                        : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {item.label}
                  </a>
                );
              })}
            </nav>

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? UZ.nav.themeLight : UZ.nav.themeDark}
              title={theme === 'dark' ? UZ.nav.themeLight : UZ.nav.themeDark}
              className="min-h-[40px] min-w-[40px] sm:min-h-[42px] sm:px-3 inline-flex items-center justify-center gap-1.5 border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] text-[var(--ink)] hover:border-[var(--ink)] transition-colors cursor-pointer shrink-0"
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <circle cx="12" cy="12" r="4.5" />
                  <path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M20.2 14.4A8.2 8.2 0 0 1 9.6 3.8a8.4 8.4 0 1 0 10.6 10.6Z" />
                </svg>
              )}
              <span className="hidden lg:inline text-[11px] uppercase tracking-[0.12em]">
                {theme === 'dark' ? 'Kun' : 'Tun'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Clean 4-column Navigation Strip (zero crowding/clipping on 390px) */}
        <nav
          aria-label={UZ.nav.ariaLabel}
          className="grid grid-cols-4 md:hidden border-t border-[var(--hairline)]"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeId === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setActiveId(item.id)}
                className={`min-h-[42px] flex items-center justify-center text-[11px] uppercase tracking-[0.1em] border-b-2 transition-colors ${
                  isActive
                    ? 'border-[var(--accent)] text-[var(--ink)] font-semibold'
                    : 'border-transparent text-[var(--muted)]'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>

      {import.meta.env.DEV && isSampleData && (
        <div
          role="status"
          className="border-t border-[var(--hairline)] bg-[var(--paper-2)] px-4 py-1 text-center text-[11px] tracking-[0.06em] text-[var(--ink-2)]"
        >
          {UZ.meta.sampleBanner}
        </div>
      )}
    </header>
  );
}
