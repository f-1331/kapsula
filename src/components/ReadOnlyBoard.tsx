import type { Garment } from '../data/schema';
import type { BoardSlots } from '../engine/stylist';
import { useTranslation } from '../i18n/useTranslation';
import { GarmentImage } from './GarmentImage';

interface ReadOnlyBoardProps {
  slots: BoardSlots;
  byId: Map<string, Garment>;
  compact?: boolean;
}

/**
 * Editorial read-only capsule board composition used in Stylist Top Pick and alternatives.
 */
export function ReadOnlyBoard({ slots, byId, compact = false }: ReadOnlyBoardProps) {
  const { t, localize } = useTranslation();
  const outer = slots.outerwear ? byId.get(slots.outerwear) : undefined;
  const dress = slots.dress ? byId.get(slots.dress) : undefined;
  const top = slots.top ? byId.get(slots.top) : undefined;
  const bottom = slots.bottom ? byId.get(slots.bottom) : undefined;
  const shoes = slots.shoes ? byId.get(slots.shoes) : undefined;
  const bag = slots.bag ? byId.get(slots.bag) : undefined;
  const acc1 = slots.accessory1 ? byId.get(slots.accessory1) : undefined;
  const acc2 = slots.accessory2 ? byId.get(slots.accessory2) : undefined;

  return (
    <div
      className={`border border-[var(--hairline)] bg-[var(--paper-elevated)] ${
        compact ? 'p-3' : 'p-4 sm:p-6'
      }`}
    >
      <div
        className={`grid grid-cols-12 ${
          compact ? 'gap-2 min-h-[195px]' : 'gap-3 min-h-[290px] sm:min-h-[340px]'
        }`}
      >
        {/* Left column: Outerwear + Accessories */}
        <div className="col-span-4 flex flex-col justify-between gap-2">
          <div className="flex-1 flex items-center justify-center p-1 border border-[var(--hairline)]/60 bg-[var(--paper)]/55">
            {outer ? (
              <GarmentImage
                garment={outer}
                className={compact ? 'max-h-[115px] w-full' : 'max-h-[190px] w-full'}
              />
            ) : (
              <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]/60 text-center px-1">
                {t.slots.outerwear}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5 h-[52px] sm:h-[68px]">
            {[acc1, acc2].map((acc, idx) => (
              <div
                key={idx}
                className="flex items-center justify-center p-1 border border-[var(--hairline)]/60 bg-[var(--paper)]/55"
              >
                {acc ? (
                  <GarmentImage garment={acc} className="max-h-full w-full" />
                ) : (
                  <span className="text-[9px] text-[var(--muted)]/50">·</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Center column: Dress OR Top over Bottom */}
        <div className="col-span-4 flex flex-col items-center justify-center gap-1 border border-[var(--hairline)]/60 bg-[var(--paper)]/55 p-1.5">
          {dress ? (
            <GarmentImage
              garment={dress}
              className={compact ? 'max-h-[170px] w-full' : 'max-h-[280px] w-full'}
            />
          ) : (
            <>
              <div className="flex-1 w-full flex items-center justify-center">
                {top ? (
                  <GarmentImage
                    garment={top}
                    className={compact ? 'max-h-[82px] w-full' : 'max-h-[135px] w-full'}
                  />
                ) : (
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]/60">
                    {t.slots.top}
                  </span>
                )}
              </div>
              <div className="flex-1 w-full flex items-center justify-center -mt-2">
                {bottom ? (
                  <GarmentImage
                    garment={bottom}
                    className={compact ? 'max-h-[90px] w-full' : 'max-h-[145px] w-full'}
                  />
                ) : (
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]/60">
                    {t.slots.bottom}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right column: Bag + Shoes */}
        <div className="col-span-4 flex flex-col justify-between gap-2">
          <div className="flex-1 flex items-center justify-center p-1 border border-[var(--hairline)]/60 bg-[var(--paper)]/55">
            {bag ? (
              <GarmentImage
                garment={bag}
                className={compact ? 'max-h-[80px] w-full' : 'max-h-[130px] w-full'}
              />
            ) : (
              <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]/60 text-center">
                {t.slots.bag}
              </span>
            )}
          </div>
          <div className="flex-1 flex items-center justify-center p-1 border border-[var(--hairline)]/60 bg-[var(--paper)]/55">
            {shoes ? (
              <GarmentImage
                garment={shoes}
                className={compact ? 'max-h-[72px] w-full' : 'max-h-[120px] w-full'}
              />
            ) : (
              <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]/60 text-center">
                {t.slots.shoes}
              </span>
            )}
          </div>
        </div>
      </div>

      {!compact && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[var(--hairline)] pt-2.5">
          {[outer, dress, top, bottom, shoes, bag, acc1, acc2]
            .filter((g): g is Garment => Boolean(g))
            .map((g) => (
              <span key={g.id} className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-2)]">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full border border-[var(--ink)]/20"
                  style={{ backgroundColor: g.color }}
                />
                {localize(g.name_uz)}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
