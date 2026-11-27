import { useState } from 'react';
import { CONTACT_INFO } from '../config/contact';
import { LANGUAGE_OPTIONS } from '../i18n/languages';
import { useTranslation } from '../i18n/useTranslation';
import { useKapsulaStore, type ViewTab } from '../store/useKapsulaStore';
import { DESIGN_THEMES, getDesignThemeById } from '../styles/themes';
import { QrContactModal } from './QrContactModal';

export function StickyHeader() {
  const { t, lang, setLanguage } = useTranslation();
  const activeView = useKapsulaStore((s) => s.activeView);
  const setActiveView = useKapsulaStore((s) => s.setActiveView);
  const isSampleData = useKapsulaStore((s) => s.isSampleData);
  const theme = useKapsulaStore((s) => s.theme);
  const designTheme = useKapsulaStore((s) => s.designTheme);
  const setDesignTheme = useKapsulaStore((s) => s.setDesignTheme);
  const toggleTheme = useKapsulaStore((s) => s.toggleTheme);
  const location = useKapsulaStore((s) => s.location);
  const liveWeather = useKapsulaStore((s) => s.liveWeather);
  const temperatureC = useKapsulaStore((s) => s.temperatureC);
  const gender = useKapsulaStore((s) => s.query.gender);
  const openGenderGate = useKapsulaStore((s) => s.openGenderGate);
  const selectUserGender = useKapsulaStore((s) => s.selectUserGender);

  const [moreOpen, setMoreOpen] = useState(false);
  const [designOpen, setDesignOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const desktopTabs: Array<{ id: ViewTab; label: string }> = [
    { id: 'stilist', label: t.nav.stilist },
    { id: 'atelye', label: t.nav.atelye },
    { id: 'skaner', label: t.nav.skaner },
    { id: 'brendlar', label: t.nav.brendlar },
    { id: 'lookbook', label: t.nav.lookbook },
    { id: 'garderobim', label: t.nav.garderobim },
    { id: 'ranglar', label: t.nav.ranglar },
  ];

  const mobilePrimaryTabs: Array<{ id: ViewTab; label: string; shortCode: string }> = [
    { id: 'cover', label: t.nav.cover.split(' ')[0] || t.nav.cover, shortCode: '01' },
    { id: 'stilist', label: t.nav.stilist, shortCode: '02' },
    { id: 'atelye', label: t.nav.atelye.split(' ')[0] || t.nav.atelye, shortCode: '03' },
    { id: 'skaner', label: t.nav.skaner.split(' ')[0] || t.nav.skaner, shortCode: '04' },
  ];

  const mobileMoreTabs: Array<{ id: ViewTab; label: string; desc: string }> = [
    { id: 'brendlar', label: t.nav.brendlar, desc: '18 ta brend kolleksiyasi' },
    { id: 'lookbook', label: t.nav.lookbook, desc: 'Tahririy va 3D obrazlar' },
    { id: 'garderobim', label: t.nav.garderobim, desc: '7 kunlik reja va safar' },
    { id: 'ranglar', label: t.nav.ranglar, desc: 'OKLCH rang kalkulyatori' },
  ];

  const displayTemp = liveWeather ? liveWeather.temperatureC : temperatureC;
  const isMoreActive = mobileMoreTabs.some((tab) => tab.id === activeView);
  const currentDesign = getDesignThemeById(designTheme);
  const currentLang = LANGUAGE_OPTIONS.find((l) => l.id === lang) ?? LANGUAGE_OPTIONS[0]!;

  const handleSelectView = (view: ViewTab) => {
    setMoreOpen(false);
    setDesignOpen(false);
    setLangOpen(false);
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
          {t.meta.skipToContent}
        </button>

        <div className="mx-auto max-w-[1360px] px-3 sm:px-6">
          <div className="flex items-center justify-between gap-2 h-14">
            {/* Left: Brand & Live Weather */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => handleSelectView('cover')}
                className="font-editorial italic text-2xl sm:text-[1.7rem] tracking-[-0.01em] text-[var(--ink)] hover:text-[var(--accent)] transition-colors py-1 shrink-0 cursor-pointer"
              >
                {t.meta.brand}
              </button>

              <button
                type="button"
                onClick={() => handleSelectView('stilist')}
                className="inline-flex items-center gap-1.5 border border-[var(--hairline)] bg-[var(--paper-elevated)] px-2 py-1 text-[11px] text-[var(--ink-2)] hover:border-[var(--ink)] transition-colors sm:max-w-[180px] shrink-0 cursor-pointer"
                title={`${location.city}, ${location.country}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                    liveWeather?.rain ? 'bg-[var(--accent)]' : 'bg-[var(--positive)]'
                  }`}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline truncate">{location.city}</span>
                <span className="font-tabular font-medium text-[var(--ink)] shrink-0">
                  {displayTemp > 0 ? `+${displayTemp}` : displayTemp}°
                </span>
              </button>

              <button
                type="button"
                onClick={openGenderGate}
                title={t.gender.label}
                className="min-h-[34px] inline-flex items-center gap-1 border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer shrink-0"
              >
                <span aria-hidden="true" className="text-[var(--accent)]">
                  {gender === 'm' ? '♂' : gender === 'w' ? '♀' : '✦'}
                </span>
                <span>{gender === 'm' ? t.gender.m : gender === 'w' ? t.gender.w : t.gender.all}</span>
              </button>
            </div>

            {/* Desktop Center Nav */}
            <nav aria-label={t.nav.ariaLabel} className="hidden lg:flex items-center gap-3.5">
              {desktopTabs.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectView(item.id)}
                    className={`min-h-[44px] inline-flex items-center px-1 text-[11px] uppercase tracking-[0.12em] whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
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

            {/* Right: Phone + QR + 10 Design Themes + 5 Languages + Quick Dark/Light */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Direct Phone Pill on Desktop & QR Contact Trigger */}
              <a
                href={CONTACT_INFO.phoneHref}
                className="hidden xl:inline-flex items-center gap-1.5 min-h-[38px] border border-[var(--hairline)] bg-[var(--paper-elevated)] px-2.5 text-[11px] font-tabular text-[var(--ink-2)] hover:border-[var(--ink)] hover:text-[var(--ink)] transition-colors"
                title={CONTACT_INFO.phoneDisplay}
              >
                <span aria-hidden="true" className="text-[var(--accent)]">☎</span>
                <span>{CONTACT_INFO.phoneDisplay}</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setQrOpen(true);
                  setLangOpen(false);
                  setDesignOpen(false);
                }}
                aria-label="QR Kod va Aloqa"
                className="min-h-[38px] inline-flex items-center gap-1 border border-[var(--hairline)] bg-[var(--paper-elevated)] px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                title="QR Kod & Aloqa"
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current shrink-0" aria-hidden="true">
                  <path d="M1 1h6v6H1V1zm1.5 1.5v3h3v-3h-3zM9 1h6v6H9V1zm1.5 1.5v3h3v-3h-3zM1 9h6v6H1V9zm1.5 1.5v3h3v-3h-3zM9 9h2v2H9V9zm2 2h2v2h-2v-2zm2-2h2v2h-2V9zm-4 4h2v2H9v-2zm4 0h2v2h-2v-2z" />
                </svg>
                <span className="hidden sm:inline">QR</span>
              </button>

              {/* Language Switcher */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setLangOpen((v) => !v);
                    setDesignOpen(false);
                  }}
                  aria-label={t.studio.langTitle}
                  className="min-h-[38px] px-2 border border-[var(--hairline)] bg-[var(--paper-elevated)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink)] hover:border-[var(--ink)] cursor-pointer"
                >
                  {currentLang.short}
                </button>
                {langOpen && (
                  <div
                    style={{ backgroundColor: 'var(--paper-elevated)' }}
                    className="absolute right-0 mt-1.5 w-44 border border-[var(--ink)] bg-[var(--paper-elevated)] p-1.5 shadow-2xl z-50"
                  >
                    <p className="px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] border-b border-[var(--hairline)] mb-1">
                      {t.studio.langTitle}
                    </p>
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setLanguage(opt.id);
                          setLangOpen(false);
                        }}
                        className={`w-full px-2.5 py-2 text-left text-xs flex items-center justify-between cursor-pointer ${
                          lang === opt.id
                            ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                            : 'text-[var(--ink)] hover:bg-[var(--paper-2)]'
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span className="text-[10px] opacity-75">{opt.short}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 10 Design Themes Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setDesignOpen((v) => !v);
                    setLangOpen(false);
                  }}
                  aria-label={t.studio.themesTitle}
                  className="min-h-[38px] inline-flex items-center gap-1.5 border border-[var(--hairline)] bg-[var(--paper-elevated)] px-2.5 text-[11px] uppercase tracking-[0.08em] text-[var(--ink)] hover:border-[var(--ink)] cursor-pointer"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-[var(--ink)]/30 shrink-0"
                    style={{ backgroundColor: currentDesign.preview[2] }}
                  />
                  <span className="hidden sm:inline">{t.studio.themesTitle}</span>
                </button>

                {designOpen && (
                  <div
                    style={{ backgroundColor: 'var(--paper-elevated)' }}
                    className="fixed sm:absolute right-3 sm:right-0 top-14 sm:top-full sm:mt-1.5 w-[calc(100vw-1.5rem)] max-w-[330px] border border-[var(--ink)] bg-[var(--paper-elevated)] p-3 shadow-2xl z-50"
                  >
                    <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-2 mb-2.5">
                      <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)] font-semibold">
                        10 {t.studio.themesTitle}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDesignOpen(false)}
                        className="text-xs px-2 py-0.5 border border-[var(--hairline)] cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 max-h-[65dvh] overflow-y-auto editorial-scroll">
                      {DESIGN_THEMES.map((preset) => {
                        const active = designTheme === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setDesignTheme(preset.id);
                              setDesignOpen(false);
                            }}
                            className={`p-2 border text-left transition-colors cursor-pointer ${
                              active
                                ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                                : 'border-[var(--hairline)] bg-[var(--paper)] hover:border-[var(--ink)]'
                            }`}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              {preset.preview.map((hex, i) => (
                                <span
                                  key={i}
                                  className="h-2.5 w-2.5 rounded-full border border-black/20"
                                  style={{ backgroundColor: hex }}
                                />
                              ))}
                            </div>
                            <p className="text-[11px] font-medium text-[var(--ink)] truncate">
                              {lang === 'en' ? preset.name_en : preset.name_uz}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Light/Dark Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? t.nav.themeLight : t.nav.themeDark}
                className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center border border-[var(--hairline)] bg-[var(--paper-elevated)] px-2 text-[var(--ink)] hover:border-[var(--ink)] transition-colors cursor-pointer"
              >
                {theme === 'dark' ? (
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 stroke-current" fill="none" strokeWidth="1.6">
                    <circle cx="10" cy="10" r="3.5" />
                    <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 stroke-current" fill="none" strokeWidth="1.6">
                    <path d="M16.5 11.8A6.8 6.8 0 0 1 8.2 3.5a7 7 0 1 0 8.3 8.3Z" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Tablet horizontal strip */}
          <nav
            aria-label={t.nav.ariaLabel}
            className="hidden md:flex lg:hidden items-center gap-4 overflow-x-auto pb-1.5 pt-0.5 border-t border-[var(--hairline)] no-scrollbar"
          >
            {desktopTabs.map((item) => {
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
            {t.meta.sampleBanner}
          </div>
        )}
      </header>

      {/* Mobile More Drawer */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-xs"
            onClick={() => setMoreOpen(false)}
          />
          <div
            style={{ backgroundColor: 'var(--paper-elevated)' }}
            className="absolute bottom-16 inset-x-3 border border-[var(--ink)] bg-[var(--paper-elevated)] p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--hairline)]">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                {t.nav.ariaLabel}
              </p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="px-2 py-1 text-xs text-[var(--ink)] border border-[var(--hairline)] cursor-pointer"
              >
                {t.atelier.closePicker}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-3">
              {mobileMoreTabs.map((tab) => {
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

            <div className="mt-3 pt-3 border-t border-[var(--hairline)] space-y-2.5">
              <div className="grid grid-cols-3 gap-1.5">
                {(['m', 'w', 'all'] as const).map((gOpt) => (
                  <button
                    key={gOpt}
                    type="button"
                    onClick={() => {
                      selectUserGender(gOpt, true);
                      setMoreOpen(false);
                    }}
                    className={`min-h-[36px] border text-[11px] uppercase tracking-[0.08em] cursor-pointer ${
                      gender === gOpt
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)] font-semibold'
                        : 'border-[var(--hairline)] bg-[var(--paper)] text-[var(--ink-2)]'
                    }`}
                  >
                    {gOpt === 'm' ? t.gender.m : gOpt === 'w' ? t.gender.w : t.gender.all}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2">
                <a
                  href={CONTACT_INFO.phoneHref}
                  className="flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 bg-[var(--ink)] px-3 text-xs font-medium text-[var(--paper)] font-tabular"
                >
                  <span aria-hidden="true">☎</span>
                  <span>{CONTACT_INFO.phoneDisplay}</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    setQrOpen(true);
                  }}
                  className="min-h-[40px] border border-[var(--accent)] bg-[var(--accent-soft)] px-3.5 text-xs uppercase tracking-[0.1em] text-[var(--accent)] font-semibold cursor-pointer"
                >
                  QR Kod
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Fixed Bottom Nav */}
      <nav
        aria-label={t.nav.ariaLabel}
        className="fixed bottom-0 inset-x-0 z-40 border-t border-[var(--hairline)] bg-[var(--paper)]/96 backdrop-blur-md md:hidden pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-14">
          {mobilePrimaryTabs.map((item) => {
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
            <span className="text-[11px] leading-none">•••</span>
          </button>
        </div>
      </nav>

      <QrContactModal open={qrOpen} initialMode="site" onClose={() => setQrOpen(false)} />
    </>
  );
}
