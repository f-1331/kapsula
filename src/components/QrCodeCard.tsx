import { useEffect, useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';

interface QrCodeCardProps {
  value: string;
  title: string;
  subtitle?: string;
  size?: number;
  downloadName?: string;
  compact?: boolean;
}

/**
 * Generates an ISO/IEC 18004 standard SVG QR code asynchronously via lazy-loaded `qrcode` chunk.
 * Always keeps a high-contrast light cell backing so physical phone cameras scan accurately in any theme.
 */
export function QrCodeCard({
  value,
  title,
  subtitle,
  size = 148,
  downloadName = 'kapsula-qr',
  compact = false,
}: QrCodeCardProps) {
  const { localize } = useTranslation();
  const [svgMarkup, setSvgMarkup] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    void import('qrcode').then((QR) => {
      QR.toString(
        value || 'https://kapsulauz.vercel.app',
        {
          type: 'svg',
          margin: 2,
          width: size,
          color: { dark: '#151412', light: '#FFFFFF' },
          errorCorrectionLevel: 'M',
        },
        (err, str) => {
          if (active && !err && str) {
            setSvgMarkup(str);
          }
        },
      );
    });
    return () => {
      active = false;
    };
  }, [value, size]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard restriction
    }
  };

  const handleDownloadPng = async () => {
    try {
      const QR = await import('qrcode');
      const dataUrl = await QR.toDataURL(value, {
        width: 512,
        margin: 2,
        color: { dark: '#151412', light: '#FFFFFF' },
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${downloadName}.png`;
      a.click();
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={`card-3d-lift border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] ${
        compact ? 'p-3' : 'p-4'
      } flex flex-col items-center text-center gap-2.5`}
    >
      <div
        className="bg-white p-2 border border-[#151412]/15 shadow-sm flex items-center justify-center"
        style={{ width: size + 16, height: size + 16 }}
        aria-label={`${localize(title)} QR Code`}
      >
        {svgMarkup ? (
          <div
            className="[&>svg]:block [&>svg]:w-full [&>svg]:h-full"
            style={{ width: size, height: size }}
            dangerouslySetInnerHTML={{ __html: svgMarkup }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-[10px] text-[#655E53]">
            QR...
          </div>
        )}
      </div>

      <div className="min-w-0 w-full">
        <p className="text-xs font-semibold text-[var(--ink)] truncate">{localize(title)}</p>
        {subtitle && (
          <p className="text-[11px] text-[var(--muted)] truncate mt-0.5">{localize(subtitle)}</p>
        )}
      </div>

      {!compact && (
        <div className="flex items-center gap-1.5 w-full">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 min-h-[34px] border border-[var(--hairline-strong)] bg-[var(--paper)] px-2 text-[10px] uppercase tracking-[0.08em] text-[var(--ink)] hover:border-[var(--ink)] cursor-pointer"
          >
            {copied ? localize('Nusxalandi ✓') : localize('Nusxalash')}
          </button>
          <button
            type="button"
            onClick={handleDownloadPng}
            className="flex-1 min-h-[34px] border border-[var(--ink)] bg-[var(--ink)] px-2 text-[10px] uppercase tracking-[0.08em] text-[var(--paper)] hover:bg-[var(--accent)] cursor-pointer"
          >
            {localize('PNG saqlash')}
          </button>
        </div>
      )}
    </div>
  );
}
