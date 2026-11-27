import { useEffect, useState } from 'react';
import { CONTACT_INFO } from '../config/contact';
import { useTranslation } from '../i18n/useTranslation';
import { useKapsulaStore } from '../store/useKapsulaStore';
import { QrCodeCard } from './QrCodeCard';

interface QrContactModalProps {
  open: boolean;
  initialMode?: 'site' | 'outfit' | 'phone' | 'telegram';
  customUrl?: string;
  customTitle?: string;
  onClose: () => void;
}

export function QrContactModal({
  open,
  initialMode = 'outfit',
  customUrl,
  customTitle,
  onClose,
}: QrContactModalProps) {
  const { localize } = useTranslation();
  const buildShareUrl = useKapsulaStore((s) => s.buildShareUrl);
  const [mode, setMode] = useState<'site' | 'outfit' | 'phone' | 'telegram'>(initialMode);

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const outfitUrl = customUrl || buildShareUrl();

  const payloadMap = {
    outfit: {
      value: outfitUrl,
      title: customTitle || 'Joriy 3D Obraz QR',
      subtitle: 'Telefon kamerasi bilan skanerlab oching',
      file: 'kapsula-obraz-qr',
    },
    site: {
      value: CONTACT_INFO.siteUrl,
      title: 'Kapsula Web Ilova',
      subtitle: CONTACT_INFO.siteUrl,
      file: 'kapsula-sayt-qr',
    },
    phone: {
      value: CONTACT_INFO.phoneQrPayload,
      title: `Qoʻngʻiroq: ${CONTACT_INFO.phoneDisplay}`,
      subtitle: 'Kamerada ochib qoʻngʻiroq qiling',
      file: 'kapsula-aloqa-qr',
    },
    telegram: {
      value: CONTACT_INFO.botUrl,
      title: `Telegram Bot ${CONTACT_INFO.botUsername}`,
      subtitle: 'Mini App va tezkor ob-havo boti',
      file: 'kapsula-telegram-qr',
    },
  } as const;

  const activeData = payloadMap[mode];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={localize('QR Kod va Aloqa markazi')}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-black/75 backdrop-blur-sm p-3 sm:p-6"
    >
      <div
        style={{ backgroundColor: 'var(--paper-elevated)' }}
        className="panel-3d relative my-auto w-full max-w-lg border border-[var(--ink)] bg-[var(--paper-elevated)] p-5 sm:p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--hairline)] pb-3 mb-4">
          <div>
            <span className="micro-label text-[var(--accent)] block">QR &amp; ALOQA MARKAZI</span>
            <h3 className="font-editorial text-2xl sm:text-3xl text-[var(--ink)] leading-tight mt-0.5">
              {localize('Skanerlang yoki qoʻngʻiroq qiling')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="min-h-[40px] min-w-[40px] border border-[var(--hairline-strong)] bg-[var(--paper)] text-base text-[var(--ink)] hover:border-[var(--ink)] cursor-pointer shrink-0"
          >
            ×
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-5">
          {(
            [
              { id: 'outfit', label: 'Obraz QR' },
              { id: 'site', label: 'Sayt QR' },
              { id: 'phone', label: 'Telefon QR' },
              { id: 'telegram', label: 'Telegram' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMode(tab.id)}
              className={`min-h-[38px] px-2 text-[11px] uppercase tracking-[0.08em] border cursor-pointer transition-colors ${
                mode === tab.id
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)] font-semibold'
                  : 'border-[var(--hairline)] bg-[var(--paper)] text-[var(--ink-2)] hover:border-[var(--ink)]'
              }`}
            >
              {localize(tab.label)}
            </button>
          ))}
        </div>

        <div className="max-w-[260px] mx-auto mb-5">
          <QrCodeCard
            value={activeData.value}
            title={activeData.title}
            subtitle={activeData.subtitle}
            size={180}
            downloadName={activeData.file}
          />
        </div>

        {/* Direct Phone & Telegram Quick Action Bar */}
        <div className="border-t border-[var(--hairline)] pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              {localize('Bevosita aloqa / Stilist raqami')}
            </p>
            <a
              href={CONTACT_INFO.phoneHref}
              className="font-numeral text-xl font-semibold text-[var(--ink)] hover:text-[var(--accent)] transition-colors"
            >
              {CONTACT_INFO.phoneDisplay}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={CONTACT_INFO.phoneHref}
              className="min-h-[40px] flex-1 sm:flex-none inline-flex items-center justify-center bg-[var(--ink)] px-4 text-xs uppercase tracking-[0.12em] text-[var(--paper)] hover:bg-[var(--accent)] transition-colors"
            >
              {localize('Qoʻngʻiroq')}
            </a>
            <a
              href={CONTACT_INFO.botUrl}
              target="_blank"
              rel="noreferrer"
              className="min-h-[40px] flex-1 sm:flex-none inline-flex items-center justify-center border border-[var(--hairline-strong)] bg-[var(--paper)] px-3 text-xs uppercase tracking-[0.12em] text-[var(--ink)] hover:border-[var(--ink)]"
            >
              Telegram
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
