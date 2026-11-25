import { useEffect, useRef, useState } from 'react';
import { resolveAssetUrl } from '../data/manifest-loader';
import type { Palette } from '../data/schema';
import { useKapsulaStore } from '../store/useKapsulaStore';

interface PaletteArtworkProps {
  palette: Palette;
  className?: string;
}

/**
 * Renders 3D layered textile swatch stack with perspective shadows across all 16 palettes.
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
        style={{ backgroundColor: c0, perspective: '500px' }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-x-0 top-0 h-[56%]"
          style={{
            background: `linear-gradient(155deg, ${c1} 0%, ${c0} 100%)`,
          }}
        />
        <div
          className="absolute left-[14%] right-[14%] top-[16%] bottom-[16%] border border-[#151412]/15 shadow-[0_12px_20px_rgba(0,0,0,0.22)]"
          style={{
            background: `linear-gradient(135deg, ${c2} 0%, ${c2}dd 100%)`,
            transform: 'rotateY(-6deg) rotateX(3deg)',
          }}
        />
        <div
          className="absolute left-[28%] right-[10%] top-[36%] bottom-[10%] border border-[#151412]/22 shadow-[0_14px_24px_rgba(0,0,0,0.3)]"
          style={{
            background: `linear-gradient(135deg, ${c3} 0%, ${c4}cc 100%)`,
            transform: 'rotateY(5deg) rotateX(-2deg)',
          }}
        />
        <div
          className="absolute right-[12%] top-[12%] h-7 w-7 border border-white/50 shadow-md"
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
