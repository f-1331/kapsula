import type { WeatherBand } from '../data/schema';

interface WeatherIconProps {
  kind: WeatherBand | 'rain';
  className?: string;
}

/**
 * Thin-stroke custom editorial SVG weather icons (1.25px stroke).
 */
export function WeatherIcon({ kind, className = 'h-6 w-6' }: WeatherIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {kind === 'hot' && (
        <>
          <circle cx="12" cy="12" r="4.25" />
          <path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
        </>
      )}
      {kind === 'warm' && (
        <>
          <path d="M12 4.5v1.6M6.7 6.7l1.1 1.1M17.3 6.7l-1.1 1.1M5.5 12h-1.6" />
          <path d="M8.5 12a3.5 3.5 0 0 1 6.7-1.4" />
          <path d="M7 17.5h9.5a3 3 0 0 0 .4-5.97 4.25 4.25 0 0 0-8.1-.9A2.9 2.9 0 0 0 7 17.5Z" />
        </>
      )}
      {kind === 'cool' && (
        <>
          <path d="M4 10h11.5a2.5 2.5 0 1 0-2.4-3.2" />
          <path d="M3 14h14.5a2.25 2.25 0 1 1-2.1 3" />
          <path d="M6 18h6.5" />
        </>
      )}
      {kind === 'cold' && (
        <>
          <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
          <path d="M10 4.5 12 6.5 14 4.5M10 19.5 12 17.5 14 19.5" />
          <path d="M5.5 10.5 7 9 6 7M18.5 13.5 17 15l1 2" />
        </>
      )}
      {kind === 'rain' && (
        <>
          <path d="M6.5 14.5h10.2a3.1 3.1 0 0 0 .35-6.18 4.6 4.6 0 0 0-8.84-1.02A3 3 0 0 0 6.5 14.5Z" />
          <path d="M8.5 17.5l-1 2.8M12.5 17.5l-1 2.8M16.5 17.5l-1 2.8" />
        </>
      )}
    </svg>
  );
}
