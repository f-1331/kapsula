import { AnimatePresence, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CONTACT_INFO } from '../config/contact';
import type { Garment, Look } from '../data/schema';
import { analyzeGarmentsHarmony } from '../engine/color';
import { estimateOutfitBudget, getGarmentSpec } from '../engine/garment-specs';
import { garmentsToBoardSlots } from '../engine/stylist';
import { useTranslation } from '../i18n/useTranslation';
import { useKapsulaStore } from '../store/useKapsulaStore';
import { GarmentImage } from './GarmentImage';
import { LookImage } from './LookImage';
import { QrCodeCard } from './QrCodeCard';
import { Studio3DStage } from './Studio3DStage';

interface LookbookModalProps {
  look: Look | null;
  allLooks: Look[];
  onClose: () => void;
  onNavigateLook: (lookId: string) => void;
}

export function LookbookModal({
  look,
  allLooks,
  onClose,
  onNavigateLook,
}: LookbookModalProps) {
  const { t, localize } = useTranslation();
  const manifest = useKapsulaStore((s) => s.manifest);
  const loadItemsToBoard = useKapsulaStore((s) => s.loadItemsToBoard);
  const saveOutfit = useKapsulaStore((s) => s.saveOutfit);
  const openColorsInLab = useKapsulaStore((s) => s.openColorsInLab);
  const setActiveView = useKapsulaStore((s) => s.setActiveView);
  const [savedNotice, setSavedNotice] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const reducedMotion = useReducedMotion();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [previewMode, setPreviewMode] = useState<'poster' | '3d'>('poster');

  const byId = useMemo(
    () => new Map(manifest.garments.map((g) => [g.id, g])),
    [manifest.garments],
  );
  const paletteById = useMemo(
    () => new Map(manifest.palettes.map((p) => [p.id, p])),
    [manifest.palettes],
  );

  useEffect(() => {
    setPreviewMode('poster');
    setShowQr(false);
  }, [look?.id]);

  // Store previously focused element, lock body scroll, trap focus & handle Esc
  useEffect(() => {
    if (!look) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.setTimeout(() => {
      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.[0]?.focus();
    }, 10);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [look, onClose]);

  const lookItems = useMemo(() => {
    if (!look) return [];
    return look.items
      .map((id) => byId.get(id))
      .filter((g): g is Garment => Boolean(g));
  }, [look, byId]);

  const lookSlots = useMemo(() => garmentsToBoardSlots(lookItems), [lookItems]);

  const palette = look ? paletteById.get(look.palette) : undefined;
  const harmony = useMemo(
    () => analyzeGarmentsHarmony(lookItems, palette),
    [lookItems, palette],
  );

  const currentIndex = look ? allLooks.findIndex((l) => l.id === look.id) : -1;
  const prevLook = currentIndex > 0 ? allLooks[currentIndex - 1] : null;
  const nextLook =
    currentIndex >= 0 && currentIndex < allLooks.length - 1
      ? allLooks[currentIndex + 1]
      : null;

  const handleOpenInAtelier = () => {
    if (!look) return;
    loadItemsToBoard(look.items);
    onClose();
    setActiveView('atelye');
  };

  return (
    <AnimatePresence>
      {look && (
        <m.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lookbook-modal-title"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
        >
          <m.div
            ref={modalRef}
            initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: 10 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            style={{ backgroundColor: 'var(--paper)' }}
            className="relative my-auto w-full max-w-5xl border border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] flex flex-col md:grid md:grid-cols-12 md:max-h-[90dvh] md:overflow-hidden shadow-2xl"
          >
            {/* Mobile Close Bar (prevents cut-off close button on stacked viewports) */}
            <div
              style={{ backgroundColor: 'var(--paper-elevated)' }}
              className="flex md:hidden items-center justify-between border-b border-[var(--hairline)] px-4 py-2.5"
            >
              <span className="micro-label text-[var(--accent)]">{t.lookbook.buildLookTitle}</span>
              <button
                type="button"
                onClick={onClose}
                aria-label={t.lookbook.closeModal}
                className="min-h-[38px] min-w-[38px] border border-[var(--hairline-strong)] bg-[var(--paper)] text-base text-[var(--ink)] cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Left: Big Editorial Poster OR Interactive 3D Stage */}
            <div
              style={{ backgroundColor: 'var(--paper-2)' }}
              className="md:col-span-6 bg-[var(--paper-2)] border-b md:border-b-0 md:border-r border-[var(--hairline)] p-4 sm:p-6 flex flex-col items-center justify-center gap-3 min-w-0"
            >
              <div className="inline-flex border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] p-0.5 self-end">
                <button
                  type="button"
                  onClick={() => setPreviewMode('poster')}
                  className={`px-3 py-1 text-[10px] uppercase tracking-[0.12em] cursor-pointer ${
                    previewMode === 'poster'
                      ? 'bg-[var(--ink)] text-[var(--paper)] font-semibold'
                      : 'text-[var(--ink-2)]'
                  }`}
                >
                  {t.nav.lookbook}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('3d')}
                  className={`px-3 py-1 text-[10px] uppercase tracking-[0.12em] cursor-pointer ${
                    previewMode === '3d'
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-semibold'
                      : 'text-[var(--ink-2)]'
                  }`}
                >
                  {t.studio.mode3d}
                </button>
              </div>

              {previewMode === '3d' ? (
                <div className="w-full">
                  <Studio3DStage
                    slots={lookSlots}
                    byId={byId}
                    compact
                    labels={{
                      spin: t.studio.spin360,
                      layers: t.studio.zLayers,
                      dragHint: t.studio.dragHint,
                    }}
                  />
                </div>
              ) : (
                <div className="w-full max-w-[230px] sm:max-w-[300px] md:max-w-[350px]">
                  <LookImage
                    look={look}
                    garments={manifest.garments}
                    palette={palette}
                    variant="full"
                    eager
                  />
                </div>
              )}
            </div>

            {/* Right: "Shu lookni yigʻing" */}
            <div
              style={{ backgroundColor: 'var(--paper)' }}
              className="md:col-span-6 bg-[var(--paper)] p-4 sm:p-8 flex flex-col justify-between md:overflow-y-auto md:max-h-[90dvh] editorial-scroll min-h-0"
            >
              <div>
                <div className="flex items-start justify-between gap-4 border-b border-[var(--hairline)] pb-4 mb-5">
                  <div>
                    <span className="hidden md:block micro-label text-[var(--accent)] mb-1">
                      {t.lookbook.buildLookTitle}
                    </span>
                    <h3
                      id="lookbook-modal-title"
                      className="font-editorial italic text-3xl sm:text-4xl text-[var(--ink)] leading-none"
                    >
                      {localize(look.title_uz)}
                    </h3>
                    <p className="micro-label text-[var(--muted)] mt-2">
                      {t.occasions[look.occasion].label} · {t.weather[look.weather].label} ·{' '}
                      {localize(palette?.name_uz ?? '')}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    aria-label={t.lookbook.closeModal}
                    className="hidden md:inline-flex items-center justify-center min-h-[44px] min-w-[44px] border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] text-base text-[var(--ink)] hover:border-[var(--ink)] cursor-pointer shrink-0"
                  >
                    ×
                  </button>
                </div>

                {/* Score + Scheme */}
                <div
                  style={{ backgroundColor: 'var(--paper-elevated)' }}
                  className="flex items-baseline justify-between gap-3 border border-[var(--hairline)] bg-[var(--paper-elevated)] px-4 py-3 mb-5"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-numeral text-4xl text-[var(--accent)]">
                      {harmony.score}
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      / 100 {t.colorLab.scoreUnit}
                    </span>
                  </div>
                  <span className="micro-label text-[var(--ink)]">
                    {localize(harmony.schemeName)}
                  </span>
                </div>

                {/* Item cutouts list with material specs */}
                <ul className="space-y-2.5 mb-5">
                  {lookItems.map((item) => {
                    const spec = getGarmentSpec(item);
                    return (
                      <li
                        key={item.id}
                        style={{ backgroundColor: 'var(--paper-elevated)' }}
                        className="flex items-center gap-3.5 border border-[var(--hairline)] bg-[var(--paper-elevated)] p-2.5"
                      >
                        <div className="h-14 w-14 shrink-0 flex items-center justify-center bg-[var(--paper)] p-1 border border-[var(--hairline)]">
                          <GarmentImage garment={item} className="max-h-full w-full" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-[var(--ink)] truncate">
                            {localize(item.name_uz)}
                          </div>
                          <div className="micro-label text-[10px] text-[var(--muted)] mt-0.5 truncate">
                            {t.categories[item.category]}
                            {item.brand ? ` · ${item.brand}` : ''} · {localize(spec.fabricUz)}
                          </div>
                        </div>
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-[var(--ink)]/20 shrink-0 mr-1"
                          style={{ backgroundColor: item.color }}
                          title={item.color}
                        />
                      </li>
                    );
                  })}
                </ul>

                {/* Estimated UZS Capsule Budget */}
                {lookItems.length > 0 && (
                  <div className="mb-4 flex items-center justify-between gap-2 border border-[var(--hairline)] bg-[var(--paper-2)]/70 px-3 py-2 text-xs">
                    <span className="text-[var(--muted)] uppercase tracking-[0.08em] text-[10px]">
                      {localize('Taxminiy kapsula byudjeti')}
                    </span>
                    <span className="font-semibold font-tabular text-[var(--ink)]">
                      {localize(estimateOutfitBudget(lookItems).labelUz)}
                    </span>
                  </div>
                )}

                {showQr && (
                  <div className="mb-4 max-w-[230px] mx-auto">
                    <QrCodeCard
                      value={`${CONTACT_INFO.siteUrl}/?items=${encodeURIComponent(look.items.join(','))}#atelye`}
                      title={look.title_uz}
                      subtitle="Obrazni telefonda ochish uchun"
                      size={140}
                      downloadName={`kapsula-${look.id}`}
                    />
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--hairline)] pt-4 space-y-2.5">
                <button
                  type="button"
                  onClick={handleOpenInAtelier}
                  className="min-h-[46px] w-full bg-[var(--ink)] px-5 py-3 text-xs uppercase tracking-[0.14em] text-[var(--paper)] hover:bg-[var(--accent)] transition-colors cursor-pointer"
                >
                  {t.lookbook.openInAtelier}
                </button>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const ok = saveOutfit(
                        look.items,
                        look.title_uz ?? `Lookbook · ${t.occasions[look.occasion].label}`,
                      );
                      if (ok) {
                        setSavedNotice(true);
                        window.setTimeout(() => setSavedNotice(false), 1800);
                      }
                    }}
                    className="min-h-[40px] border border-[var(--hairline-strong)] px-2 py-1.5 text-[10px] uppercase tracking-[0.08em] text-[var(--ink)] hover:border-[var(--ink)] cursor-pointer"
                  >
                    {savedNotice ? localize('Saqlandi ✓') : t.atelier.toolbar.save}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cols = Array.from(new Set(lookItems.map((g) => g.color))).slice(0, 5);
                      if (cols.length >= 2) {
                        onClose();
                        openColorsInLab(cols);
                      }
                    }}
                    className="min-h-[40px] border border-[var(--hairline-strong)] px-2 py-1.5 text-[10px] uppercase tracking-[0.08em] text-[var(--ink)] hover:border-[var(--ink)] cursor-pointer"
                  >
                    {localize('Ranglar')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQr((v) => !v)}
                    className={`min-h-[40px] border px-2 py-1.5 text-[10px] uppercase tracking-[0.08em] cursor-pointer ${
                      showQr
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)] font-semibold'
                        : 'border-[var(--hairline-strong)] text-[var(--ink)] hover:border-[var(--ink)]'
                    }`}
                  >
                    {localize('QR Kod')}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={!prevLook}
                    onClick={() => prevLook && onNavigateLook(prevLook.id)}
                    className="min-h-[44px] border border-[var(--hairline-strong)] px-3.5 py-2 text-[11px] uppercase tracking-[0.1em] text-[var(--ink)] hover:border-[var(--ink)] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  >
                    ← {t.lookbook.prevLook}
                  </button>
                  <button
                    type="button"
                    disabled={!nextLook}
                    onClick={() => nextLook && onNavigateLook(nextLook.id)}
                    className="min-h-[44px] border border-[var(--hairline-strong)] px-3.5 py-2 text-[11px] uppercase tracking-[0.1em] text-[var(--ink)] hover:border-[var(--ink)] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {t.lookbook.nextLook} →
                  </button>
                </div>
              </div>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
