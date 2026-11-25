import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { Garment } from '../data/schema';
import type { BoardSlots, SlotKey } from '../engine/stylist';
import { GarmentImage } from './GarmentImage';

interface Studio3DStageProps {
  slots: BoardSlots;
  byId: Map<string, Garment>;
  onSelectSlot?: (slot: SlotKey) => void;
  compact?: boolean;
  labels?: {
    spin?: string;
    reset?: string;
    dragHint?: string;
    empty?: string;
    layers?: string;
  };
}

/**
 * Interactive CSS-3D volumetric outfit stage.
 * Layers all active outfit garments across authentic Z-depth planes with studio
 * spotlighting, podium shadow projection, mouse/touch 3D orbit rotation, zoom, and auto-spin.
 */
export function Studio3DStage({
  slots,
  byId,
  onSelectSlot,
  compact = false,
  labels,
}: Studio3DStageProps) {
  const [rotY, setRotY] = useState(-10);
  const [rotX, setRotX] = useState(5);
  const [zoom, setZoom] = useState(1);
  const [autoSpin, setAutoSpin] = useState(true);
  const [depthView, setDepthView] = useState(false);

  const draggingRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    baseRotY: number;
    baseRotX: number;
  }>({ active: false, startX: 0, startY: 0, baseRotY: -10, baseRotX: 5 });

  // Gentle studio turntable oscillation while autoSpin is enabled and user isn't dragging
  useEffect(() => {
    if (!autoSpin) return;
    let rafId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (!draggingRef.current.active) {
        const t = (now - start) / 1000;
        setRotY(Math.sin(t * 0.75) * 24);
        setRotX(4 + Math.cos(t * 0.55) * 4);
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [autoSpin]);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    setAutoSpin(false);
    draggingRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      baseRotY: rotY,
      baseRotX: rotX,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current.active) return;
    const dx = e.clientX - draggingRef.current.startX;
    const dy = e.clientY - draggingRef.current.startY;
    setRotY(Math.max(-48, Math.min(48, draggingRef.current.baseRotY + dx * 0.35)));
    setRotX(Math.max(-20, Math.min(20, draggingRef.current.baseRotX - dy * 0.25)));
  };

  const handlePointerUp = () => {
    draggingRef.current.active = false;
  };

  const outer = slots.outerwear ? byId.get(slots.outerwear) : undefined;
  const dress = slots.dress ? byId.get(slots.dress) : undefined;
  const top = slots.top ? byId.get(slots.top) : undefined;
  const bottom = slots.bottom ? byId.get(slots.bottom) : undefined;
  const shoes = slots.shoes ? byId.get(slots.shoes) : undefined;
  const bag = slots.bag ? byId.get(slots.bag) : undefined;
  const acc1 = slots.accessory1 ? byId.get(slots.accessory1) : undefined;
  const acc2 = slots.accessory2 ? byId.get(slots.accessory2) : undefined;

  const hasAny = Boolean(outer || dress || top || bottom || shoes || bag || acc1 || acc2);
  const zSpread = depthView ? 1.75 : 1;

  return (
    <div className="relative border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] overflow-hidden select-none">
      {/* Studio Controls Header */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--hairline)] bg-[var(--paper)]/90 px-3 py-2">
        <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--accent)] font-semibold">
          3D Studio · {Math.round(rotY)}°
        </span>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAutoSpin((s) => !s)}
            className={`px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] border cursor-pointer ${
              autoSpin
                ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)] font-medium'
                : 'border-[var(--hairline-strong)] bg-[var(--paper)] text-[var(--ink)]'
            }`}
          >
            {labels?.spin ?? '360° Aylanish'}
          </button>
          <button
            type="button"
            onClick={() => setDepthView((d) => !d)}
            className={`px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] border cursor-pointer ${
              depthView
                ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                : 'border-[var(--hairline-strong)] bg-[var(--paper)] text-[var(--ink)]'
            }`}
          >
            {labels?.layers ?? 'Z-Qatlam'}
          </button>
          <button
            type="button"
            onClick={() => {
              setAutoSpin(false);
              setRotY(-10);
              setRotX(5);
              setZoom(1);
            }}
            className="px-2 py-1 text-[10px] uppercase tracking-[0.1em] border border-[var(--hairline-strong)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
          >
            {labels?.reset ?? 'Markaz'}
          </button>
        </div>
      </div>

      {/* 3D Perspective Viewport */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-full overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing touch-none ${
          compact ? 'h-[330px] sm:h-[380px]' : 'h-[430px] sm:h-[510px]'
        }`}
        style={{
          perspective: '1150px',
          background:
            'radial-gradient(circle at 50% 30%, var(--paper-elevated) 0%, var(--paper-2) 68%, var(--paper) 100%)',
        }}
      >
        {/* Architectural studio grid backdrop lines */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--hairline) 1px, transparent 1px), linear-gradient(to bottom, var(--hairline) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />

        {!hasAny ? (
          <p className="relative z-10 text-xs uppercase tracking-[0.14em] text-[var(--muted)] px-4 text-center">
            {labels?.empty ?? '3D koʻrinish uchun kiyim tanlang'}
          </p>
        ) : (
          <div
            style={{
              transformStyle: 'preserve-3d',
              transform: `scale(${zoom}) rotateX(${rotX.toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg)`,
              transition: draggingRef.current.active ? 'none' : 'transform 160ms ease-out',
            }}
            className="relative w-[290px] sm:w-[340px] h-[300px] sm:h-[360px]"
          >
            {/* 3D Podium Ring & Ambient Floor Shadow */}
            <div
              aria-hidden="true"
              style={{
                transform: `translate3d(-50%, 0, ${-35 * zSpread}px) rotateX(78deg)`,
              }}
              className="absolute left-1/2 bottom-1 h-28 w-60 sm:w-72 rounded-full border-2 border-[var(--hairline-strong)] bg-[radial-gradient(circle,rgba(21,20,18,0.28)_0%,rgba(21,20,18,0.06)_55%,transparent_75%)] shadow-2xl pointer-events-none"
            />

            {/* LEFT WING: OUTERWEAR (Z: +22px) */}
            {outer && (
              <button
                type="button"
                onClick={() => onSelectSlot?.('outerwear')}
                style={{
                  transform: `translate3d(0, 0, ${22 * zSpread}px)`,
                }}
                title={outer.name_uz}
                className="absolute left-0 top-6 w-[44%] h-[64%] flex flex-col items-center justify-center p-1 cursor-pointer group"
              >
                <GarmentImage
                  garment={outer}
                  className="h-full w-full drop-shadow-[0_18px_20px_rgba(0,0,0,0.28)] group-hover:scale-105 transition-transform"
                  eager
                />
              </button>
            )}

            {/* CENTER AXIS: DRESS OR TOP + BOTTOM (Z: +46px / +34px) */}
            {dress ? (
              <button
                type="button"
                onClick={() => onSelectSlot?.('dress')}
                style={{
                  transform: `translate3d(-50%, 0, ${48 * zSpread}px)`,
                }}
                title={dress.name_uz}
                className="absolute left-1/2 top-4 w-[50%] h-[78%] flex items-center justify-center p-1 cursor-pointer group"
              >
                <GarmentImage
                  garment={dress}
                  className="h-full w-full drop-shadow-[0_22px_26px_rgba(0,0,0,0.3)] group-hover:scale-105 transition-transform"
                  eager
                />
              </button>
            ) : (
              <>
                {top && (
                  <button
                    type="button"
                    onClick={() => onSelectSlot?.('top')}
                    style={{
                      transform: `translate3d(-50%, 0, ${48 * zSpread}px)`,
                    }}
                    title={top.name_uz}
                    className="absolute left-1/2 top-2 w-[48%] h-[46%] flex items-center justify-center p-1 cursor-pointer group z-10"
                  >
                    <GarmentImage
                      garment={top}
                      className="h-full w-full drop-shadow-[0_20px_22px_rgba(0,0,0,0.28)] group-hover:scale-105 transition-transform"
                      eager
                    />
                  </button>
                )}
                {bottom && (
                  <button
                    type="button"
                    onClick={() => onSelectSlot?.('bottom')}
                    style={{
                      transform: `translate3d(-50%, 0, ${34 * zSpread}px)`,
                    }}
                    title={bottom.name_uz}
                    className="absolute left-1/2 top-[38%] w-[46%] h-[46%] flex items-center justify-center p-1 cursor-pointer group"
                  >
                    <GarmentImage
                      garment={bottom}
                      className="h-full w-full drop-shadow-[0_16px_18px_rgba(0,0,0,0.24)] group-hover:scale-105 transition-transform"
                      eager
                    />
                  </button>
                )}
              </>
            )}

            {/* PODIUM BASE: SHOES (Z: +58px) */}
            {shoes && (
              <button
                type="button"
                onClick={() => onSelectSlot?.('shoes')}
                style={{
                  transform: `translate3d(-50%, 0, ${58 * zSpread}px)`,
                }}
                title={shoes.name_uz}
                className="absolute left-1/2 bottom-1 w-[38%] h-[23%] flex items-center justify-center p-1 cursor-pointer group z-20"
              >
                <GarmentImage
                  garment={shoes}
                  className="h-full w-full drop-shadow-[0_14px_14px_rgba(0,0,0,0.34)] group-hover:scale-110 transition-transform"
                  eager
                />
              </button>
            )}

            {/* RIGHT WING: BAG (Z: +66px) */}
            {bag && (
              <button
                type="button"
                onClick={() => onSelectSlot?.('bag')}
                style={{
                  transform: `translate3d(0, 0, ${66 * zSpread}px)`,
                }}
                title={bag.name_uz}
                className="absolute right-0 bottom-[18%] w-[32%] h-[36%] flex items-center justify-center p-1 cursor-pointer group z-20"
              >
                <GarmentImage
                  garment={bag}
                  className="h-full w-full drop-shadow-[0_18px_20px_rgba(0,0,0,0.28)] group-hover:scale-105 transition-transform"
                  eager
                />
              </button>
            )}

            {/* FOREGROUND ORBIT: ACCESSORY 1 & 2 (Z: +78px) */}
            {acc1 && (
              <button
                type="button"
                onClick={() => onSelectSlot?.('accessory1')}
                style={{
                  transform: `translate3d(0, 0, ${78 * zSpread}px)`,
                }}
                title={acc1.name_uz}
                className="absolute left-2 bottom-[14%] w-[24%] h-[24%] flex items-center justify-center p-1 border border-[var(--hairline)]/70 bg-[var(--paper-elevated)]/75 backdrop-blur-xs shadow-md cursor-pointer group z-30"
              >
                <GarmentImage garment={acc1} className="h-full w-full group-hover:scale-110 transition-transform" />
              </button>
            )}

            {acc2 && (
              <button
                type="button"
                onClick={() => onSelectSlot?.('accessory2')}
                style={{
                  transform: `translate3d(0, 0, ${84 * zSpread}px)`,
                }}
                title={acc2.name_uz}
                className="absolute right-2 top-6 w-[24%] h-[24%] flex items-center justify-center p-1 border border-[var(--hairline)]/70 bg-[var(--paper-elevated)]/75 backdrop-blur-xs shadow-md cursor-pointer group z-30"
              >
                <GarmentImage garment={acc2} className="h-full w-full group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>
        )}

        {/* Zoom Slider Overlay */}
        <div className="absolute bottom-2.5 right-3 z-20 flex items-center gap-2 border border-[var(--hairline)] bg-[var(--paper)]/88 px-2.5 py-1 text-[10px]">
          <span className="text-[var(--muted)]">{Math.round(zoom * 100)}%</span>
          <input
            type="range"
            min={0.8}
            max={1.3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="3D Zoom"
            className="w-16 sm:w-20 accent-[var(--accent)] cursor-pointer"
          />
        </div>

        <span className="absolute bottom-2.5 left-3 z-20 text-[10px] text-[var(--muted)] pointer-events-none">
          {labels?.dragHint ?? '360° aylantirish uchun sudrang'}
        </span>
      </div>
    </div>
  );
}
