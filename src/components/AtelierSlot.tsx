import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { useState, type PointerEvent } from 'react';
import type { Garment } from '../data/schema';
import type { SlotKey } from '../engine/stylist';
import { useTranslation } from '../i18n/useTranslation';
import { GarmentImage } from './GarmentImage';

interface AtelierSlotProps {
  slotKey: SlotKey;
  label: string;
  garment?: Garment;
  isHighlighted: boolean;
  isPulsing: boolean;
  previewDelta: number | null;
  className?: string;
  imageClassName?: string;
  onRemove: (slotKey: SlotKey) => void;
  onOpenPicker: (slotKey: SlotKey) => void;
}

export function AtelierSlot({
  slotKey,
  label,
  garment,
  isHighlighted,
  isPulsing,
  previewDelta,
  className = '',
  imageClassName = 'h-full w-full',
  onRemove,
  onOpenPicker,
}: AtelierSlotProps) {
  const { t, localize } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `slot:${slotKey}`,
    data: { type: 'slot', slotKey },
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: garment ? `board:${slotKey}:${garment.id}` : `board-empty:${slotKey}`,
    disabled: !garment,
    data: garment ? { type: 'board-garment', slotKey, garment } : undefined,
  });

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || e.pointerType !== 'mouse' || isDragging || !garment) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rx: Math.max(-6, Math.min(6, -ny * 10)),
      ry: Math.max(-6, Math.min(6, nx * 10)),
    });
  };

  const resetTilt = () => setTilt({ rx: 0, ry: 0 });

  const dragStyle = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const activeBorder =
    isOver || isHighlighted
      ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-[inset_0_0_0_1px_var(--accent)]'
      : garment
        ? 'border-[var(--hairline)] bg-[var(--paper)]/75 hover:border-[var(--hairline-strong)]'
        : 'border-dashed border-[var(--hairline-strong)] bg-[var(--paper)]/40 hover:border-[var(--ink)]';

  return (
    <div
      ref={setDropRef}
      data-slot={slotKey}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      className={`relative flex flex-col overflow-hidden border transition-colors ${activeBorder} ${
        isPulsing
          ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--paper-elevated)] animate-pulse'
          : ''
      } ${className}`}
    >
      {/* Preview delta chip during drag */}
      {previewDelta !== null && (isOver || isHighlighted) && (
        <span
          className={`absolute top-1.5 left-1.5 z-20 px-1.5 py-0.5 text-[10px] font-semibold font-tabular border bg-[var(--paper-elevated)] ${
            previewDelta >= 0
              ? 'border-[var(--positive)] text-[var(--positive)]'
              : 'border-[var(--negative)] text-[var(--negative)]'
          }`}
        >
          {previewDelta > 0 ? `▲ +${previewDelta}` : previewDelta < 0 ? `▼ ${previewDelta}` : '• 0'}
        </span>
      )}

      {garment ? (
        <>
          {/* Upper illustration container (never overlaps caption strip!) */}
          <div
            ref={setDragRef}
            style={{
              ...dragStyle,
              transform: dragStyle?.transform
                ? dragStyle.transform
                : reducedMotion
                  ? undefined
                  : `perspective(900px) rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`,
              transition: isDragging ? undefined : 'transform 180ms ease-out',
            }}
            {...listeners}
            {...attributes}
            aria-label={`${localize(garment.name_uz)} (${label})`}
            className={`flex-1 min-h-0 w-full overflow-hidden p-1.5 sm:p-2 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none ${
              isDragging ? 'opacity-25' : 'opacity-100'
            }`}
          >
            <m.div
              key={garment.id}
              layout={!reducedMotion}
              initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="w-full h-full overflow-hidden flex items-center justify-center"
            >
              <GarmentImage garment={garment} className={imageClassName} />
            </m.div>
          </div>

          {/* Dedicated non-overlapping slot footer */}
          <div className="shrink-0 border-t border-[var(--hairline)] bg-[var(--paper-elevated)] px-1.5 py-1 flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => onOpenPicker(slotKey)}
              className="min-h-[30px] flex-1 min-w-0 truncate text-left text-[10px] sm:text-[11px] text-[var(--ink-2)] hover:text-[var(--ink)] cursor-pointer"
              title={`${localize(garment.name_uz)} — ${t.atelier.pickForSlot}`}
            >
              {localize(garment.name_uz)}
            </button>
            <button
              type="button"
              onClick={() => onRemove(slotKey)}
              aria-label={`${localize(garment.name_uz)} — ${t.atelier.removeItem}`}
              className="h-7 w-7 shrink-0 inline-flex items-center justify-center border border-[var(--hairline)] bg-[var(--paper)] text-xs text-[var(--ink-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] cursor-pointer"
            >
              ×
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => onOpenPicker(slotKey)}
          className="w-full h-full min-h-[44px] flex flex-col items-center justify-center p-1 sm:p-2 text-center cursor-pointer group overflow-hidden"
        >
          <span
            className={`uppercase font-medium text-[var(--muted)] group-hover:text-[var(--ink)] leading-tight max-w-full truncate ${
              slotKey === 'accessory1' || slotKey === 'accessory2'
                ? 'text-[8px] sm:text-[9px] tracking-[0.03em] sm:tracking-[0.08em]'
                : 'text-[9px] sm:text-[10px] tracking-[0.1em]'
            }`}
          >
            {label}
          </span>
          <span className="mt-1 text-[9px] sm:text-[10px] text-[var(--muted)]/80 leading-tight max-w-full truncate">
            {t.atelier.emptySlotHint}
          </span>
        </button>
      )}
    </div>
  );
}
