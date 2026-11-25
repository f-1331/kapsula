import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Garment } from '../data/schema';
import { GarmentImage } from './GarmentImage';

interface AtelierTrayItemProps {
  garment: Garment;
  isOnBoard: boolean;
  scoreDelta: number | null;
  onQuickPlace: (garment: Garment) => void;
}

export function AtelierTrayItem({
  garment,
  isOnBoard,
  scoreDelta,
  onQuickPlace,
}: AtelierTrayItemProps) {
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
          ? 'border-[var(--ink)] bg-[var(--paper-2)]/70'
          : 'border-[var(--hairline)] hover:border-[var(--hairline-strong)]'
      } ${isDragging ? 'opacity-40' : 'opacity-100'}`}
    >
      {/* Delta chip or "Joylangan" status */}
      <div className="flex items-center justify-between px-2 pt-1.5">
        <span
          className="h-2.5 w-2.5 rounded-full border border-[var(--ink)]/20 shrink-0"
          style={{ backgroundColor: garment.color }}
          title={garment.color}
        />
        {isOnBoard ? (
          <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--ink)] font-medium">
            ✓
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
        aria-label={garment.name_uz}
        className="h-24 w-full overflow-hidden p-2 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
      >
        <GarmentImage garment={garment} className="h-full w-full" />
      </div>

      {/* Clickable name button for one-tap / keyboard placement */}
      <button
        type="button"
        onClick={() => onQuickPlace(garment)}
        className="min-h-[46px] w-full border-t border-[var(--hairline)] px-2 py-1.5 text-left text-[11px] leading-tight text-[var(--ink)] hover:bg-[var(--paper-2)] transition-colors cursor-pointer flex items-center justify-between gap-1"
      >
        <div className="min-w-0 flex-1">
          {garment.brand && (
            <span className="block text-[9px] uppercase tracking-[0.08em] text-[var(--muted)] truncate">
              {garment.brand}
            </span>
          )}
          <span className="line-clamp-2 block">{garment.name_uz}</span>
        </div>
        <span className="text-[var(--muted)] group-hover:text-[var(--accent)] shrink-0" aria-hidden="true">
          +
        </span>
      </button>
    </div>
  );
}
