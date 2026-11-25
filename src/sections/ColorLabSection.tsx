import { useMemo, useState } from 'react';
import { analyzeHarmony, normalizeHex } from '../engine/color';
import { findNearestGarmentsByColor } from '../engine/stylist';
import { UZ } from '../i18n/uz';
import { useKapsulaStore } from '../store/useKapsulaStore';
import { GarmentImage } from '../components/GarmentImage';
import { RangLaboratoriyasi } from '../components/RangLaboratoriyasi';

interface ColorSlotEntry {
  id: string;
  hex: string;
  draft: string;
  invalid: boolean;
}

const COLOR_PRESETS: Array<{ label: string; colors: string[] }> = [
  { label: 'Qum klassika', colors: ['#151412', '#F4EFE6', '#B98E5E'] },
  { label: 'Qirmizi urgʻu', colors: ['#121212', '#F4F2EE', '#8F1D2C'] },
  { label: 'Tuproq va zaytun', colors: ['#B2573A', '#6D7048', '#EFE7D6'] },
  { label: 'Dengiz muvozanati', colors: ['#25345A', '#FFFFFF', '#C4A27A'] },
];

export function ColorLabSection() {
  const manifest = useKapsulaStore((s) => s.manifest);
  const placeGarmentOnBoard = useKapsulaStore((s) => s.placeGarmentOnBoard);
  const setActiveView = useKapsulaStore((s) => s.setActiveView);

  const [entries, setEntries] = useState<ColorSlotEntry[]>([
    { id: 'c1', hex: '#151412', draft: '#151412', invalid: false },
    { id: 'c2', hex: '#F4EFE6', draft: '#F4EFE6', invalid: false },
    { id: 'c3', hex: '#B98E5E', draft: '#B98E5E', invalid: false },
  ]);
  const [wardrobePickerSlotId, setWardrobePickerSlotId] = useState<string | null>(null);

  const validHexes = useMemo(() => entries.map((e) => e.hex), [entries]);

  const analysis = useMemo(() => {
    const share = 1 / Math.max(1, validHexes.length);
    return analyzeHarmony(validHexes.map((hex) => ({ hex, weight: share })));
  }, [validHexes]);

  const nearestGarments = useMemo(
    () => findNearestGarmentsByColor(manifest.garments, validHexes, 6),
    [manifest.garments, validHexes],
  );

  const updateColorPicker = (id: string, hex: string) => {
    const upper = hex.toUpperCase();
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, hex: upper, draft: upper, invalid: false } : e)),
    );
  };

  const updateHexDraft = (id: string, raw: string) => {
    const formatted = raw.startsWith('#') ? raw : `#${raw}`;
    const normalized = /^#[0-9a-fA-F]{6}$/.test(formatted.trim())
      ? normalizeHex(formatted)
      : null;

    setEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              draft: raw,
              hex: normalized ?? e.hex,
              invalid: raw.trim().length > 0 && normalized === null,
            }
          : e,
      ),
    );
  };

  const addColorSlot = () => {
    if (entries.length >= 5) return;
    const defaults = ['#8F1D2C', '#25345A', '#6D7048', '#E2D3BA'];
    const pick = defaults[entries.length % defaults.length]!;
    setEntries((prev) => [
      ...prev,
      { id: `c-${Date.now()}`, hex: pick, draft: pick, invalid: false },
    ]);
  };

  const removeColorSlot = (id: string) => {
    if (entries.length <= 2) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const applyPreset = (colors: string[]) => {
    setEntries(
      colors.slice(0, 5).map((hex, i) => ({
        id: `preset-${i}-${hex}`,
        hex,
        draft: hex,
        invalid: false,
      })),
    );
  };

  return (
    <section
      id="ranglar"
      aria-labelledby="ranglar-heading"
      className="min-h-[calc(100dvh-7rem)] border-b border-[var(--hairline)] bg-[var(--paper-2)]/45"
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8 py-12 sm:py-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--hairline)] pb-6 mb-8">
          <div>
            <span className="micro-label text-[var(--muted)] block mb-2">
              {UZ.sections.ranglar}
            </span>
            <h2
              id="ranglar-heading"
              className="font-editorial text-3xl sm:text-5xl leading-none text-[var(--ink)]"
            >
              {UZ.colorLab.standalone.title}
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[var(--ink-2)] max-w-md">
            {UZ.colorLab.standalone.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: 2–5 Color Inputs + Presets */}
          <div className="lg:col-span-7 space-y-6">
            {/* Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="micro-label text-[var(--muted)] mr-1">
                {UZ.colorLab.standalone.presetsLabel}:
              </span>
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset.colors)}
                  className="min-h-[38px] inline-flex items-center gap-2 border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] px-3 py-1.5 text-xs text-[var(--ink)] hover:border-[var(--ink)] cursor-pointer"
                >
                  <span className="flex -space-x-1">
                    {preset.colors.map((c) => (
                      <span
                        key={c}
                        className="h-3 w-3 rounded-full border border-[var(--paper)]"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </span>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>

            {/* Color Input Cards */}
            <div className="space-y-3">
              {entries.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] p-3.5 sm:p-4 flex flex-wrap sm:flex-nowrap items-center gap-3"
                >
                  <label className="relative h-12 w-12 shrink-0 border border-[var(--ink)]/25 cursor-pointer overflow-hidden">
                    <span className="sr-only">Rang {idx + 1}</span>
                    <input
                      type="color"
                      value={entry.hex}
                      onChange={(e) => updateColorPicker(entry.id, e.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                    <span
                      className="block h-full w-full"
                      style={{ backgroundColor: entry.hex }}
                    />
                  </label>

                  <div className="flex-1 min-w-[140px]">
                    <label
                      htmlFor={`hex-input-${entry.id}`}
                      className="micro-label text-[10px] text-[var(--muted)] block mb-1"
                    >
                      0{idx + 1} · HEX
                    </label>
                    <input
                      id={`hex-input-${entry.id}`}
                      type="text"
                      value={entry.draft}
                      onChange={(e) => updateHexDraft(entry.id, e.target.value)}
                      maxLength={7}
                      spellCheck={false}
                      className="w-full min-h-[40px] border border-[var(--hairline)] bg-[var(--paper)] px-3 py-1.5 font-mono text-sm text-[var(--ink)] uppercase focus:border-[var(--ink)]"
                    />
                    {entry.invalid && (
                      <span className="text-[11px] text-[var(--accent)] mt-0.5 block">
                        {UZ.colorLab.standalone.hexInvalid}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setWardrobePickerSlotId(entry.id)}
                    className="min-h-[44px] border border-[var(--hairline-strong)] bg-[var(--paper)] px-3.5 py-2 text-xs text-[var(--ink)] hover:border-[var(--ink)] cursor-pointer whitespace-nowrap"
                  >
                    {UZ.colorLab.standalone.pickFromWardrobe}
                  </button>

                  {entries.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeColorSlot(entry.id)}
                      aria-label={UZ.colorLab.standalone.removeColor}
                      className="min-h-[44px] min-w-[44px] border border-[var(--hairline)] text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {entries.length < 5 && (
              <button
                type="button"
                onClick={addColorSlot}
                className="min-h-[46px] w-full border border-dashed border-[var(--hairline-strong)] bg-[var(--paper)]/70 py-3 text-xs uppercase tracking-[0.14em] text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--paper-elevated)] transition-colors cursor-pointer"
              >
                + {UZ.colorLab.standalone.addColor}
              </button>
            )}

            {/* Nearest garments by OKLab distance */}
            <div className="border-t border-[var(--hairline)] pt-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                <h3 className="micro-label text-[var(--ink)]">
                  {UZ.colorLab.standalone.matchingTitle}
                </h3>
                <span className="text-xs text-[var(--muted)]">
                  {UZ.colorLab.standalone.matchingSub}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {nearestGarments.map(({ garment }) => (
                  <div
                    key={garment.id}
                    className="border border-[var(--hairline)] bg-[var(--paper-elevated)] p-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="h-24 w-full overflow-hidden flex items-center justify-center mb-2">
                        <GarmentImage garment={garment} className="h-full w-full" />
                      </div>
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <span className="text-xs font-medium text-[var(--ink)] line-clamp-1">
                          {garment.name_uz}
                        </span>
                        <span
                          className="h-3 w-3 rounded-full border border-[var(--ink)]/20 shrink-0"
                          style={{ backgroundColor: garment.color }}
                        />
                      </div>
                      <div className="text-[11px] font-mono text-[var(--muted)] mb-2">
                        {garment.color}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        placeGarmentOnBoard(garment);
                        setActiveView('atelye');
                      }}
                      className="min-h-[40px] w-full border border-[var(--hairline-strong)] px-2 py-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--paper-2)] cursor-pointer"
                    >
                      {UZ.colorLab.standalone.applyToAtelier}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Shared RangLaboratoriyasi Panel */}
          <div className="lg:col-span-5">
            <RangLaboratoriyasi analysis={analysis} />
          </div>
        </div>
      </div>

      {/* Wardrobe color picker modal */}
      {wardrobePickerSlotId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={UZ.colorLab.standalone.pickFromWardrobe}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setWardrobePickerSlotId(null);
          }}
        >
          <div className="w-full max-w-xl max-h-[80dvh] border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 flex flex-col">
            <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-3 mb-4">
              <h3 className="font-editorial text-2xl text-[var(--ink)]">
                {UZ.colorLab.standalone.pickFromWardrobe}
              </h3>
              <button
                type="button"
                onClick={() => setWardrobePickerSlotId(null)}
                aria-label={UZ.atelier.closePicker}
                className="min-h-[44px] min-w-[44px] border border-[var(--hairline)] text-sm cursor-pointer"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto editorial-scroll pr-1">
              {manifest.garments.slice(0, 60).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    updateColorPicker(wardrobePickerSlotId, g.color);
                    setWardrobePickerSlotId(null);
                  }}
                  className="text-left border border-[var(--hairline)] bg-[var(--paper)] p-2.5 hover:border-[var(--ink)] cursor-pointer flex items-center gap-2.5"
                >
                  <span
                    className="h-7 w-7 shrink-0 border border-[var(--ink)]/20"
                    style={{ backgroundColor: g.color }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs text-[var(--ink)] truncate">{g.name_uz}</div>
                    <div className="text-[10px] font-mono text-[var(--muted)]">{g.color}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
