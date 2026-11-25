import { useEffect, useRef, useState } from 'react';
import { resolveAssetUrl } from '../data/manifest-loader';
import type { Garment } from '../data/schema';
import { useKapsulaStore } from '../store/useKapsulaStore';
import { GarmentSilhouette } from './GarmentSilhouette';

interface GarmentImageProps {
  garment: Garment;
  className?: string;
  eager?: boolean;
}

/**
 * Renders transparent WebP garment cutout when asset images are present,
 * falling back cleanly (or instantaneously when WebP pack is absent) to
 * detailed 41-subtype editorial SVG garment illustrations.
 */
export function GarmentImage({ garment, className = '', eager = false }: GarmentImageProps) {
  const hasWebpAssets = useKapsulaStore((s) => s.hasWebpAssets);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setFailed(false);
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, [garment.image]);

  const isDataUrl = garment.image.startsWith('data:image/');

  if (isDataUrl && !failed) {
    return (
      <img
        ref={imgRef}
        src={garment.image}
        alt={garment.name_uz}
        width={garment.w}
        height={garment.h}
        draggable={false}
        onError={() => setFailed(true)}
        className={`object-cover rounded-sm border border-[var(--hairline)] select-none ${className}`}
      />
    );
  }

  if (!hasWebpAssets || failed) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center overflow-hidden ${className}`}
        role="img"
        aria-label={garment.name_uz}
      >
        <GarmentSilhouette
          category={garment.category}
          color={garment.color}
          color2={garment.color2}
          garmentId={garment.id}
          nameHint={`${garment.name_en} ${garment.name_uz}`}
          className="h-full w-auto max-h-full max-w-full garment-cutout p-1"
        />
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={resolveAssetUrl(garment.image)}
      alt={garment.name_uz}
      width={garment.w}
      height={garment.h}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      className={`object-contain garment-cutout select-none ${className}`}
    />
  );
}
