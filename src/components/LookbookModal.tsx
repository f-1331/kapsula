import { AnimatePresence, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { useEffect, useMemo, useRef } from 'react';
import type { Garment, Look } from '../data/schema';
import { analyzeGarmentsHarmony } from '../engine/color';
import { UZ } from '../i18n/uz';
import { useKapsulaStore } from '../store/useKapsulaStore';
import { GarmentImage } from './GarmentImage';
import { LookImage } from './LookImage';

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
  const manifest = useKapsulaStore((s) => s.manifest);
  const loadItemsToBoard = useKapsulaStore((s) => s.loadItemsToBoard);
  const setActiveView = useKapsulaStore((s) => s.setActiveView);
  const reducedMotion = useReducedMotion();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const byId = useMemo(
    () => new Map(manifest.garments.map((g) => [g.id, g])),
    [manifest.garments],
  );
  const paletteById = useMemo(
    () => new Map(manifest.palettes.map((p) => [p.id, p])),
    [manifest.palettes],
  );

  // Store previously focused element, lock body scroll, trap focus & handle Esc/Arrows
  useEffect(() => {
    if (!look) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus first focusable button inside modal
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/65 p-3 sm:p-6 overflow-y-auto"
        >
          <m.div
            ref={modalRef}
            initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: 10 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-5xl border border-[var(--ink)] bg-[var(--paper)] grid grid-cols-1 md:grid-cols-12 overflow-hidden max-h-[92dvh]"
          >
            {/* Left: Big 2:3 Editorial Spread Photo */}
            <div className="md:col-span-6 bg-[var(--paper-2)] border-b md:border-b-0 md:border-r border-[var(--hairline)] p-4 sm:p-6 flex items-center justify-center">
              <div className="w-full max-w-[380px]">
                <LookImage
                  look={look}
                  garments={manifest.garments}
                  palette={palette}
                  variant="full"
                  eager
                />
              </div>
            </div>

            {/* Right: "Shu lookni yigʻing" */}
            <div className="md:col-span-6 p-5 sm:p-8 flex flex-col justify-between overflow-y-auto editorial-scroll">
              <div>
                <div className="flex items-start justify-between gap-4 border-b border-[var(--hairline)] pb-4 mb-5">
                  <div>
                    <span className="micro-label text-[var(--accent)] block mb-1">
                      {UZ.lookbook.buildLookTitle}
                    </span>
                    <h3
                      id="lookbook-modal-title"
                      className="font-editorial italic text-3xl sm:text-4xl text-[var(--ink)] leading-none"
                    >
                      {look.title_uz}
                    </h3>
                    <p className="micro-label text-[var(--muted)] mt-2">
                      {UZ.occasions[look.occasion].label} · {UZ.weather[look.weather].label} ·{' '}
                      {palette?.name_uz}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    aria-label={UZ.lookbook.closeModal}
                    className="min-h-[44px] min-w-[44px] border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] text-base text-[var(--ink)] hover:border-[var(--ink)] cursor-pointer shrink-0"
                  >
                    ×
                  </button>
                </div>

                {/* Score + Scheme */}
                <div className="flex items-baseline justify-between gap-3 border border-[var(--hairline)] bg-[var(--paper-elevated)] px-4 py-3 mb-5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-numeral text-4xl text-[var(--accent)]">
                      {harmony.score}
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      / 100 {UZ.colorLab.scoreUnit}
                    </span>
                  </div>
                  <span className="micro-label text-[var(--ink)]">{harmony.schemeName}</span>
                </div>

                {/* Item cutouts list */}
                <ul className="space-y-2.5 mb-6">
                  {lookItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3.5 border border-[var(--hairline)] bg-[var(--paper-elevated)] p-2.5"
                    >
                      <div className="h-14 w-14 shrink-0 flex items-center justify-center bg-[var(--paper)] p-1 border border-[var(--hairline)]">
                        <GarmentImage garment={item} className="max-h-full w-full" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[var(--ink)] truncate">
                          {item.name_uz}
                        </div>
                        <div className="micro-label text-[10px] text-[var(--muted)] mt-0.5">
                          {UZ.categories[item.category]}
                        </div>
                      </div>
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-[var(--ink)]/20 shrink-0 mr-1"
                        style={{ backgroundColor: item.color }}
                        title={item.color}
                      />
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-[var(--hairline)] pt-4 space-y-3">
                <button
                  type="button"
                  onClick={handleOpenInAtelier}
                  className="min-h-[46px] w-full bg-[var(--ink)] px-5 py-3 text-xs uppercase tracking-[0.14em] text-[var(--paper)] hover:bg-[var(--accent)] transition-colors cursor-pointer"
                >
                  {UZ.lookbook.openInAtelier}
                </button>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={!prevLook}
                    onClick={() => prevLook && onNavigateLook(prevLook.id)}
                    className="min-h-[44px] border border-[var(--hairline-strong)] px-3.5 py-2 text-[11px] uppercase tracking-[0.1em] text-[var(--ink)] hover:border-[var(--ink)] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  >
                    ← {UZ.lookbook.prevLook}
                  </button>
                  <button
                    type="button"
                    disabled={!nextLook}
                    onClick={() => nextLook && onNavigateLook(nextLook.id)}
                    className="min-h-[44px] border border-[var(--hairline-strong)] px-3.5 py-2 text-[11px] uppercase tracking-[0.1em] text-[var(--ink)] hover:border-[var(--ink)] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {UZ.lookbook.nextLook} →
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
