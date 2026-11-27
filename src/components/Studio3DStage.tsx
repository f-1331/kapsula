import { Suspense, lazy, useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import type { Garment } from '../data/schema';
import { getGarmentSpec } from '../engine/garment-specs';
import { render3DOutfitToCanvas, type RenderedHitBox } from '../engine/renderer3d';
import type { BoardSlots, SlotKey } from '../engine/stylist';
import { useTranslation } from '../i18n/useTranslation';
import { useKapsulaStore } from '../store/useKapsulaStore';
import { getDesignThemeById } from '../styles/themes';
import { GarmentImage } from './GarmentImage';

const ThreeStudioCanvas = lazy(() =>
  import('./ThreeStudioCanvas').then((mod) => ({ default: mod.ThreeStudioCanvas })),
);

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

function normalizeDeg(deg: number): number {
  const m = ((deg % 360) + 360) % 360;
  return Math.round(m);
}

/**
 * Interactive 3D Fashion Showroom.
 * Primary renderer uses lazy-loaded Three.js WebGL PBR materials & soft studio lighting;
 * automatically falls back cleanly to software Canvas3D or 3D SVG Layer inspection if needed.
 */
export function Studio3DStage({
  slots,
  byId,
  onSelectSlot,
  compact = false,
  labels,
}: Studio3DStageProps) {
  const { localize } = useTranslation();
  const designTheme = useKapsulaStore((s) => s.designTheme);
  const gender = useKapsulaStore((s) => s.query.gender);
  const accentHex = getDesignThemeById(designTheme).vars['--accent'];

  const [rotY, setRotY] = useState(24);
  const [rotX, setRotX] = useState(10);
  const [zoom, setZoom] = useState(1);
  const [autoSpin, setAutoSpin] = useState(true);
  const [continuousSpin, setContinuousSpin] = useState(false);
  const [depthView, setDepthView] = useState(false);
  const [renderMode, setRenderMode] = useState<'webgl' | 'cards'>('webgl');
  const [webglFailed, setWebglFailed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredInfo, setHoveredInfo] = useState<{
    slot: SlotKey;
    garment: Garment;
  } | null>(null);

  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hitBoxesRef = useRef<RenderedHitBox[]>([]);
  const pointerMovedRef = useRef(false);
  const liveYawRef = useRef(24);

  const draggingRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    baseRotY: number;
    baseRotX: number;
  }>({ active: false, startX: 0, startY: 0, baseRotY: 24, baseRotX: 10 });

  const outer = slots.outerwear ? byId.get(slots.outerwear) : undefined;
  const dress = slots.dress ? byId.get(slots.dress) : undefined;
  const top = slots.top ? byId.get(slots.top) : undefined;
  const bottom = slots.bottom ? byId.get(slots.bottom) : undefined;
  const shoes = slots.shoes ? byId.get(slots.shoes) : undefined;
  const bag = slots.bag ? byId.get(slots.bag) : undefined;
  const acc1 = slots.accessory1 ? byId.get(slots.accessory1) : undefined;
  const acc2 = slots.accessory2 ? byId.get(slots.accessory2) : undefined;
  const hasAny = Boolean(outer || dress || top || bottom || shoes || bag || acc1 || acc2);

  // Throttled turntable rotation only needed for Canvas2D/SVG fallback modes; WebGL spins natively without React re-renders
  const usingNativeWebGL = renderMode === 'webgl' && !webglFailed;
  useEffect(() => {
    if (usingNativeWebGL || !autoSpin || !hasAny) return;
    let rafId = 0;
    let lastTime = performance.now();
    let lastCommit = lastTime;
    const tick = (now: number) => {
      if (now - lastCommit >= 66) {
        const dt = Math.min(0.15, (now - lastTime) / 1000);
        lastTime = now;
        lastCommit = now;
        if (!draggingRef.current.active) {
          setRotY((prev) => {
            const next = (prev + dt * 24) % 360;
            liveYawRef.current = next;
            return next;
          });
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [usingNativeWebGL, autoSpin, hasAny]);

  // Software fallback canvas render if WebGL unavailable
  useEffect(() => {
    if (renderMode !== 'webgl' || !webglFailed || !hasAny) return;
    const canvas = fallbackCanvasRef.current;
    if (!canvas) return;
    hitBoxesRef.current = render3DOutfitToCanvas(canvas, {
      slots,
      byId,
      rotYDeg: rotY,
      rotXDeg: rotX,
      zoom,
      exploded: depthView,
      hoveredSlot: hoveredInfo?.slot ?? null,
    });
  }, [renderMode, webglFailed, hasAny, slots, byId, rotY, rotX, zoom, depthView, hoveredInfo?.slot]);

  const handleHoverSlot = useCallback((slot: SlotKey | null, garment: Garment | null) => {
    setHoveredInfo((prev) => {
      if (!slot || !garment) return prev === null ? null : null;
      if (prev && prev.slot === slot && prev.garment.id === garment.id) return prev;
      return { slot, garment };
    });
  }, []);

  const handleSelectSlot = useCallback(
    (slot: SlotKey) => {
      onSelectSlot?.(slot);
    },
    [onSelectSlot],
  );

  const handleUnavailable = useCallback(() => {
    setWebglFailed(true);
  }, []);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const startYaw = usingNativeWebGL ? liveYawRef.current : rotY;
    if (autoSpin) {
      setAutoSpin(false);
      setContinuousSpin(false);
      setRotY(startYaw);
    }
    setIsDragging(true);
    pointerMovedRef.current = false;
    draggingRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      baseRotY: startYaw,
      baseRotX: rotX,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if capture unsupported
    }
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current.active) return;
    const dx = e.clientX - draggingRef.current.startX;
    const dy = e.clientY - draggingRef.current.startY;
    if (Math.hypot(dx, dy) > 4) pointerMovedRef.current = true;
    const nextYaw = draggingRef.current.baseRotY + dx * 0.55;
    liveYawRef.current = nextYaw;
    setRotY(nextYaw);
    setRotX(Math.max(-24, Math.min(38, draggingRef.current.baseRotX + dy * 0.3)));
  };

  const handlePointerUp = () => {
    draggingRef.current.active = false;
    setIsDragging(false);
  };

  const toggleSpin = () => {
    if (autoSpin) {
      setRotY(normalizeDeg(liveYawRef.current));
      setAutoSpin(false);
      setContinuousSpin(false);
    } else {
      setContinuousSpin(true);
      setAutoSpin(true);
    }
  };

  // Gently settle initial showcase spin after 6.5s unless user toggled continuous 360° rotation
  useEffect(() => {
    if (!autoSpin || continuousSpin || !hasAny) return;
    const id = window.setTimeout(() => {
      setRotY(normalizeDeg(liveYawRef.current));
      setAutoSpin(false);
    }, 6500);
    return () => window.clearTimeout(id);
  }, [autoSpin, continuousSpin, hasAny]);

  const zSpread = depthView ? 1.8 : 1;
  const yawDisplay = normalizeDeg(rotY);
  const hoveredSpec = hoveredInfo ? getGarmentSpec(hoveredInfo.garment) : null;

  return (
    <div className="panel-3d relative border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] overflow-hidden select-none">
      {/* Studio Controls Header */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--hairline)] bg-[var(--paper)]/94 px-3 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--accent)] font-semibold font-tabular">
            <span
              className={`h-2 w-2 rounded-full bg-[var(--accent)] ${autoSpin ? '' : 'opacity-65'}`}
              aria-hidden="true"
            />
            {autoSpin ? 'WebGL 3D · 360°' : `WebGL 3D · ${yawDisplay}°`}
          </span>
          <div className="inline-flex border border-[var(--hairline)] bg-[var(--paper-2)] p-0.5">
            <button
              type="button"
              onClick={() => setRenderMode('webgl')}
              className={`px-2 py-0.5 text-[9px] uppercase tracking-[0.08em] cursor-pointer ${
                renderMode === 'webgl'
                  ? 'bg-[var(--ink)] text-[var(--paper)] font-semibold'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              3D Sahna
            </button>
            <button
              type="button"
              onClick={() => setRenderMode('cards')}
              className={`px-2 py-0.5 text-[9px] uppercase tracking-[0.08em] cursor-pointer ${
                renderMode === 'cards'
                  ? 'bg-[var(--ink)] text-[var(--paper)] font-semibold'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              SVG Qatlam
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={toggleSpin}
            className={`px-2 py-1 text-[10px] uppercase tracking-[0.08em] border cursor-pointer transition-colors ${
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
            className={`px-2 py-1 text-[10px] uppercase tracking-[0.08em] border cursor-pointer transition-colors ${
              depthView
                ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                : 'border-[var(--hairline-strong)] bg-[var(--paper)] text-[var(--ink)]'
            }`}
          >
            {labels?.layers ?? 'Ajratish'}
          </button>
          <button
            type="button"
            onClick={() => {
              setAutoSpin(false);
              setContinuousSpin(false);
              liveYawRef.current = 24;
              setRotY(24);
              setRotX(10);
              setZoom(1);
            }}
            className="px-2 py-1 text-[10px] uppercase tracking-[0.08em] border border-[var(--hairline-strong)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
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
        onPointerLeave={() => setHoveredInfo(null)}
        className={`relative w-full overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing touch-none ${
          compact ? 'h-[350px] sm:h-[400px]' : 'h-[450px] sm:h-[530px]'
        }`}
        style={{
          perspective: '1150px',
          background:
            'radial-gradient(ellipse at 50% 24%, var(--paper-elevated) 0%, var(--paper-2) 66%, var(--paper) 100%)',
        }}
      >
        {/* Spatial perspective grid floor */}
        <div
          aria-hidden="true"
          className="studio-perspective-grid pointer-events-none absolute inset-x-[-20%] bottom-[-10%] h-[55%] opacity-30"
        />

        {!hasAny ? (
          <p className="relative z-10 text-xs uppercase tracking-[0.14em] text-[var(--muted)] px-4 text-center">
            {labels?.empty ?? '3D koʻrinish uchun kiyim tanlang'}
          </p>
        ) : renderMode === 'webgl' ? (
          webglFailed ? (
            <canvas
              ref={fallbackCanvasRef}
              className="relative z-10 h-full w-full block"
              aria-label="3D garment preview fallback"
            />
          ) : (
            <Suspense
              fallback={
                <div className="relative z-10 flex flex-col items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                  <span className="h-6 w-6 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                  <span>WebGL 3D...</span>
                </div>
              }
            >
              <ThreeStudioCanvas
                slots={slots}
                byId={byId}
                rotYDeg={rotY}
                rotXDeg={rotX}
                zoom={zoom}
                exploded={depthView}
                autoSpin={autoSpin}
                hoveredSlot={hoveredInfo?.slot ?? null}
                accentHex={accentHex}
                gender={gender}
                liveYawRef={liveYawRef}
                onHoverSlot={handleHoverSlot}
                onSelectSlot={handleSelectSlot}
                onUnavailable={handleUnavailable}
              />
            </Suspense>
          )
        ) : (
          <div
            style={{
              transformStyle: 'preserve-3d',
              transform: `scale(${zoom}) rotateX(${(-rotX).toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg)`,
              transition: isDragging ? 'none' : 'transform 160ms ease-out',
            }}
            className="relative w-[290px] sm:w-[340px] h-[300px] sm:h-[360px]"
          >
            <div
              aria-hidden="true"
              style={{
                transform: `translate3d(-50%, 0, ${-35 * zSpread}px) rotateX(78deg)`,
              }}
              className="absolute left-1/2 bottom-1 h-28 w-60 sm:w-72 rounded-full border-2 border-[var(--hairline-strong)] bg-[radial-gradient(circle,rgba(21,20,18,0.28)_0%,rgba(21,20,18,0.06)_55%,transparent_75%)] shadow-2xl pointer-events-none"
            />

            {outer && (
              <button
                type="button"
                onClick={() => onSelectSlot?.('outerwear')}
                style={{ transform: `translate3d(0, 0, ${22 * zSpread}px)` }}
                title={localize(outer.name_uz)}
                className="absolute left-0 top-6 w-[44%] h-[64%] flex flex-col items-center justify-center p-1 cursor-pointer group"
              >
                <GarmentImage
                  garment={outer}
                  className="h-full w-full drop-shadow-[0_18px_20px_rgba(0,0,0,0.28)] group-hover:scale-105 transition-transform"
                  eager
                />
              </button>
            )}

            {dress ? (
              <button
                type="button"
                onClick={() => onSelectSlot?.('dress')}
                style={{ transform: `translate3d(-50%, 0, ${48 * zSpread}px)` }}
                title={localize(dress.name_uz)}
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
                    style={{ transform: `translate3d(-50%, 0, ${48 * zSpread}px)` }}
                    title={localize(top.name_uz)}
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
                    style={{ transform: `translate3d(-50%, 0, ${34 * zSpread}px)` }}
                    title={localize(bottom.name_uz)}
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

            {shoes && (
              <button
                type="button"
                onClick={() => onSelectSlot?.('shoes')}
                style={{ transform: `translate3d(-50%, 0, ${58 * zSpread}px)` }}
                title={localize(shoes.name_uz)}
                className="absolute left-1/2 bottom-1 w-[38%] h-[23%] flex items-center justify-center p-1 cursor-pointer group z-20"
              >
                <GarmentImage
                  garment={shoes}
                  className="h-full w-full drop-shadow-[0_14px_14px_rgba(0,0,0,0.34)] group-hover:scale-110 transition-transform"
                  eager
                />
              </button>
            )}

            {bag && (
              <button
                type="button"
                onClick={() => onSelectSlot?.('bag')}
                style={{ transform: `translate3d(0, 0, ${66 * zSpread}px)` }}
                title={localize(bag.name_uz)}
                className="absolute right-0 bottom-[18%] w-[32%] h-[36%] flex items-center justify-center p-1 cursor-pointer group z-20"
              >
                <GarmentImage
                  garment={bag}
                  className="h-full w-full drop-shadow-[0_18px_20px_rgba(0,0,0,0.28)] group-hover:scale-105 transition-transform"
                  eager
                />
              </button>
            )}

            {acc1 && (
              <button
                type="button"
                onClick={() => onSelectSlot?.('accessory1')}
                style={{ transform: `translate3d(0, 0, ${78 * zSpread}px)` }}
                title={localize(acc1.name_uz)}
                className="absolute left-2 bottom-[14%] w-[24%] h-[24%] flex items-center justify-center p-1 border border-[var(--hairline)]/70 bg-[var(--paper-elevated)]/75 backdrop-blur-xs shadow-md cursor-pointer group z-30"
              >
                <GarmentImage garment={acc1} className="h-full w-full group-hover:scale-110 transition-transform" />
              </button>
            )}

            {acc2 && (
              <button
                type="button"
                onClick={() => onSelectSlot?.('accessory2')}
                style={{ transform: `translate3d(0, 0, ${84 * zSpread}px)` }}
                title={localize(acc2.name_uz)}
                className="absolute right-2 top-6 w-[24%] h-[24%] flex items-center justify-center p-1 border border-[var(--hairline)]/70 bg-[var(--paper-elevated)]/75 backdrop-blur-xs shadow-md cursor-pointer group z-30"
              >
                <GarmentImage garment={acc2} className="h-full w-full group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>
        )}

        {/* Hovered 3D Mesh Tooltip with Fabric & Estimated Price */}
        {hoveredInfo && hoveredSpec && (
          <div className="pointer-events-none absolute top-3 left-3 z-20 border border-[var(--ink)] bg-[var(--paper)]/96 px-3 py-1.5 text-[11px] shadow-lg max-w-[260px]">
            <div className="font-medium text-[var(--ink)] truncate">
              {localize(hoveredInfo.garment.name_uz)}
              {hoveredInfo.garment.brand ? (
                <span className="ml-1.5 text-[10px] text-[var(--accent)]">
                  · {hoveredInfo.garment.brand}
                </span>
              ) : null}
            </div>
            <div className="text-[10px] text-[var(--muted)] truncate mt-0.5">
              {localize(hoveredSpec.fabricUz)} · {localize(hoveredSpec.priceLabelUz)}
            </div>
          </div>
        )}

      </div>

      {/* Camera Angle Presets & Zoom Studio Bar — dedicated bar prevents overlap on narrow mobile screens */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--hairline)] bg-[var(--paper)]/94 px-3 py-2 backdrop-blur-sm">
        {hasAny ? (
          <div className="flex flex-wrap items-center gap-1">
            {(
              [
                { label: 'Old', yaw: 0, pitch: 8 },
                { label: '3/4', yaw: 34, pitch: 12 },
                { label: 'Yon', yaw: 88, pitch: 10 },
                { label: 'Orqa', yaw: 180, pitch: 12 },
                { label: 'Podium', yaw: 28, pitch: 26 },
              ] as const
            ).map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setAutoSpin(false);
                  setContinuousSpin(false);
                  liveYawRef.current = preset.yaw;
                  setRotY(preset.yaw);
                  setRotX(preset.pitch);
                }}
                className="px-2 py-0.5 text-[10px] border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] text-[var(--ink-2)] hover:border-[var(--ink)] hover:text-[var(--ink)] cursor-pointer transition-colors"
              >
                {localize(preset.label)}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}

        <div className="ml-auto flex items-center gap-2 border border-[var(--hairline)] bg-[var(--paper-elevated)] px-2.5 py-1 text-[10px]">
          <span className="font-tabular text-[var(--muted)]">{Math.round(zoom * 100)}%</span>
          <input
            type="range"
            min={0.75}
            max={1.45}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="3D Zoom"
            className="w-20 sm:w-24 accent-[var(--accent)] cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
