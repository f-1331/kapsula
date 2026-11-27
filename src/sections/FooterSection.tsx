import { useState } from 'react';
import { CONTACT_INFO } from '../config/contact';
import { useTranslation } from '../i18n/useTranslation';
import { QrCodeCard } from '../components/QrCodeCard';
import { QrContactModal } from '../components/QrContactModal';

export function FooterSection() {
  const { t, localize } = useTranslation();
  const [qrModalOpen, setQrModalOpen] = useState(false);

  return (
    <footer className="bg-[var(--paper)] border-t border-[var(--hairline)]">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8 py-12 sm:py-16">
        <div className="mb-8 border-b border-[var(--hairline)] pb-4 flex items-baseline justify-between gap-4">
          <h2 className="font-editorial text-3xl sm:text-4xl text-[var(--ink)]">
            {t.footer.howItWorksTitle}
          </h2>
          <span className="font-editorial italic text-xl text-[var(--accent)]">
            {t.meta.brand}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-10">
          {t.footer.steps.map((step) => (
            <div
              key={step.num}
              className="card-3d-lift border border-[var(--hairline)] bg-[var(--paper-elevated)] p-5"
            >
              <span className="micro-label text-[var(--accent)] block mb-2">{step.num}</span>
              <h3 className="font-editorial text-2xl text-[var(--ink)] mb-2">{step.title}</h3>
              <p className="text-sm leading-relaxed text-[var(--ink-2)]">{step.body}</p>
            </div>
          ))}
        </div>

        {/* Contact & Live Scannable QR Suite */}
        <div className="panel-3d mb-10 border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 space-y-3">
            <span className="micro-label text-[var(--accent)] block">
              {localize('Aloqa · QR Skaner & Mobil Kirish')}
            </span>
            <h3 className="font-editorial text-2xl sm:text-3xl text-[var(--ink)] leading-tight">
              {localize('Telefon raqam va tezkor QR kodlar')}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--ink-2)] leading-relaxed">
              {localize(
                'Kamera orqali QR kodni skanerlab saytni telefoningizda darhol oching yoki stilist bilan toʻgʻridan-toʻgʻri bogʻlaning.',
              )}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href={CONTACT_INFO.phoneHref}
                className="min-h-[44px] inline-flex items-center gap-2 bg-[var(--ink)] px-4 py-2.5 text-sm font-medium text-[var(--paper)] hover:bg-[var(--accent)] transition-colors font-tabular"
              >
                <span aria-hidden="true">☎</span>
                <span>{CONTACT_INFO.phoneDisplay}</span>
              </a>

              <a
                href={CONTACT_INFO.botUrl}
                target="_blank"
                rel="noreferrer"
                className="min-h-[44px] inline-flex items-center border border-[var(--hairline-strong)] bg-[var(--paper)] px-4 py-2.5 text-xs uppercase tracking-[0.12em] text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
              >
                {CONTACT_INFO.botUsername}
              </a>

              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="min-h-[44px] inline-flex items-center border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-2.5 text-xs uppercase tracking-[0.12em] text-[var(--accent)] font-semibold hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] transition-colors cursor-pointer"
              >
                {localize('Joriy Obraz QR')}
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <QrCodeCard
              value={CONTACT_INFO.siteUrl}
              title="Sayt QR"
              subtitle="kapsulauz.vercel.app"
              size={104}
              compact
            />
            <QrCodeCard
              value={CONTACT_INFO.phoneQrPayload}
              title="Telefon QR"
              subtitle={CONTACT_INFO.phoneDisplay}
              size={104}
              compact
            />
            <div className="col-span-2 sm:col-span-1">
              <QrCodeCard
                value={CONTACT_INFO.botUrl}
                title="Telegram QR"
                subtitle={CONTACT_INFO.botUsername}
                size={104}
                compact
              />
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--hairline)] pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[var(--muted)]">
          <p className="max-w-2xl leading-relaxed">{t.footer.aiDisclosure}</p>
          <p className="micro-label shrink-0 text-[var(--ink-2)]">
            {t.footer.colophon} · {CONTACT_INFO.phoneDisplay}
          </p>
        </div>
      </div>

      <QrContactModal open={qrModalOpen} initialMode="outfit" onClose={() => setQrModalOpen(false)} />
    </footer>
  );
}
