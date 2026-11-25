import { useId } from 'react';
import type { Category } from '../data/schema';

export type GarmentSubtype =
  | 'palto'
  | 'trench'
  | 'blazer'
  | 'puffer'
  | 'parka'
  | 'bomber'
  | 'cardigan'
  | 'hoodie'
  | 'ziphoodie'
  | 'sweatshirt'
  | 'turtleneck'
  | 'sweater'
  | 'shirt'
  | 'polo'
  | 'tee'
  | 'wide_trousers'
  | 'chinos'
  | 'cargo'
  | 'joggers'
  | 'denim'
  | 'skirt'
  | 'midi_silk'
  | 'shirt_dress'
  | 'knit_dress'
  | 'hoodie_dress'
  | 'sneakers'
  | 'chelsea_boots'
  | 'lug_boots'
  | 'loafers'
  | 'sandals'
  | 'tote'
  | 'crossbody'
  | 'backpack'
  | 'clutch'
  | 'scarf'
  | 'silk_scarf'
  | 'cap'
  | 'beanie'
  | 'sunglasses'
  | 'belt'
  | 'watch';

interface GarmentSilhouetteProps {
  category: Category;
  color: string;
  color2?: string | null;
  garmentId?: string;
  nameHint?: string;
  className?: string;
}

export function detectGarmentSubtype(
  category: Category,
  garmentId = '',
  nameHint = '',
): GarmentSubtype {
  const s = `${garmentId} ${nameHint}`.toLowerCase();

  if (category === 'outerwear') {
    if (s.includes('trench') || s.includes('yomgʻirplash')) return 'trench';
    if (s.includes('blazer') || s.includes('jaket')) return 'blazer';
    if (s.includes('puffer') || s.includes('quilted')) return 'puffer';
    if (s.includes('parka')) return 'parka';
    if (s.includes('bomber')) return 'bomber';
    if (s.includes('cardigan') || s.includes('kardigan')) return 'cardigan';
    return 'palto';
  }
  if (category === 'top') {
    if (s.includes('ziphoodie') || s.includes('zip-up') || s.includes('zamokli')) return 'ziphoodie';
    if (s.includes('hoodie') || s.includes('hudi')) return 'hoodie';
    if (s.includes('sweatshirt') || s.includes('svitshot')) return 'sweatshirt';
    if (s.includes('turtleneck') || s.includes('vodolazka')) return 'turtleneck';
    if (s.includes('sweater') || s.includes('sviter') || s.includes('knit') || s.includes('cashmere')) return 'sweater';
    if (s.includes('polo')) return 'polo';
    if (s.includes('tee') || s.includes('futbolka')) return 'tee';
    return 'shirt';
  }
  if (category === 'bottom') {
    if (s.includes('cargo') || s.includes('kargo')) return 'cargo';
    if (s.includes('jogger')) return 'joggers';
    if (s.includes('denim') || s.includes('jeans') || s.includes('jinsi')) return 'denim';
    if (s.includes('skirt') || s.includes('yubka')) return 'skirt';
    if (s.includes('chino')) return 'chinos';
    return 'wide_trousers';
  }
  if (category === 'dress') {
    if (s.includes('hoodie') || s.includes('hudi')) return 'hoodie_dress';
    if (s.includes('knit') || s.includes('trikotaj')) return 'knit_dress';
    if (s.includes('shirt') || s.includes('koʻylak')) return 'shirt_dress';
    return 'midi_silk';
  }
  if (category === 'shoes') {
    if (s.includes('sneaker') || s.includes('keda') || s.includes('krossovka')) return 'sneakers';
    if (s.includes('lug') || s.includes('botinka') || s.includes('qishki')) return 'lug_boots';
    if (s.includes('boot') || s.includes('chelsea') || s.includes('etik')) return 'chelsea_boots';
    if (s.includes('sandal')) return 'sandals';
    return 'loafers';
  }
  if (category === 'bag') {
    if (s.includes('backpack') || s.includes('ryukzak')) return 'backpack';
    if (s.includes('clutch') || s.includes('klatch')) return 'clutch';
    if (s.includes('crossbody') || s.includes('ixcham') || s.includes('kross')) return 'crossbody';
    return 'tote';
  }
  // accessory
  if (s.includes('silk') || s.includes('roʻmol')) return 'silk_scarf';
  if (s.includes('cap') || s.includes('kepka')) return 'cap';
  if (s.includes('beanie') || s.includes('shapka')) return 'beanie';
  if (s.includes('sunglass') || s.includes('koʻzoynak')) return 'sunglasses';
  if (s.includes('belt') || s.includes('kamar')) return 'belt';
  if (s.includes('watch') || s.includes('soat')) return 'watch';
  return 'scarf';
}

function getLuminance(hex: string): number {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return 0.5;
  const r = parseInt(m[1]!, 16) / 255;
  const g = parseInt(m[2]!, 16) / 255;
  const b = parseInt(m[3]!, 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Editorial, multi-layered fashion garment illustrations across 41 distinct subtypes.
 * Adaptive inner details ensure crisp visibility on both light and dark fabrics in Light & Dark modes.
 */
export function GarmentSilhouette({
  category,
  color,
  color2,
  garmentId,
  nameHint,
  className = 'h-full w-auto max-h-full max-w-full',
}: GarmentSilhouetteProps) {
  const uid = useId().replace(/:/g, '');
  const sub = detectGarmentSubtype(category, garmentId, nameHint);
  const lum = getLuminance(color);
  const isVeryDark = lum < 0.09;
  const outline = isVeryDark ? '#4B453C' : '#1A1815';
  const detail = isVeryDark ? 'rgba(244,239,230,0.42)' : 'rgba(21,20,18,0.48)';
  const softShade = isVeryDark ? 'rgba(255,255,255,0.09)' : 'rgba(21,20,18,0.11)';
  const highlight = isVeryDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.28)';
  const accentFill = color2 ?? (isVeryDark ? '#8B8070' : '#D8D0BF');

  return (
    <svg
      viewBox="0 0 200 240"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`grad-${uid}`} x1="15%" y1="5%" x2="85%" y2="95%">
          <stop offset="0%" stopColor={color} />
          <stop offset="55%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity="0.88" />
        </linearGradient>
      </defs>

      {/* ==================== HOODIE & ZIP-HOODIE ==================== */}
      {(sub === 'hoodie' || sub === 'ziphoodie') && (
        <g>
          {/* Hood back depth */}
          <path
            d="M72 48 C70 22 86 14 100 14 C114 14 130 22 128 48 Z"
            fill={color}
            stroke={outline}
            strokeWidth="1.6"
          />
          <path
            d="M78 46 C78 27 89 20 100 20 C111 20 122 27 122 46 Z"
            fill={softShade}
            stroke={detail}
            strokeWidth="1"
          />
          {/* Body + drop shoulders + sleeves */}
          <path
            d="M66 44 L36 62 L24 138 L46 144 L54 88 L54 198 L146 198 L146 88 L154 144 L176 138 L164 62 L134 44 Q100 56 66 44 Z"
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Raglan seams */}
          <path d="M66 44 L54 88 M134 44 L146 88" stroke={detail} strokeWidth="1" strokeDasharray="3 2" />
          {/* Ribbed cuffs & hem */}
          <path d="M25 128 L47 134 M175 128 L153 134 M54 184 L146 184" stroke={outline} strokeWidth="1.2" />
          <path d="M54 184 H146 V198 H54 Z" fill={softShade} />
          {/* Drawstrings */}
          <path d="M91 49 C90 66 89 76 89 86 M109 49 C110 66 111 76 111 86" stroke={accentFill} strokeWidth="2.1" strokeLinecap="round" />
          <circle cx="89" cy="87" r="1.8" fill={outline} />
          <circle cx="111" cy="87" r="1.8" fill={outline} />
          {/* Kangaroo pocket / Split pockets */}
          {sub === 'hoodie' ? (
            <path
              d="M72 136 H128 L134 172 H66 Z"
              fill={softShade}
              stroke={outline}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          ) : (
            <>
              <path d="M100 50 V198" stroke={accentFill} strokeWidth="2.2" />
              <path d="M100 50 V198" stroke={outline} strokeWidth="1" strokeDasharray="2 2" />
              <rect x="97" y="54" width="6" height="8" rx="1" fill={accentFill} stroke={outline} strokeWidth="0.9" />
              <path d="M68 142 H92 V174 H63 Z M108 142 H132 L137 174 H108 Z" fill={softShade} stroke={outline} strokeWidth="1.1" />
            </>
          )}
        </g>
      )}

      {/* ==================== SWEATSHIRT / SWEATER / TURTLENECK ==================== */}
      {(sub === 'sweatshirt' || sub === 'sweater' || sub === 'turtleneck') && (
        <g>
          {/* Collar */}
          {sub === 'turtleneck' ? (
            <path
              d="M76 22 Q100 18 124 22 L126 52 Q100 58 74 52 Z"
              fill={color}
              stroke={outline}
              strokeWidth="1.6"
            />
          ) : (
            <path
              d="M72 38 Q100 52 128 38 L122 54 Q100 64 78 54 Z"
              fill={softShade}
              stroke={outline}
              strokeWidth="1.3"
            />
          )}
          <path
            d="M72 40 L34 62 L24 140 L44 144 L54 88 L56 198 L144 198 L146 88 L156 144 L176 140 L166 62 L128 40 Q100 54 72 40 Z"
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {sub === 'turtleneck' && (
            <path d="M77 35 Q100 40 123 35" stroke={detail} strokeWidth="1.1" />
          )}
          {sub === 'sweatshirt' && (
            <path d="M93 52 L100 66 L107 52 Z" fill={softShade} stroke={detail} strokeWidth="1" />
          )}
          {sub === 'sweater' && (
            <g stroke={detail} strokeWidth="1" opacity="0.65">
              <path d="M84 58 V182 M100 60 V182 M116 58 V182" strokeDasharray="4 3" />
            </g>
          )}
          {/* Ribbed cuffs & waistband */}
          <path d="M25 130 L45 134 M175 130 L155 134" stroke={outline} strokeWidth="1.2" />
          <path d="M56 184 H144 V198 H56 Z" fill={softShade} stroke={outline} strokeWidth="1" />
        </g>
      )}

      {/* ==================== SHIRT / POLO / TEE ==================== */}
      {(sub === 'shirt' || sub === 'polo' || sub === 'tee') && (
        <g>
          {sub === 'tee' ? (
            <path
              d="M74 38 Q100 54 126 38 L166 58 L154 96 L138 90 L138 194 L62 194 L62 90 L46 96 L34 58 Z"
              fill={`url(#grad-${uid})`}
              stroke={outline}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          ) : sub === 'polo' ? (
            <path
              d="M74 34 L100 48 L126 34 L166 56 L154 94 L138 88 L138 194 L62 194 L62 88 L46 94 L34 56 Z"
              fill={`url(#grad-${uid})`}
              stroke={outline}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M74 32 L100 46 L126 32 L168 54 L166 146 L146 148 L140 88 L140 198 Q100 206 60 198 L60 88 L54 148 L34 146 L32 54 Z"
              fill={`url(#grad-${uid})`}
              stroke={outline}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          )}

          {sub === 'tee' && (
            <>
              <path d="M74 38 Q100 60 126 38" stroke={outline} strokeWidth="1.5" fill="none" />
              <path d="M40 86 L58 92 M160 86 L142 92 M62 186 H138" stroke={detail} strokeWidth="1" strokeDasharray="2 2" />
            </>
          )}

          {(sub === 'shirt' || sub === 'polo') && (
            <>
              {/* Collar points */}
              <path d="M74 32 L88 54 L100 46 L112 54 L126 32" fill={highlight} stroke={outline} strokeWidth="1.3" strokeLinejoin="round" />
              {/* Placket & buttons */}
              <path
                d={sub === 'polo' ? 'M96 48 H104 V92 H96 Z' : 'M96 48 H104 V199 H96 Z'}
                fill={softShade}
                stroke={detail}
                strokeWidth="0.9"
              />
              {[62, 82].map((cy) => (
                <circle key={cy} cx="100" cy={cy} r="2" fill={accentFill} stroke={outline} strokeWidth="0.8" />
              ))}
              {sub === 'shirt' &&
                [108, 134, 160, 184].map((cy) => (
                  <circle key={cy} cx="100" cy={cy} r="2" fill={accentFill} stroke={outline} strokeWidth="0.8" />
                ))}
              {sub === 'shirt' && (
                <>
                  <path d="M112 86 H130 V106 Q121 112 112 106 Z" fill={softShade} stroke={detail} strokeWidth="1" />
                  <path d="M35 136 L55 138 M165 136 L145 138" stroke={outline} strokeWidth="1.2" />
                </>
              )}
            </>
          )}
        </g>
      )}

      {/* ==================== PALTO / TRENCH / BLAZER / CARDIGAN ==================== */}
      {(sub === 'palto' || sub === 'trench' || sub === 'blazer' || sub === 'cardigan') && (
        <g>
          <path
            d={
              sub === 'blazer'
                ? 'M68 30 L88 22 L100 34 L112 22 L132 30 L170 54 L160 148 L142 146 L140 82 L138 184 L62 184 L60 82 L58 146 L40 148 L30 54 Z'
                : sub === 'cardigan'
                  ? 'M72 32 L100 76 L128 32 L166 56 L158 152 L140 150 L138 86 L138 202 L62 202 L62 86 L60 150 L42 152 L34 56 Z'
                  : 'M68 26 L88 18 L100 32 L112 18 L132 26 L172 52 L162 152 L144 150 L142 82 L146 218 L54 218 L58 82 L56 150 L38 152 L28 52 Z'
            }
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Lapels / V-neck trim */}
          {sub === 'cardigan' ? (
            <>
              <path d="M72 32 L100 78 L128 32" stroke={outline} strokeWidth="1.4" />
              <path d="M100 78 V202" stroke={outline} strokeWidth="1.3" />
              {[94, 120, 146, 172].map((cy) => (
                <circle key={cy} cx="94" cy={cy} r="2.6" fill={accentFill} stroke={outline} strokeWidth="0.9" />
              ))}
              <rect x="68" y="138" width="22" height="24" fill={softShade} stroke={outline} strokeWidth="1" />
              <rect x="110" y="138" width="22" height="24" fill={softShade} stroke={outline} strokeWidth="1" />
            </>
          ) : (
            <>
              {/* Notched collar & lapels */}
              <path d="M88 18 L74 58 L86 64 L78 78 L100 102 L122 78 L114 64 L126 58 L112 18" fill={softShade} stroke={outline} strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M100 102 V216" stroke={detail} strokeWidth="1.1" />
              {/* Pockets */}
              <path d="M66 138 H86 M114 138 H134" stroke={outline} strokeWidth="1.5" strokeLinecap="round" />
              {/* Buttons */}
              {(sub === 'trench' ? [108, 134, 160] : [110, 140]).map((cy) => (
                <g key={cy}>
                  <circle cx="92" cy={cy} r="2.6" fill={accentFill} stroke={outline} strokeWidth="0.9" />
                  {sub === 'trench' && (
                    <circle cx="108" cy={cy} r="2.6" fill={accentFill} stroke={outline} strokeWidth="0.9" />
                  )}
                </g>
              ))}
              {/* Trench waist belt & storm epaulets */}
              {sub === 'trench' && (
                <>
                  <path d="M56 120 H144 V130 H56 Z" fill={accentFill} stroke={outline} strokeWidth="1.2" />
                  <rect x="94" y="118" width="12" height="14" rx="1" fill="none" stroke={outline} strokeWidth="1.4" />
                  <path d="M52 38 L70 30 M148 38 L130 30" stroke={outline} strokeWidth="1.6" />
                </>
              )}
            </>
          )}
        </g>
      )}

      {/* ==================== PUFFER / PARKA / BOMBER ==================== */}
      {(sub === 'puffer' || sub === 'parka' || sub === 'bomber') && (
        <g>
          {/* Stand collar or storm hood */}
          {sub === 'parka' ? (
            <path d="M72 40 C72 16 128 16 128 40 Z" fill={softShade} stroke={outline} strokeWidth="1.5" />
          ) : (
            <path d="M74 28 Q100 36 126 28 L128 44 Q100 50 72 44 Z" fill={softShade} stroke={outline} strokeWidth="1.5" />
          )}
          <path
            d={
              sub === 'parka'
                ? 'M68 40 L34 62 L24 148 L46 152 L54 88 L52 208 L148 208 L146 88 L154 152 L176 148 L166 62 L132 40 Z'
                : sub === 'bomber'
                  ? 'M72 40 L34 60 L26 138 L46 144 L54 86 L56 176 L144 176 L146 86 L154 144 L174 138 L166 60 L128 40 Z'
                  : 'M68 40 L30 62 L22 142 L46 148 L54 88 L52 192 L148 192 L146 88 L154 148 L178 142 L170 62 L132 40 Z'
            }
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Puffer quilted horizontal baffles */}
          {sub === 'puffer' && (
            <g stroke={outline} strokeWidth="1.1" opacity="0.72">
              <path d="M54 76 H146 M53 106 H147 M53 136 H147 M52 166 H148" />
              <path d="M29 90 L50 96 M25 116 L48 122 M171 90 L150 96 M175 116 L152 122" />
            </g>
          )}
          {/* Center zip & storm flap */}
          <path d="M100 42 V190" stroke={accentFill} strokeWidth="2.4" />
          <path d="M100 42 V190" stroke={outline} strokeWidth="1" />
          {/* Bomber rib hem & cuffs */}
          {sub === 'bomber' && (
            <>
              <path d="M56 164 H144 V176 H56 Z" fill={softShade} stroke={outline} strokeWidth="1.1" />
              <path d="M27 128 L47 134 M173 128 L153 134" stroke={outline} strokeWidth="1.4" />
              <path d="M64 128 L82 146 M136 128 L118 146" stroke={outline} strokeWidth="1.4" />
            </>
          )}
          {/* Parka flap pockets & waist drawcord */}
          {sub === 'parka' && (
            <>
              <path d="M54 116 H146" stroke={detail} strokeWidth="1.2" strokeDasharray="3 2" />
              <rect x="62" y="138" width="24" height="28" fill={softShade} stroke={outline} strokeWidth="1.2" />
              <rect x="114" y="138" width="24" height="28" fill={softShade} stroke={outline} strokeWidth="1.2" />
            </>
          )}
        </g>
      )}

      {/* ==================== BOTTOMS (TROUSERS / CHINOS / CARGO / JOGGERS / DENIM / SKIRT) ==================== */}
      {category === 'bottom' && sub === 'skirt' && (
        <g>
          <path
            d="M66 30 H134 L162 204 Q100 214 38 204 Z"
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M66 44 H134" stroke={outline} strokeWidth="1.4" />
          <g stroke={detail} strokeWidth="1">
            <path d="M80 44 L64 204 M94 44 L88 208 M106 44 L112 208 M120 44 L136 204" />
          </g>
        </g>
      )}

      {category === 'bottom' && sub !== 'skirt' && (
        <g>
          <path
            d={
              sub === 'wide_trousers'
                ? 'M56 24 H144 L158 214 H108 L100 100 L92 214 H42 Z'
                : sub === 'joggers'
                  ? 'M58 24 H142 L148 198 L120 202 L100 104 L80 202 L52 198 Z'
                  : 'M58 24 H142 L148 212 H108 L100 102 L92 212 H52 Z'
            }
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Waistband & belt loops */}
          <path d="M58 38 H142" stroke={outline} strokeWidth="1.3" />
          {[68, 86, 114, 132].map((lx) => (
            <path key={lx} d={`M${lx} 24 V39`} stroke={outline} strokeWidth="1.6" />
          ))}
          <path d="M100 38 V78" stroke={detail} strokeWidth="1.1" />
          <circle cx="100" cy="31" r="2.2" fill={accentFill} stroke={outline} strokeWidth="0.9" />
          {/* Subtype details */}
          {sub === 'wide_trousers' && (
            <path d="M76 42 L70 210 M124 42 L130 210" stroke={detail} strokeWidth="1" opacity="0.65" />
          )}
          {sub === 'denim' && (
            <g stroke={accentFill} strokeWidth="1.1" strokeDasharray="3 2">
              <path d="M60 44 Q74 62 58 76 M140 44 Q126 62 142 76" />
              <path d="M56 44 V208 M144 44 V208" />
            </g>
          )}
          {sub === 'cargo' && (
            <>
              <rect x="47" y="108" width="16" height="32" fill={softShade} stroke={outline} strokeWidth="1.2" />
              <rect x="137" y="108" width="16" height="32" fill={softShade} stroke={outline} strokeWidth="1.2" />
              <path d="M47 116 H63 M137 116 H153" stroke={outline} strokeWidth="1.1" />
            </>
          )}
          {sub === 'joggers' && (
            <>
              <path d="M95 36 L92 58 M105 36 L108 58" stroke={accentFill} strokeWidth="1.6" strokeLinecap="round" />
              <path d="M52 190 H82 M118 190 H148" stroke={outline} strokeWidth="1.4" />
            </>
          )}
        </g>
      )}

      {/* ==================== DRESSES ==================== */}
      {category === 'dress' && (
        <g>
          {sub === 'hoodie_dress' && (
            <path d="M76 42 C76 18 124 18 124 42 Z" fill={softShade} stroke={outline} strokeWidth="1.5" />
          )}
          <path
            d={
              sub === 'shirt_dress'
                ? 'M72 28 L100 42 L128 28 L142 66 L124 88 L156 210 Q100 220 44 210 L76 88 L58 66 Z'
                : sub === 'hoodie_dress'
                  ? 'M70 40 L40 62 L32 132 L50 136 L58 88 L50 208 Q100 216 150 208 L142 88 L150 136 L168 132 L160 62 L130 40 Z'
                  : 'M72 28 Q100 44 128 28 L138 66 L124 88 L152 212 Q100 222 48 212 L76 88 L62 66 Z'
            }
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Waist seam / belt */}
          <path d="M75 90 H125" stroke={accentFill} strokeWidth="3.5" />
          <path d="M75 90 H125" stroke={outline} strokeWidth="1" />
          {sub === 'shirt_dress' && (
            <path d="M100 42 V214" stroke={detail} strokeWidth="1.1" strokeDasharray="3 3" />
          )}
          {sub === 'knit_dress' && (
            <path d="M84 48 L72 210 M100 48 V214 M116 48 L128 210" stroke={detail} strokeWidth="0.9" opacity="0.55" />
          )}
          {sub === 'midi_silk' && (
            <path d="M88 94 Q80 156 68 212 M112 94 Q120 156 132 212" stroke={highlight} strokeWidth="1.2" />
          )}
        </g>
      )}

      {/* ==================== SHOES ==================== */}
      {sub === 'sneakers' && (
        <g>
          <path
            d="M42 96 L64 96 L82 118 L156 136 C168 140 172 152 168 164 L36 164 L36 134 Z"
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Sculpted rubber midsole */}
          <path d="M35 162 H169 V176 H35 Z" fill="#F4EFE6" stroke={outline} strokeWidth="1.4" />
          <path d="M35 176 H169 V181 H35 Z" fill={accentFill} stroke={outline} strokeWidth="1" />
          {/* Laces & side panel */}
          <path d="M88 120 L98 114 M98 124 L108 118 M108 128 L118 122" stroke={accentFill} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M52 138 Q84 150 118 134" stroke={detail} strokeWidth="1.2" />
        </g>
      )}

      {(sub === 'chelsea_boots' || sub === 'lug_boots') && (
        <g>
          <path
            d="M52 54 H98 L104 124 L154 138 C166 142 170 154 166 168 L44 168 L48 130 Z"
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Pull tab */}
          <path d="M54 54 V42 H64 V54" stroke={outline} strokeWidth="1.5" fill={accentFill} />
          {/* Elastic gusset for Chelsea, lace eyelets for Lug boots */}
          {sub === 'chelsea_boots' ? (
            <path d="M68 68 H86 V126 Q77 132 68 126 Z" fill={softShade} stroke={outline} strokeWidth="1.1" />
          ) : (
            <g stroke={accentFill} strokeWidth="2">
              <path d="M98 70 L108 70 M100 86 L110 86 M102 102 L112 102" />
            </g>
          )}
          {/* Welt & lugged sole */}
          <path
            d={
              sub === 'lug_boots'
                ? 'M42 168 H167 V182 L156 186 L146 182 L136 186 L126 182 L116 186 L100 180 H84 V186 L72 182 L60 186 L42 184 Z'
                : 'M42 168 H167 V176 H102 V173 H84 V180 H42 Z'
            }
            fill="#1D1A17"
            stroke={outline}
            strokeWidth="1.2"
          />
        </g>
      )}

      {sub === 'loafers' && (
        <g>
          <path
            d="M44 116 C60 124 80 120 96 108 L122 126 L160 138 C170 142 172 156 166 164 L36 164 L38 136 Z"
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Penny strap */}
          <path d="M84 114 L106 130 L96 138 L74 122 Z" fill={softShade} stroke={outline} strokeWidth="1.2" />
          {/* Heel & sole */}
          <path d="M36 164 H166 V171 H98 V168 H78 V176 H36 Z" fill="#1D1A17" stroke={outline} strokeWidth="1.1" />
        </g>
      )}

      {sub === 'sandals' && (
        <g>
          {/* Footbed */}
          <path d="M36 154 Q102 162 170 154 L166 168 Q102 174 38 168 Z" fill={accentFill} stroke={outline} strokeWidth="1.5" />
          {/* Straps */}
          <path d="M52 156 L58 118 H78 L72 156" fill={color} stroke={outline} strokeWidth="1.4" />
          <path d="M114 156 L128 132 H148 L138 156" fill={color} stroke={outline} strokeWidth="1.4" />
          <rect x="60" y="122" width="8" height="6" fill="#C4A27A" stroke={outline} strokeWidth="1" />
        </g>
      )}

      {/* ==================== BAGS ==================== */}
      {sub === 'tote' && (
        <g>
          <path d="M72 78 C72 34 128 34 128 78" stroke={outline} strokeWidth="3" fill="none" />
          <path d="M44 78 H156 L164 202 H36 Z" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M44 102 H156" stroke={detail} strokeWidth="1.2" />
          <path d="M72 78 V126 M128 78 V126" stroke={outline} strokeWidth="1.4" />
          <rect x="93" y="96" width="14" height="10" rx="1" fill={accentFill} stroke={outline} strokeWidth="1.1" />
        </g>
      )}

      {sub === 'crossbody' && (
        <g>
          <path d="M62 84 C62 24 138 24 138 84" stroke={outline} strokeWidth="2.4" fill="none" />
          <rect x="44" y="84" width="112" height="96" rx="4" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" />
          <path d="M44 120 L100 134 L156 120" fill={softShade} stroke={outline} strokeWidth="1.3" />
          <circle cx="100" cy="134" r="4" fill={accentFill} stroke={outline} strokeWidth="1.1" />
        </g>
      )}

      {sub === 'backpack' && (
        <g>
          <path d="M84 44 C84 26 116 26 116 44" stroke={outline} strokeWidth="2.5" fill="none" />
          <path d="M52 72 C52 46 148 46 148 72 L154 198 H46 Z" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
          <rect x="64" y="128" width="72" height="54" rx="2" fill={softShade} stroke={outline} strokeWidth="1.2" />
          <path d="M68 142 H132" stroke={accentFill} strokeWidth="2" />
        </g>
      )}

      {sub === 'clutch' && (
        <g>
          <path d="M36 94 H164 L156 164 H44 Z" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M38 112 L100 128 L162 112" stroke={outline} strokeWidth="1.3" />
          <rect x="90" y="122" width="20" height="8" rx="1" fill={accentFill} stroke={outline} strokeWidth="1.1" />
        </g>
      )}

      {/* ==================== ACCESSORIES ==================== */}
      {(sub === 'scarf' || sub === 'silk_scarf') && (
        <g>
          <path
            d={
              sub === 'silk_scarf'
                ? 'M68 56 Q100 44 132 56 L124 96 L142 158 L116 164 L100 112 L84 164 L58 158 L76 96 Z'
                : 'M60 48 C60 32 140 32 140 48 L146 142 H122 L118 88 L82 88 L78 188 H52 Z'
            }
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M62 66 H138" stroke={accentFill} strokeWidth="2.5" opacity="0.7" />
          {sub === 'scarf' && (
            <g stroke={outline} strokeWidth="1.2">
              <path d="M56 188 V198 M64 188 V198 M72 188 V198 M126 142 V152 M134 142 V152 M142 142 V152" />
            </g>
          )}
        </g>
      )}

      {sub === 'cap' && (
        <g>
          <path d="M46 132 C46 76 154 76 154 132 Z" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" />
          <path d="M100 84 V132 M74 90 Q86 112 84 132 M126 90 Q114 112 116 132" stroke={detail} strokeWidth="1" />
          <circle cx="100" cy="82" r="3" fill={accentFill} stroke={outline} strokeWidth="1" />
          {/* Curved visor */}
          <path d="M44 132 Q112 122 178 142 Q128 154 44 138 Z" fill={softShade} stroke={outline} strokeWidth="1.5" />
        </g>
      )}

      {sub === 'beanie' && (
        <g>
          <path d="M50 132 C50 68 150 68 150 132 Z" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" />
          <rect x="46" y="128" width="108" height="34" rx="3" fill={color} stroke={outline} strokeWidth="1.6" />
          <g stroke={detail} strokeWidth="1">
            {[64, 82, 100, 118, 136].map((x) => (
              <path key={x} d={`M${x} 128 V162`} />
            ))}
          </g>
        </g>
      )}

      {sub === 'sunglasses' && (
        <g>
          <path d="M26 106 H88 L82 144 Q56 154 32 142 Z" fill={color} stroke={outline} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M112 106 H174 L168 142 Q144 154 118 144 Z" fill={color} stroke={outline} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M88 112 Q100 104 112 112" stroke={outline} strokeWidth="2.5" />
          <path d="M36 114 L76 138 M122 114 L162 138" stroke={highlight} strokeWidth="2" opacity="0.7" />
        </g>
      )}

      {sub === 'belt' && (
        <g>
          <path d="M22 108 H152 V132 H22 Z" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" />
          <rect x="148" y="102" width="28" height="36" rx="2" fill="none" stroke={accentFill} strokeWidth="3.5" />
          <rect x="148" y="102" width="28" height="36" rx="2" fill="none" stroke={outline} strokeWidth="1.2" />
          <path d="M148 120 H164" stroke={outline} strokeWidth="2" />
          {[50, 68, 86, 104].map((x) => (
            <circle key={x} cx={x} cy="120" r="2" fill={outline} />
          ))}
        </g>
      )}

      {sub === 'watch' && (
        <g>
          <rect x="84" y="34" width="32" height="50" fill={color} stroke={outline} strokeWidth="1.5" />
          <rect x="84" y="156" width="32" height="50" fill={color} stroke={outline} strokeWidth="1.5" />
          <circle cx="100" cy="120" r="36" fill={accentFill} stroke={outline} strokeWidth="2" />
          <circle cx="100" cy="120" r="29" fill="#FAF7F0" stroke={outline} strokeWidth="1" />
          <path d="M100 120 V102 M100 120 L114 128" stroke="#151412" strokeWidth="2" strokeLinecap="round" />
          <circle cx="100" cy="120" r="2.2" fill="#8F1D2C" />
        </g>
      )}
    </svg>
  );
}
