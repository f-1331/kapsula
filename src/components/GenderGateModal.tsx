import { useEffect, useMemo } from 'react';
import { LANGUAGE_OPTIONS } from '../i18n/languages';
import { useTranslation } from '../i18n/useTranslation';
import { isGarmentGenderEligible } from '../engine/stylist';
import { useKapsulaStore } from '../store/useKapsulaStore';
import { Card3D } from './Card3D';

export function GenderGateModal() {
  const { lang, setLanguage, localize } = useTranslation();
  const genderGateOpen = useKapsulaStore((s) => s.genderGateOpen);
  const currentGender = useKapsulaStore((s) => s.query.gender);
  const manifest = useKapsulaStore((s) => s.manifest);
  const selectUserGender = useKapsulaStore((s) => s.selectUserGender);
  const closeGenderGate = useKapsulaStore((s) => s.closeGenderGate);

  const counts = useMemo(() => {
    const menItems = manifest.garments.filter((g) => isGarmentGenderEligible(g, 'm')).length;
    const womenItems = manifest.garments.filter((g) => isGarmentGenderEligible(g, 'w')).length;
    const menLooks = manifest.looks.filter((l) => l.model === 'm').length;
    const womenLooks = manifest.looks.filter((l) => l.model === 'w').length;
    return { menItems, womenItems, menLooks, womenLooks };
  }, [manifest.garments, manifest.looks]);

  useEffect(() => {
    if (!genderGateOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeGenderGate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [genderGateOpen, closeGenderGate]);

  if (!genderGateOpen) return null;

  const headline =
    lang === 'ru'
      ? 'Для кого подобрать стиль?'
      : lang === 'en'
        ? 'Who are you styling for today?'
        : lang === 'tr'
          ? 'Kapsülü kime göre uyarlayalım?'
          : localize('Bugun kim uchun obraz yigʻamiz?');

  const subline =
    lang === 'ru'
      ? 'Весь каталог, 3D-манекен, лукбук и рекомендации сразу подстроятся под ваш выбор.'
      : lang === 'en'
        ? 'The 3D mannequin, catalog, lookbook, and stylist suggestions will immediately adapt to your choice.'
        : lang === 'tr'
          ? '3D manken, katalog, lookbook ve stilist önerileri seçiminize göre anında uyarlanır.'
          : localize(
              'Butun katalog, 3D maneken silueti, lookbook va stilist tavsiyalari tanlovingizga moslanadi.',
            );

  const menTitle =
    lang === 'ru'
      ? 'Мужчинам и парням'
      : lang === 'en'
        ? 'Men & Young Men'
        : lang === 'tr'
          ? 'Erkekler ve Gençler'
          : localize('Erkaklar va yigitlar uchun');

  const womenTitle =
    lang === 'ru'
      ? 'Женщинам и девушкам'
      : lang === 'en'
        ? 'Women & Girls'
        : lang === 'tr'
          ? 'Kadınlar ve Kızlar'
          : localize('Ayollar va qizlar uchun');

  const menDesc =
    lang === 'ru'
      ? 'Костюмы, блейзеры, тренчи, худи, карго, брюки, кроссовки, лоферы, часы и портфели.'
      : lang === 'en'
        ? 'Tailored blazers, trenches, hoodies, cargo & chinos, loafers, sneakers, watches & briefcases.'
        : lang === 'tr'
          ? 'Blazer, trençkot, hoodie, kargo pantolon, loafer, sneaker, saat ve evrak çantası.'
          : localize(
              'Pijak va trenchlar, hudi, polo, kargo va klassik shim, lofer, krossovka, soat va portfellar.',
            );

  const womenDesc =
    lang === 'ru'
      ? 'Пальто, шёлковые и атласные платья, юбки, кардиганы, туфли, шоперы и украшения.'
      : lang === 'en'
        ? 'Coats, silk & atlas dresses, skirts, cardigans, heels, woven totes & accessories.'
        : lang === 'tr'
          ? 'Kaban, ipek ve atlas elbiseler, etek, hırka, topuklu, tote çanta ve aksesuarlar.'
          : localize(
              'Palto, ipak va xon-atlas koʻylaklar, yubka, kardigan, tufli, shoper va aksessuarlar.',
            );

  const allLabel =
    lang === 'ru'
      ? 'Показать весь каталог (мужчины и женщины)'
      : lang === 'en'
        ? 'Browse full catalog (Men & Women)'
        : lang === 'tr'
          ? 'Tüm kataloğu göster (Erkek & Kadın)'
          : localize('Barchasini koʻrish (Erkaklar va ayollar)');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gender-gate-title"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
    >
      <div
        style={{ backgroundColor: 'var(--paper-elevated)' }}
        className="panel-3d relative w-full max-w-3xl border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 sm:p-8 shadow-2xl my-auto max-h-[94dvh] overflow-y-auto"
      >
        {/* Top Row: Brand & Language Quick Switch */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--hairline)] pb-3 mb-5">
          <div className="flex items-center gap-2">
            <span className="font-editorial italic text-xl text-[var(--ink)]">Kapsula</span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--accent)] font-semibold">
              · {localize('Shaxsiy 3D Atelye')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setLanguage(opt.id)}
                className={`min-h-[28px] px-2 text-[10px] font-semibold uppercase tracking-[0.08em] border cursor-pointer transition-colors ${
                  lang === opt.id
                    ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                    : 'border-[var(--hairline)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                {opt.short}
              </button>
            ))}
          </div>
        </div>

        {/* Heading */}
        <div className="text-center max-w-xl mx-auto mb-6">
          <h2
            id="gender-gate-title"
            className="font-editorial text-2xl sm:text-4xl leading-tight text-[var(--ink)]"
          >
            {headline}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[var(--ink-2)] leading-relaxed">{subline}</p>
        </div>

        {/* Dual Tactile Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {/* MEN & BOYS */}
          <Card3D intensity={7}>
            <button
              type="button"
              onClick={() => selectUserGender('m', true)}
              className={`group w-full h-full text-left border p-5 transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                currentGender === 'm'
                  ? 'border-[var(--accent)] bg-[var(--paper)] shadow-[inset_0_0_0_1px_var(--accent)]'
                  : 'border-[var(--hairline-strong)] bg-[var(--paper)] hover:border-[var(--ink)]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  {/* Minimalist Tailored Menswear SVG Icon */}
                  <div className="h-14 w-14 border border-[var(--hairline)] bg-[var(--paper-2)] flex items-center justify-center shrink-0 group-hover:border-[var(--accent)] transition-colors">
                    <svg viewBox="0 0 48 48" className="h-10 w-10 text-[var(--ink)]" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M16 10l8 5 8-5 7 6-3 22H12L9 16l7-6z" />
                      <path d="M24 15v23M19 10l5 10 5-10" stroke="var(--accent)" />
                    </svg>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-tabular uppercase tracking-[0.1em] border border-[var(--hairline)] bg-[var(--paper-2)] text-[var(--ink-2)]">
                    {counts.menItems.toLocaleString()} · {counts.menLooks} look
                  </span>
                </div>

                <h3 className="font-editorial text-2xl text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                  {menTitle}
                </h3>
                <p className="mt-1.5 text-xs text-[var(--ink-2)] leading-relaxed">{menDesc}</p>
              </div>

              <div className="pt-3 border-t border-[var(--hairline)] flex items-center justify-between text-xs uppercase tracking-[0.12em] font-semibold text-[var(--ink)] group-hover:text-[var(--accent)]">
                <span>
                  {lang === 'ru'
                    ? 'Выбрать мужской'
                    : lang === 'en'
                      ? 'Enter Menswear'
                      : lang === 'tr'
                        ? 'Erkek Moduna Geç'
                        : localize('Erkaklar boʻlimi')}
                </span>
                <span aria-hidden="true">→</span>
              </div>
            </button>
          </Card3D>

          {/* WOMEN & GIRLS */}
          <Card3D intensity={7}>
            <button
              type="button"
              onClick={() => selectUserGender('w', true)}
              className={`group w-full h-full text-left border p-5 transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                currentGender === 'w'
                  ? 'border-[var(--accent)] bg-[var(--paper)] shadow-[inset_0_0_0_1px_var(--accent)]'
                  : 'border-[var(--hairline-strong)] bg-[var(--paper)] hover:border-[var(--ink)]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  {/* Minimalist Womenswear Dress/Silhouette SVG Icon */}
                  <div className="h-14 w-14 border border-[var(--hairline)] bg-[var(--paper-2)] flex items-center justify-center shrink-0 group-hover:border-[var(--accent)] transition-colors">
                    <svg viewBox="0 0 48 48" className="h-10 w-10 text-[var(--ink)]" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M18 9c2 3 10 3 12 0l3 9-4 5 7 16H12l7-16-4-5 3-9z" />
                      <path d="M19 23h10" stroke="var(--accent)" />
                    </svg>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-tabular uppercase tracking-[0.1em] border border-[var(--hairline)] bg-[var(--paper-2)] text-[var(--ink-2)]">
                    {counts.womenItems.toLocaleString()} · {counts.womenLooks} look
                  </span>
                </div>

                <h3 className="font-editorial text-2xl text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                  {womenTitle}
                </h3>
                <p className="mt-1.5 text-xs text-[var(--ink-2)] leading-relaxed">{womenDesc}</p>
              </div>

              <div className="pt-3 border-t border-[var(--hairline)] flex items-center justify-between text-xs uppercase tracking-[0.12em] font-semibold text-[var(--ink)] group-hover:text-[var(--accent)]">
                <span>
                  {lang === 'ru'
                    ? 'Выбрать женский'
                    : lang === 'en'
                      ? 'Enter Womenswear'
                      : lang === 'tr'
                        ? 'Kadın Moduna Geç'
                        : localize('Ayollar boʻlimi')}
                </span>
                <span aria-hidden="true">→</span>
              </div>
            </button>
          </Card3D>
        </div>

        {/* Bottom Option + Hint */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-[var(--hairline)] pt-4">
          <button
            type="button"
            onClick={() => selectUserGender('all', true)}
            className="min-h-[38px] w-full sm:w-auto px-4 border border-[var(--hairline-strong)] bg-[var(--paper)] text-xs text-[var(--ink-2)] hover:border-[var(--ink)] hover:text-[var(--ink)] transition-colors cursor-pointer"
          >
            {allLabel}
          </button>
          <p className="text-[11px] text-[var(--muted)] text-center sm:text-right">
            {localize('Yuqori paneldan istalgan vaqt oʻzgartirish mumkin.')}
          </p>
        </div>
      </div>
    </div>
  );
}
