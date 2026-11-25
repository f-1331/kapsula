import { useTranslation } from '../i18n/useTranslation';

export function FooterSection() {
  const { t } = useTranslation();

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
              className="border border-[var(--hairline)] bg-[var(--paper-elevated)] p-5"
            >
              <span className="micro-label text-[var(--accent)] block mb-2">{step.num}</span>
              <h3 className="font-editorial text-2xl text-[var(--ink)] mb-2">{step.title}</h3>
              <p className="text-sm leading-relaxed text-[var(--ink-2)]">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--hairline)] pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[var(--muted)]">
          <p className="max-w-2xl leading-relaxed">{t.footer.aiDisclosure}</p>
          <p className="micro-label shrink-0 text-[var(--ink-2)]">{t.footer.colophon}</p>
        </div>
      </div>
    </footer>
  );
}
