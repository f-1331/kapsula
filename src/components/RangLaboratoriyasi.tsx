import * as m from 'motion/react-m';
import type { HarmonyAnalysis } from '../engine/color';
import { COLOR_CONFIG } from '../engine/config';
import { useTranslation } from '../i18n/useTranslation';
import { ScoreCounter } from './ScoreCounter';

interface RangLaboratoriyasiProps {
  analysis: HarmonyAnalysis;
  extraTips?: string[];
  compact?: boolean;
}

const CX = 110;
const CY = 110;
const WHEEL_MIN_R = 30;
const WHEEL_MAX_R = 86;

function polarToCartesian(hueDeg: number, radius: number) {
  // 0 deg at top (12 o'clock)
  const rad = ((hueDeg - 90) * Math.PI) / 180;
  return {
    x: CX + Math.cos(rad) * radius,
    y: CY + Math.sin(rad) * radius,
  };
}

/**
 * Shared OKLCH Color Harmony Panel powering both #atelye right column and #ranglar calculator.
 */
export function RangLaboratoriyasi({
  analysis,
  extraTips = [],
  compact = false,
}: RangLaboratoriyasiProps) {
  const { t, localize } = useTranslation();
  const isEmpty = analysis.proportions.length === 0;
  const allTips = Array.from(new Set([...analysis.tips, ...extraTips])).slice(0, 3);

  const clusterPoints = analysis.hueClusters.map((hue) => polarToCartesian(hue, 66));

  const breakdownRows: Array<{
    key: string;
    label: string;
    value: number | null;
    max: number;
  }> = [
    {
      key: 'hue',
      label: t.colorLab.breakdown.hueHarmony,
      value: analysis.breakdown.hueHarmony,
      max: COLOR_CONFIG.weights.hueHarmonyMax,
    },
    {
      key: 'lightness',
      label: t.colorLab.breakdown.lightness,
      value: analysis.breakdown.lightnessStructure,
      max: COLOR_CONFIG.weights.lightnessStructureMax,
    },
    {
      key: 'balance',
      label: t.colorLab.breakdown.balance,
      value: analysis.breakdown.statementBalance,
      max: COLOR_CONFIG.weights.statementBalanceMax,
    },
    {
      key: 'temp',
      label: t.colorLab.breakdown.temperature,
      value: analysis.breakdown.warmCoolCoherence,
      max: COLOR_CONFIG.weights.warmCoolCoherenceMax,
    },
    {
      key: 'palette',
      label: t.colorLab.breakdown.paletteFit,
      value: analysis.breakdown.paletteFit,
      max: COLOR_CONFIG.weights.paletteFitMax,
    },
  ];

  // Subtle OKLCH perimeter reference ticks every 30°
  const perimeterTicks = Array.from({ length: 12 }, (_, idx) => {
    const hue = idx * 30;
    const pt = polarToCartesian(hue, 94);
    return { hue, x: pt.x, y: pt.y };
  });

  return (
    <div className="border border-[var(--hairline-strong)] bg-[var(--paper-elevated)] p-4 sm:p-6">
      <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-3 mb-4">
        <h3 className="micro-label text-[var(--ink)]">{t.colorLab.heading}</h3>
        <span className="micro-label text-[var(--muted)]">{localize(analysis.schemeName)}</span>
      </div>

      {isEmpty ? (
        <p className="py-10 text-center text-sm text-[var(--muted)]">{t.colorLab.emptyLab}</p>
      ) : (
        <div className="space-y-5">
          {/* Score Header */}
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-2.5">
              <ScoreCounter
                value={analysis.score}
                className="text-5xl sm:text-6xl leading-none text-[var(--accent)]"
              />
              <span className="text-xs text-[var(--muted)]">/ 100 {t.colorLab.scoreUnit}</span>
            </div>
            <span className="border border-[var(--hairline-strong)] bg-[var(--paper)] px-2.5 py-1 micro-label text-[var(--ink)]">
              {localize(analysis.label)}
            </span>
          </div>

          {/* SVG OKLCH Hue Wheel */}
          <div className="flex flex-col items-center border border-[var(--hairline)] bg-[var(--paper)]/70 p-3">
            <span className="micro-label text-[var(--muted)] self-start mb-1">
              {t.colorLab.wheelTitle}
            </span>
            <svg
              viewBox="0 0 220 220"
              className={compact ? 'w-40 h-40' : 'w-48 h-48 sm:w-52 sm:h-52'}
              role="img"
              aria-label={`${t.colorLab.wheelTitle}: ${localize(analysis.schemeName)}`}
            >
              {/* Concentric rings */}
              <circle
                cx={CX}
                cy={CY}
                r={WHEEL_MAX_R}
                fill="none"
                stroke="var(--hairline-strong)"
                strokeWidth="1"
              />
              <circle
                cx={CX}
                cy={CY}
                r={58}
                fill="none"
                stroke="var(--hairline)"
                strokeWidth="0.75"
                strokeDasharray="2 3"
              />
              {/* Neutral center hub */}
              <circle
                cx={CX}
                cy={CY}
                r={24}
                fill="var(--paper-2)"
                stroke="var(--hairline-strong)"
                strokeWidth="1"
              />

              {/* Perimeter OKLCH reference dots */}
              {perimeterTicks.map((t) => (
                <circle
                  key={t.hue}
                  cx={t.x}
                  cy={t.y}
                  r="3"
                  fill={`oklch(0.68 0.14 ${t.hue})`}
                  opacity="0.8"
                />
              ))}

              {/* Scheme polygon / lines */}
              {clusterPoints.length === 2 && (
                <m.line
                  x1={clusterPoints[0]!.x}
                  y1={clusterPoints[0]!.y}
                  x2={clusterPoints[1]!.x}
                  y2={clusterPoints[1]!.y}
                  stroke="var(--accent)"
                  strokeWidth="1.25"
                  strokeDasharray="3 2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
              {clusterPoints.length >= 3 && (
                <m.polygon
                  points={clusterPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                  fill="var(--accent-soft)"
                  stroke="var(--accent)"
                  strokeWidth="1.25"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}

              {/* Plotted colors: neutrals inside center hub, hues on wheel */}
              {analysis.wheelDots.map((dot, idx) => {
                const isNeutral = dot.role === 'neutral' || dot.h === null;
                let pos: { x: number; y: number };
                if (isNeutral) {
                  const angle = (idx * 72 * Math.PI) / 180;
                  const r = idx === 0 ? 0 : 12;
                  pos = { x: CX + Math.cos(angle) * r, y: CY + Math.sin(angle) * r };
                } else {
                  const radius =
                    WHEEL_MIN_R + Math.min(1, dot.c / 0.24) * (WHEEL_MAX_R - WHEEL_MIN_R);
                  pos = polarToCartesian(dot.h!, radius);
                }

                const dotR = isNeutral ? 5.5 : Math.max(5.5, Math.min(9.5, 5 + dot.weight * 12));

                return (
                  <m.circle
                    key={`${dot.hex}-${idx}`}
                    cx={pos.x}
                    cy={pos.y}
                    r={dotR}
                    fill={dot.hex}
                    stroke="var(--paper-elevated)"
                    strokeWidth="1.75"
                    initial={false}
                    animate={{ cx: pos.x, cy: pos.y }}
                    transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                  >
                    <title>{dot.hex}</title>
                  </m.circle>
                );
              })}
            </svg>
          </div>

          {/* 60-30-10 Proportion Bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="micro-label text-[var(--muted)]">
                {t.colorLab.proportionsTitle}
              </span>
            </div>
            <div className="flex h-3 w-full overflow-hidden border border-[var(--hairline-strong)] mb-2.5">
              {analysis.proportions.map((slice) => (
                <div
                  key={slice.hex}
                  style={{
                    width: `${Math.max(3, Math.round(slice.share * 100))}%`,
                    backgroundColor: slice.hex,
                  }}
                  title={`${slice.hex} (${Math.round(slice.share * 100)}%)`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {analysis.proportions.map((slice) => (
                <span
                  key={slice.hex}
                  className="inline-flex items-center gap-1.5 text-[11px] text-[var(--ink-2)] font-tabular"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-[var(--ink)]/20"
                    style={{ backgroundColor: slice.hex }}
                  />
                  <span>{slice.hex}</span>
                  <span className="text-[var(--muted)]">{Math.round(slice.share * 100)}%</span>
                </span>
              ))}
            </div>
          </div>

          {/* 5 Breakdown Bars */}
          <div className="space-y-2.5 border-t border-[var(--hairline)] pt-4">
            {breakdownRows.map((row) => {
              const pct = row.value === null ? 0 : Math.round((row.value / row.max) * 100);
              return (
                <div key={row.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[var(--ink-2)]">{row.label}</span>
                    <span className="font-tabular text-[var(--ink)]">
                      {row.value === null ? (
                        <span className="text-[11px] text-[var(--muted)]">
                          {t.colorLab.breakdown.paletteNotSelected}
                        </span>
                      ) : (
                        `${row.value} / ${row.max}`
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--paper-2)] overflow-hidden">
                    {row.value !== null && (
                      <div
                        className="h-full bg-[var(--ink)] transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tips */}
          {allTips.length > 0 && (
            <div className="border-t border-[var(--hairline)] pt-4">
              <h4 className="micro-label text-[var(--muted)] mb-2">{t.colorLab.tipsTitle}</h4>
              <ul className="space-y-1.5">
                {allTips.map((tip) => (
                  <li key={tip} className="text-xs leading-relaxed text-[var(--ink-2)] flex gap-2">
                    <span className="text-[var(--accent)]" aria-hidden="true">
                      —
                    </span>
                    <span>{localize(tip)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
