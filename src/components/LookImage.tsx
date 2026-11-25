import { useEffect, useRef, useState } from 'react';
import { resolveAssetUrl } from '../data/manifest-loader';
import type { Garment, Look, Palette } from '../data/schema';
import { useKapsulaStore } from '../store/useKapsulaStore';
import { GarmentSilhouette } from './GarmentSilhouette';

interface LookImageProps {
  look: Look;
  garments: Garment[];
  palette?: Palette;
  variant?: 'thumb' | 'full';
  className?: string;
  eager?: boolean;
}

/**
 * Renders an editorial 2:3 lookbook photo with graceful magazine-collage fallback
 * using detailed garment illustrations when WebP look photos are not yet supplied.
 */
export function LookImage({
  look,
  garments,
  palette,
  variant = 'thumb',
  className = '',
  eager = false,
}: LookImageProps) {
  const hasWebpAssets = useKapsulaStore((s) => s.hasWebpAssets);
  const srcPath = variant === 'full' ? look.image : look.thumb;
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setFailed(false);
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, [srcPath]);

  if (!hasWebpAssets || failed) {
    const bg0 = palette?.colors[0] ?? '#EEE8DB';
    const bg1 = palette?.colors[1] ?? '#E2D3BA';
    const inkColor = '#151412';
    const items = look.items
      .map((id) => garments.find((g) => g.id === id))
      .filter((g): g is Garment => Boolean(g));

    const mainOuter = items.find((g) => g.category === 'outerwear');
    const mainTop = items.find((g) => g.category === 'dress' || g.category === 'top');
    const mainBottom = items.find((g) => g.category === 'bottom');
    const mainShoes = items.find((g) => g.category === 'shoes');

    return (
      <div
        role="img"
        aria-label={look.title_uz}
        className={`@container relative aspect-[2/3] w-full overflow-hidden border border-[var(--hairline)] bg-[var(--paper-2)] ${className}`}
        style={{
          background: `linear-gradient(155deg, ${bg0} 0%, ${bg1} 100%)`,
        }}
      >
        <div className="absolute inset-2 @[140px]:inset-3 border border-[#151412]/15 pointer-events-none" />
        <div className="hidden @[140px]:flex absolute top-5 left-5 right-5 items-center justify-between text-[10px] tracking-[0.16em] uppercase text-[#151412]/70">
          <span>{look.id.toUpperCase()}</span>
          <span>{look.model === 'w' ? 'AYOL' : 'ERKAK'}</span>
        </div>

        <div className="absolute inset-x-3 @[140px]:inset-x-5 top-4 @[140px]:top-11 bottom-4 @[140px]:bottom-14 flex flex-col items-center justify-center gap-0.5">
          {(mainOuter || mainTop) && (
            <div className="relative w-full h-[46%] flex items-center justify-center">
              {mainOuter && (
                <div className="h-full w-[58%] overflow-hidden flex items-center justify-center">
                  <GarmentSilhouette
                    category={mainOuter.category}
                    color={mainOuter.color}
                    color2={mainOuter.color2}
                    garmentId={mainOuter.id}
                    nameHint={`${mainOuter.name_en} ${mainOuter.name_uz}`}
                    className="h-full w-auto max-h-full max-w-full"
                  />
                </div>
              )}
              {mainTop && (!mainOuter || mainTop.category === 'top') && (
                <div
                  className={`${
                    mainOuter ? 'w-[44%] -ml-5 mt-3' : 'w-[60%]'
                  } h-[88%] overflow-hidden flex items-center justify-center`}
                >
                  <GarmentSilhouette
                    category={mainTop.category}
                    color={mainTop.color}
                    color2={mainTop.color2}
                    garmentId={mainTop.id}
                    nameHint={`${mainTop.name_en} ${mainTop.name_uz}`}
                    className="h-full w-auto max-h-full max-w-full"
                  />
                </div>
              )}
            </div>
          )}
          {mainBottom && (
            <div className="w-[54%] h-[34%] -mt-2 overflow-hidden flex items-center justify-center">
              <GarmentSilhouette
                category={mainBottom.category}
                color={mainBottom.color}
                color2={mainBottom.color2}
                garmentId={mainBottom.id}
                nameHint={`${mainBottom.name_en} ${mainBottom.name_uz}`}
                className="h-full w-auto max-h-full max-w-full"
              />
            </div>
          )}
          {mainShoes && (
            <div className="w-[34%] h-[18%] overflow-hidden flex items-center justify-center">
              <GarmentSilhouette
                category={mainShoes.category}
                color={mainShoes.color}
                color2={mainShoes.color2}
                garmentId={mainShoes.id}
                nameHint={`${mainShoes.name_en} ${mainShoes.name_uz}`}
                className="h-full w-auto max-h-full max-w-full"
              />
            </div>
          )}
        </div>

        <div className="hidden @[140px]:flex absolute bottom-5 inset-x-5 items-end justify-between gap-2">
          <p className="font-editorial italic text-lg leading-tight" style={{ color: inkColor }}>
            {look.title_uz}
          </p>
          <div className="flex items-center gap-1">
            {(palette?.colors ?? []).slice(0, 4).map((hex) => (
              <span
                key={hex}
                className="inline-block h-2.5 w-2.5 rounded-full border border-[#151412]/20"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={resolveAssetUrl(srcPath)}
      alt={look.title_uz}
      width={look.w}
      height={look.h}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={`aspect-[2/3] w-full object-cover ${className}`}
    />
  );
}
