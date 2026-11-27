import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Garment } from '../data/schema';
import { useTranslation } from '../i18n/useTranslation';
import { GarmentImage } from './GarmentImage';

interface AtelierTrayItemProps {
  garment: Garment;
  isOnBoard: boolean;
  replacesExisting?: boolean;
  scoreDelta: number | null;
  onQuickPlace: (garment: Garment) => void;
}

export function AtelierTrayItem({
  garment,
  isOnBoard,
  replacesExisting = false,
  scoreDelta,
  onQuickPlace,
}: AtelierTrayItemProps) {
  const { localize } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `tray:${garment.id}`,
    data: { type: 'tray-garment', garment },
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative border bg-[var(--paper)] transition-colors flex flex-col justify-between ${
        isOnBoard
          ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/60 bg-[var(--accent-soft)]/30'
          : 'border-[var(--hairline)] hover:border-[var(--hairline-strong)]'
      } ${isDragging ? 'opacity-40' : 'opacity-100'}`}
    >
      {/* Status chip: Equipped badge or Harmony Delta */}
      <div className="flex items-center justify-between gap-1 px-2 pt-1.5">
        <span
          className="h-2.5 w-2.5 rounded-full border border-[var(--ink)]/20 shrink-0"
          style={{ backgroundColor: garment.color }}
          title={garment.color}
        />
        {isOnBoard ? (
          <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] bg-[var(--accent)] text-[var(--accent-ink)] font-semibold">
            ✓ {localize('Kiyilgan')}
          </span>
        ) : scoreDelta !== null ? (
          <span
            className={`text-[10px] font-semibold font-tabular ${
              scoreDelta > 0
                ? 'text-[var(--positive)]'
                : scoreDelta < 0
                  ? 'text-[var(--negative)]'
                  : 'text-[var(--muted)]'
            }`}
          >
            {scoreDelta > 0 ? `▲ ${scoreDelta}` : scoreDelta < 0 ? `▼ ${Math.abs(scoreDelta)}` : '• 0'}
          </span>
        ) : null}
      </div>

      {/* Draggable image area */}
      <div
        {...listeners}
        {...attributes}
        aria-label={localize(garment.name_uz)}
        className="h-24 w-full overflow-hidden p-2 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
      >
        <GarmentImage garment={garment} className="h-full w-full" />
      </div>

      {/* Clickable name + explicit Wear / Replace / Remove cue */}
      <button
        type="button"
        onClick={() => onQuickPlace(garment)}
        className={`min-h-[48px] w-full border-t px-2 py-1.5 text-left text-[11px] leading-tight transition-colors cursor-pointer flex items-center justify-between gap-1 ${
          isOnBoard
            ? 'border-[var(--accent)]/40 bg-[var(--paper-elevated)] text-[var(--ink)] hover:bg-[var(--paper-2)]'
            : 'border-[var(--hairline)] text-[var(--ink)] hover:bg-[var(--paper-2)]'
        }`}
      >
        <div className="min-w-0 flex-1">
          {garment.brand && (
            <span className="block text-[9px] uppercase tracking-[0.08em] text-[var(--muted)] truncate">
              {garment.brand}
            </span>
          )}
          <span className="line-clamp-2 block">{localize(garment.name_uz)}</span>
        </div>
        <span
          className={`shrink-0 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em] border font-semibold ${
            isOnBoard
              ? 'border-[var(--negative)]/40 text-[var(--negative)] bg-[var(--paper)]'
              : replacesExisting
                ? 'border-[var(--hairline-strong)] text-[var(--ink-2)] group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]'
                : 'border-[var(--hairline)] text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-ink)]'
          }`}
        >
          {isOnBoard
            ? localize('Yechish')
            : replacesExisting
              ? '⇄'
              : '+'}
        </span>
      </button>
    </div>
  );
}
