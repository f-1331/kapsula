import { useEffect, useRef, useState } from 'react';
import { resolveAssetUrl } from '../data/manifest-loader';
import type { Palette } from '../data/schema';
import { useKapsulaStore } from '../store/useKapsulaStore';

interface PaletteArtworkProps {
  palette: Palette;
  className?: string;
}

/**
 * Renders palette.image when WebP assets exist, or an editorial fabric-swatch
 * composition in the palette's signature 5 tones.
 */
export function PaletteArtwork({ palette, className = '' }: PaletteArtworkProps) {
  const hasWebpAssets = useKapsulaStore((s) => s.hasWebpAssets);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setFailed(false);
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, [palette.image]);

  if (!hasWebpAssets || failed) {
    const [c0 = '#F4EFE6', c1 = '#E2D3BA', c2 = '#C4A27A', c3 = '#8B6B4F', c4 = '#2F2A26'] =
      palette.colors;
    return (
      <div
        className={`relative w-full h-full overflow-hidden ${className}`}
        style={{ backgroundColor: c0 }}
        aria-hidden="true"
      >
        <div className="absolute inset-x-0 top-0 h-[56%]" style={{ backgroundColor: c1 }} />
        <div
          className="absolute left-[14%] right-[14%] top-[18%] bottom-[16%] border border-[#151412]/15"
          style={{ backgroundColor: c2 }}
        />
        <div
          className="absolute left-[28%] right-[10%] top-[36%] bottom-[10%] border border-[#151412]/20"
          style={{ backgroundColor: c3 }}
        />
        <div
          className="absolute right-[12%] top-[12%] h-7 w-7 border border-white/40"
          style={{ backgroundColor: c4 }}
        />
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={resolveAssetUrl(palette.image)}
      alt={palette.name_uz}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
