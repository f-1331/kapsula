import { useId } from 'react';
import type { Category } from '../data/schema';

export type GarmentSubtype =
  // Outerwear (20)
  | 'palto'
  | 'peacoat'
  | 'mac_coat'
  | 'trench'
  | 'cape'
  | 'kimono'
  | 'blazer'
  | 'tuxedo_blazer'
  | 'fur_coat'
  | 'shearling'
  | 'puffer'
  | 'cropped_puffer'
  | 'parka'
  | 'anorak'
  | 'bomber'
  | 'varsity'
  | 'leather_jacket'
  | 'denim_jacket'
  | 'vest'
  | 'cardigan'
  // Tops (18)
  | 'hoodie'
  | 'ziphoodie'
  | 'sweatshirt'
  | 'overshirt'
  | 'turtleneck'
  | 'halfzip_knit'
  | 'vneck_sweater'
  | 'sweater'
  | 'shirt'
  | 'silk_blouse'
  | 'polo'
  | 'knit_polo'
  | 'longsleeve'
  | 'track_top'
  | 'tunic'
  | 'crop_top'
  | 'tank_top'
  | 'tee'
  // Bottoms (14)
  | 'wide_trousers'
  | 'pleated_trousers'
  | 'slim_trousers'
  | 'culottes'
  | 'chinos'
  | 'corduroy_pants'
  | 'cargo'
  | 'joggers'
  | 'track_pants'
  | 'leggings'
  | 'denim'
  | 'shorts'
  | 'skirt'
  | 'a_line_skirt'
  // Dresses (9)
  | 'midi_silk'
  | 'cocktail_dress'
  | 'maxi_sundress'
  | 'blazer_dress'
  | 'aline_dress'
  | 'atlas_dress'
  | 'shirt_dress'
  | 'knit_dress'
  | 'hoodie_dress'
  // Shoes (12)
  | 'sneakers'
  | 'canvas_sneakers'
  | 'running_shoes'
  | 'chelsea_boots'
  | 'lug_boots'
  | 'loafers'
  | 'moccasins'
  | 'derbies'
  | 'heels'
  | 'ballet_flats'
  | 'mules'
  | 'sandals'
  // Bags (10)
  | 'tote'
  | 'woven_tote'
  | 'briefcase'
  | 'crossbody'
  | 'baguette'
  | 'belt_bag'
  | 'saddle'
  | 'backpack'
  | 'duffle'
  | 'clutch'
  // Accessories (17)
  | 'scarf'
  | 'silk_scarf'
  | 'cap'
  | 'bucket_hat'
  | 'fedora'
  | 'doppi'
  | 'beanie'
  | 'sunglasses'
  | 'belt'
  | 'watch'
  | 'tie'
  | 'bowtie'
  | 'gloves'
  | 'bracelet'
  | 'earrings'
  | 'necklace'
  | 'umbrella';

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
    if (s.includes('cape') || s.includes('keyp') || s.includes('nakidka')) return 'cape';
    if (s.includes('kimono')) return 'kimono';
    if (s.includes('fur_coat') || s.includes('shuba') || s.includes('moʻyna')) return 'fur_coat';
    if (s.includes('shearling') || s.includes('dublyonka')) return 'shearling';
    if (s.includes('mac_coat') || s.includes('makintosh')) return 'mac_coat';
    if (s.includes('tuxedo') || s.includes('smoking')) return 'tuxedo_blazer';
    if (s.includes('cropped_puffer') || s.includes('kalta puffer')) return 'cropped_puffer';
    if (s.includes('peacoat') || s.includes('bortli')) return 'peacoat';
    if (s.includes('trench') || s.includes('yomgʻirplash')) return 'trench';
    if (s.includes('blazer') || s.includes('jaket')) return 'blazer';
    if (s.includes('puffer') || s.includes('quilted')) return 'puffer';
    if (s.includes('anorak') || s.includes('vetrovka')) return 'anorak';
    if (s.includes('parka')) return 'parka';
    if (s.includes('varsity') || s.includes('kollej')) return 'varsity';
    if (s.includes('leather') || s.includes('charm')) return 'leather_jacket';
    if (s.includes('denim') || s.includes('jinsi')) return 'denim_jacket';
    if (s.includes('vest') || s.includes('nimcha') || s.includes('gilet')) return 'vest';
    if (s.includes('bomber')) return 'bomber';
    if (s.includes('cardigan') || s.includes('kardigan')) return 'cardigan';
    return 'palto';
  }
  if (category === 'top') {
    if (s.includes('ziphoodie') || s.includes('zip-up') || s.includes('zamokli hudi')) return 'ziphoodie';
    if (s.includes('hoodie') || s.includes('hudi')) return 'hoodie';
    if (s.includes('sweatshirt') || s.includes('svitshot')) return 'sweatshirt';
    if (s.includes('overshirt') || s.includes('koʻylak-kurtka')) return 'overshirt';
    if (s.includes('turtleneck') || s.includes('vodolazka')) return 'turtleneck';
    if (s.includes('halfzip') || s.includes('yarim zamok')) return 'halfzip_knit';
    if (s.includes('vneck') || s.includes('v-yoqa') || s.includes('jemper')) return 'vneck_sweater';
    if (s.includes('sweater') || s.includes('sviter') || s.includes('cashmere')) return 'sweater';
    if (s.includes('blouse') || s.includes('bluza')) return 'silk_blouse';
    if (s.includes('track_top') || s.includes('sportivnaya') || s.includes('olimp')) return 'track_top';
    if (s.includes('tunic') || s.includes('tunika')) return 'tunic';
    if (s.includes('crop_top') || s.includes('qisqa top')) return 'crop_top';
    if (s.includes('tank_top') || s.includes('mayka')) return 'tank_top';
    if (s.includes('knit_polo') || s.includes('polo-jemper')) return 'knit_polo';
    if (s.includes('longsleeve') || s.includes('longsliv') || s.includes('henley')) return 'longsleeve';
    if (s.includes('polo')) return 'polo';
    if (s.includes('tee') || s.includes('futbolka')) return 'tee';
    return 'shirt';
  }
  if (category === 'bottom') {
    if (s.includes('pleated') || s.includes('burmali')) return 'pleated_trousers';
    if (s.includes('slim_trousers') || s.includes('tekis klassik')) return 'slim_trousers';
    if (s.includes('culotte') || s.includes('kulyot')) return 'culottes';
    if (s.includes('corduroy') || s.includes('velvet shim')) return 'corduroy_pants';
    if (s.includes('legging') || s.includes('tayts')) return 'leggings';
    if (s.includes('a_line_skirt') || s.includes('mini yubka')) return 'a_line_skirt';
    if (s.includes('cargo') || s.includes('kargo')) return 'cargo';
    if (s.includes('jogger')) return 'joggers';
    if (s.includes('track_pants') || s.includes('sport shim')) return 'track_pants';
    if (s.includes('shorts') || s.includes('shorti') || s.includes('bermuda')) return 'shorts';
    if (s.includes('denim') || s.includes('jeans') || s.includes('jinsi')) return 'denim';
    if (s.includes('skirt') || s.includes('yubka')) return 'skirt';
    if (s.includes('chino')) return 'chinos';
    return 'wide_trousers';
  }
  if (category === 'dress') {
    if (s.includes('cocktail') || s.includes('kokteyl')) return 'cocktail_dress';
    if (s.includes('maxi_sundress') || s.includes('sarafan') || s.includes('maksi')) return 'maxi_sundress';
    if (s.includes('blazer_dress') || s.includes('bleyzer')) return 'blazer_dress';
    if (s.includes('aline_dress') || s.includes('a-siluet')) return 'aline_dress';
    if (s.includes('atlas_dress') || s.includes('atlas')) return 'atlas_dress';
    if (s.includes('hoodie') || s.includes('hudi')) return 'hoodie_dress';
    if (s.includes('knit') || s.includes('trikotaj')) return 'knit_dress';
    if (s.includes('shirt') || s.includes('koʻylak')) return 'shirt_dress';
    return 'midi_silk';
  }
  if (category === 'shoes') {
    if (s.includes('canvas_sneaker') || s.includes('keda') || s.includes('kanvas')) return 'canvas_sneakers';
    if (s.includes('running') || s.includes('yugurish')) return 'running_shoes';
    if (s.includes('sneaker') || s.includes('krossovka')) return 'sneakers';
    if (s.includes('lug') || s.includes('botinka') || s.includes('qishki')) return 'lug_boots';
    if (s.includes('boot') || s.includes('chelsea') || s.includes('etik')) return 'chelsea_boots';
    if (s.includes('heels') || s.includes('baland posh')) return 'heels';
    if (s.includes('ballet') || s.includes('baletka')) return 'ballet_flats';
    if (s.includes('mule') || s.includes('myuli')) return 'mules';
    if (s.includes('moccasin') || s.includes('mokasin')) return 'moccasins';
    if (s.includes('derb') || s.includes('oxford') || s.includes('oksford') || s.includes('tufli')) return 'derbies';
    if (s.includes('sandal')) return 'sandals';
    return 'loafers';
  }
  if (category === 'bag') {
    if (s.includes('woven') || s.includes('savat') || s.includes('toʻqilgan')) return 'woven_tote';
    if (s.includes('briefcase') || s.includes('portfel') || s.includes('noutbuk')) return 'briefcase';
    if (s.includes('baguette') || s.includes('baget')) return 'baguette';
    if (s.includes('belt_bag') || s.includes('bel va koʻkrak') || s.includes('banan')) return 'belt_bag';
    if (s.includes('saddle') || s.includes('egar')) return 'saddle';
    if (s.includes('duffle') || s.includes('safar') || s.includes('weekender')) return 'duffle';
    if (s.includes('backpack') || s.includes('ryukzak')) return 'backpack';
    if (s.includes('clutch') || s.includes('klatch')) return 'clutch';
    if (s.includes('crossbody') || s.includes('ixcham') || s.includes('kross')) return 'crossbody';
    return 'tote';
  }
  // accessory
  if (s.includes('doppi') || s.includes('doʻppi')) return 'doppi';
  if (s.includes('fedora') || s.includes('fetr')) return 'fedora';
  if (s.includes('bucket') || s.includes('panama')) return 'bucket_hat';
  if (s.includes('silk') || s.includes('roʻmol')) return 'silk_scarf';
  if (s.includes('cap') || s.includes('kepka')) return 'cap';
  if (s.includes('beanie') || s.includes('shapka')) return 'beanie';
  if (s.includes('sunglass') || s.includes('koʻzoynak')) return 'sunglasses';
  if (s.includes('belt') || s.includes('kamar')) return 'belt';
  if (s.includes('watch') || s.includes('soat')) return 'watch';
  if (s.includes('bowtie') || s.includes('babochka')) return 'bowtie';
  if (s.includes('tie') || s.includes('galstuk')) return 'tie';
  if (s.includes('glove') || s.includes('qoʻlqop')) return 'gloves';
  if (s.includes('bracelet') || s.includes('bilaguzuk')) return 'bracelet';
  if (s.includes('earring') || s.includes('sirgʻa')) return 'earrings';
  if (s.includes('necklace') || s.includes('marjon') || s.includes('zanjir')) return 'necklace';
  if (s.includes('umbrella') || s.includes('soyabon')) return 'umbrella';
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
 * Volumetric 3D studio-lit vector garment system (100 subtypes).
 * Features directional cylindrical lighting, rim shadows, interior neck/hood depth,
 * extruded 3D bag gussets, contoured sneaker soles, and metallic hardware gleam.
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
  const outline = isVeryDark ? '#686055' : '#1A1815';
  const detail = isVeryDark ? 'rgba(244,239,230,0.45)' : 'rgba(21,20,18,0.45)';
  const softShade = isVeryDark ? 'rgba(255,255,255,0.12)' : 'rgba(21,20,18,0.13)';
  const deepShade = isVeryDark ? 'rgba(0,0,0,0.58)' : 'rgba(21,20,18,0.28)';
  const highlight = isVeryDark ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.45)';
  const accentFill = color2 ?? (isVeryDark ? '#A39787' : '#DDD4C3');
  const metal = '#D4C5A3';

  return (
    <svg
      viewBox="0 0 200 240"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* 3D Cylindrical Volumetric Lighting Gradient */}
        <linearGradient id={`grad-${uid}`} x1="8%" y1="4%" x2="92%" y2="85%">
          <stop offset="0%" stopColor={color} stopOpacity="0.92" />
          <stop offset="32%" stopColor={color} />
          <stop offset="68%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity="0.78" />
        </linearGradient>
        {/* Specular 3D Torso Rim & Volume Overlay */}
        <linearGradient id={`cyl-${uid}`} x1="0%" y1="15%" x2="100%" y2="15%">
          <stop offset="0%" stopColor="rgba(0,0,0,0.22)" />
          <stop offset="18%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="48%" stopColor="rgba(255,255,255,0.06)" />
          <stop offset="82%" stopColor="rgba(0,0,0,0.08)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.28)" />
        </linearGradient>
        {/* Interior Cavity Shadow */}
        <radialGradient id={`cav-${uid}`} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="rgba(0,0,0,0.45)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.12)" />
        </radialGradient>
        {/* Metallic Chrome/Brass Gradient */}
        <linearGradient id={`metal-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EFE7D6" />
          <stop offset="50%" stopColor={metal} />
          <stop offset="100%" stopColor="#7A6B4F" />
        </linearGradient>
        <pattern id={`rib-${uid}`} width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 0 V6" stroke={detail} strokeWidth="0.7" opacity="0.35" />
        </pattern>
      </defs>

      {/* ==================== HOODIE & ZIP-HOODIE ==================== */}
      {(sub === 'hoodie' || sub === 'ziphoodie') && (
        <g>
          <path d="M70 48 C68 20 84 12 100 12 C116 12 132 20 130 48 Z" fill={color} stroke={outline} strokeWidth="1.6" />
          <path d="M77 45 C77 25 88 18 100 18 C112 18 123 25 123 45 Z" fill={`url(#cav-${uid})`} stroke={detail} strokeWidth="1" />
          <path
            d="M66 44 L34 62 L22 140 L46 146 L54 90 L54 198 L146 198 L146 90 L154 146 L178 140 L166 62 L134 44 Q100 56 66 44 Z"
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* 3D cylindrical cloth shading overlay */}
          <path
            d="M66 44 L34 62 L22 140 L46 146 L54 90 L54 198 L146 198 L146 90 L154 146 L178 140 L166 62 L134 44 Q100 56 66 44 Z"
            fill={`url(#cyl-${uid})`}
            opacity="0.55"
          />
          <path d="M66 44 L54 90 M134 44 L146 90 M70 46 Q100 60 130 46" stroke={detail} strokeWidth="1" strokeDasharray="3 2" />
          <path d="M36 96 Q44 102 47 94 M164 96 Q156 102 153 94" stroke={detail} strokeWidth="1" />
          <path d="M23 128 L47 134 L46 146 L22 140 Z M177 128 L153 134 L154 146 L178 140 Z" fill={softShade} stroke={outline} strokeWidth="1.2" />
          <path d="M54 183 H146 V198 H54 Z" fill={softShade} stroke={outline} strokeWidth="1.1" />
          <path d="M54 183 H146 V198 H54 Z" fill={`url(#rib-${uid})`} />
          <circle cx="91" cy="50" r="2.2" fill={`url(#metal-${uid})`} stroke={outline} strokeWidth="0.8" />
          <circle cx="109" cy="50" r="2.2" fill={`url(#metal-${uid})`} stroke={outline} strokeWidth="0.8" />
          <path d="M91 51 C90 68 89 78 89 88 M109 51 C110 68 111 78 111 88" stroke={accentFill} strokeWidth="2.3" strokeLinecap="round" />
          <rect x="87.5" y="86" width="3" height="5" rx="1" fill={`url(#metal-${uid})`} />
          <rect x="109.5" y="86" width="3" height="5" rx="1" fill={`url(#metal-${uid})`} />
          {sub === 'hoodie' ? (
            <>
              <path d="M72 135 H128 L135 173 H65 Z" fill={softShade} stroke={outline} strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M65 173 H135 L133 176 H67 Z" fill={deepShade} />
              <path d="M74 139 L68 169 M126 139 L132 169" stroke={detail} strokeWidth="0.9" strokeDasharray="2 2" />
            </>
          ) : (
            <>
              <path d="M100 50 V198" stroke={`url(#metal-${uid})`} strokeWidth="2.5" />
              <path d="M100 50 V198" stroke={outline} strokeWidth="0.9" strokeDasharray="2 2" />
              <rect x="97" y="55" width="6" height="9" rx="1" fill={`url(#metal-${uid})`} stroke={outline} strokeWidth="0.9" />
              <path d="M68 142 H92 V174 H62 Z M108 142 H132 L138 174 H108 Z" fill={softShade} stroke={outline} strokeWidth="1.1" />
            </>
          )}
        </g>
      )}

      {/* ==================== SWEATSHIRT / SWEATER / TURTLENECK / LONGSLEEVE / HALFZIP / VNECK ==================== */}
      {(sub === 'sweatshirt' ||
        sub === 'sweater' ||
        sub === 'turtleneck' ||
        sub === 'longsleeve' ||
        sub === 'halfzip_knit' ||
        sub === 'vneck_sweater') && (
        <g>
          {sub === 'turtleneck' || sub === 'halfzip_knit' ? (
            <path d="M76 20 Q100 15 124 20 L127 52 Q100 58 73 52 Z" fill={color} stroke={outline} strokeWidth="1.6" />
          ) : sub === 'vneck_sweater' ? (
            <path d="M72 38 L100 72 L128 38 L120 42 L100 64 L80 42 Z" fill={`url(#cav-${uid})`} stroke={outline} strokeWidth="1.3" />
          ) : (
            <path d="M72 38 Q100 53 128 38 L122 55 Q100 66 78 55 Z" fill={`url(#cav-${uid})`} stroke={outline} strokeWidth="1.3" />
          )}
          <path
            d="M72 40 L34 62 L23 142 L45 146 L54 88 L56 198 L144 198 L146 88 L155 146 L177 142 L166 62 L128 40 Q100 54 72 40 Z"
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M72 40 L34 62 L23 142 L45 146 L54 88 L56 198 L144 198 L146 88 L155 146 L177 142 L166 62 L128 40 Q100 54 72 40 Z"
            fill={`url(#cyl-${uid})`}
            opacity="0.52"
          />
          {(sub === 'turtleneck' || sub === 'halfzip_knit') && (
            <>
              <path d="M77 35 Q100 40 123 35" stroke={detail} strokeWidth="1.1" />
              <path d="M76 20 H124 V52 H76 Z" fill={`url(#rib-${uid})`} opacity="0.5" />
            </>
          )}
          {sub === 'halfzip_knit' && (
            <>
              <path d="M100 32 V96" stroke={`url(#metal-${uid})`} strokeWidth="2.4" />
              <rect x="97" y="42" width="6" height="8" rx="1" fill={`url(#metal-${uid})`} stroke={outline} strokeWidth="0.9" />
            </>
          )}
          {sub === 'vneck_sweater' && (
            <path d="M76 41 L100 72 L124 41" fill="none" stroke={accentFill} strokeWidth="2.4" />
          )}
          {sub === 'sweatshirt' && (
            <path d="M92 52 L100 68 L108 52 Z" fill={softShade} stroke={detail} strokeWidth="1" />
          )}
          {sub === 'longsleeve' && (
            <>
              <path d="M96 52 H104 V96 H96 Z" fill={softShade} stroke={detail} strokeWidth="1" />
              <circle cx="100" cy="64" r="1.8" fill={accentFill} stroke={outline} strokeWidth="0.8" />
              <circle cx="100" cy="78" r="1.8" fill={accentFill} stroke={outline} strokeWidth="0.8" />
            </>
          )}
          {(sub === 'sweater' || sub === 'vneck_sweater' || sub === 'halfzip_knit') && (
            <g>
              <path d="M56 54 H144 V184 H56 Z" fill={`url(#rib-${uid})`} opacity="0.45" />
              <path d="M84 58 C82 95 86 135 84 182 M100 60 C98 95 102 135 100 182 M116 58 C114 95 118 135 116 182" stroke={detail} strokeWidth="1" strokeDasharray="5 3" />
            </g>
          )}
          <path d="M24 130 L46 135 M176 130 L154 135" stroke={outline} strokeWidth="1.3" />
          <path d="M56 184 H144 V198 H56 Z" fill={softShade} stroke={outline} strokeWidth="1" />
        </g>
      )}

      {/* ==================== CROP TOP / TANK TOP ==================== */}
      {(sub === 'crop_top' || sub === 'tank_top') && (
        <g>
          <path
            d={
              sub === 'crop_top'
                ? 'M68 42 Q100 58 132 42 L144 68 L142 142 H58 L56 68 Z'
                : 'M68 38 L78 38 Q100 68 122 38 L132 38 L142 86 L140 188 H60 L58 86 Z'
            }
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M62 46 H138 V186 H62 Z" fill={`url(#rib-${uid})`} opacity="0.45" />
          <path d={sub === 'crop_top' ? 'M58 130 H142' : 'M60 176 H140'} stroke={detail} strokeWidth="1.2" />
        </g>
      )}

      {/* ==================== TRACK TOP ==================== */}
      {sub === 'track_top' && (
        <g>
          <path d="M76 26 H124 L126 42 H74 Z" fill={softShade} stroke={outline} strokeWidth="1.5" />
          <path
            d="M72 40 L34 62 L24 140 L46 144 L54 88 L56 196 L144 196 L146 88 L154 144 L176 140 L166 62 L128 40 Z"
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M72 40 L34 62 L24 140 L46 144 L54 88 L56 196 L144 196 L146 88 L154 144 L176 140 L166 62 L128 40 Z"
            fill={`url(#cyl-${uid})`}
            opacity="0.5"
          />
          <path d="M64 46 L31 134 M69 48 L36 136 M136 46 L169 134 M131 48 L164 136" stroke={accentFill} strokeWidth="2" />
          <path d="M100 42 V196" stroke={`url(#metal-${uid})`} strokeWidth="2.4" />
          <rect x="97" y="45" width="6" height="8" rx="1" fill={`url(#metal-${uid})`} stroke={outline} strokeWidth="0.9" />
          <path d="M64 138 L80 166 M136 138 L120 166" stroke={outline} strokeWidth="1.4" />
          <path d="M56 184 H144 V196 H56 Z" fill={softShade} stroke={outline} strokeWidth="1.1" />
        </g>
      )}

      {/* ==================== SHIRT / OVERSHIRT / SILK BLOUSE / POLO / KNIT POLO / TEE / TUNIC ==================== */}
      {(sub === 'shirt' ||
        sub === 'overshirt' ||
        sub === 'silk_blouse' ||
        sub === 'polo' ||
        sub === 'knit_polo' ||
        sub === 'tee' ||
        sub === 'tunic') && (
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
          ) : sub === 'tunic' ? (
            <path
              d="M74 32 Q100 48 126 32 L166 56 L156 146 L138 144 L138 88 L146 218 Q100 226 54 218 L62 88 L62 144 L44 146 L34 56 Z"
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

          {/* Cylindrical torso volume shadow */}
          <path d="M62 56 H138 V192 H62 Z" fill={`url(#cyl-${uid})`} opacity="0.4" />

          {sub === 'tee' && (
            <>
              <path d="M74 38 Q100 60 126 38" stroke={outline} strokeWidth="1.6" fill="none" />
              <path d="M40 86 L58 92 M160 86 L142 92 M62 186 H138" stroke={detail} strokeWidth="1" strokeDasharray="2 2" />
            </>
          )}

          {sub === 'silk_blouse' && (
            <>
              <path d="M74 32 Q100 62 126 32" fill={`url(#cav-${uid})`} stroke={outline} strokeWidth="1.4" />
              <path d="M100 50 C96 70 104 82 100 100 M80 68 Q94 128 84 188 M120 68 Q106 128 116 188" stroke={highlight} strokeWidth="1.4" />
              <path d="M88 46 L100 68 L112 46" stroke={outline} strokeWidth="1.2" />
            </>
          )}

          {sub === 'tunic' && (
            <>
              <path d="M88 44 V104" stroke={outline} strokeWidth="1.2" />
              <path d="M62 126 H138" stroke={accentFill} strokeWidth="3" />
              <path d="M56 180 V218 M144 180 V218" stroke={detail} strokeWidth="1" />
            </>
          )}

          {(sub === 'shirt' || sub === 'polo' || sub === 'knit_polo' || sub === 'overshirt') && (
            <>
              <path d="M74 32 L88 54 L100 46 L112 54 L126 32" fill={highlight} stroke={outline} strokeWidth="1.3" strokeLinejoin="round" />
              <path
                d={sub === 'polo' || sub === 'knit_polo' ? 'M96 48 H104 V92 H96 Z' : 'M96 48 H104 V199 H96 Z'}
                fill={softShade}
                stroke={detail}
                strokeWidth="0.9"
              />
              {[62, 82].map((cy) => (
                <circle key={cy} cx="100" cy={cy} r="2" fill={accentFill} stroke={outline} strokeWidth="0.8" />
              ))}
              {(sub === 'shirt' || sub === 'overshirt') &&
                [108, 134, 160, 184].map((cy) => (
                  <circle key={cy} cx="100" cy={cy} r="2.2" fill={accentFill} stroke={outline} strokeWidth="0.8" />
                ))}
              {sub === 'shirt' && (
                <>
                  <path d="M112 86 H130 V106 Q121 112 112 106 Z" fill={softShade} stroke={detail} strokeWidth="1" />
                  <path d="M35 136 L55 138 M165 136 L145 138" stroke={outline} strokeWidth="1.2" />
                </>
              )}
              {sub === 'overshirt' && (
                <>
                  <rect x="66" y="78" width="24" height="28" fill={softShade} stroke={outline} strokeWidth="1.2" />
                  <rect x="110" y="78" width="24" height="28" fill={softShade} stroke={outline} strokeWidth="1.2" />
                  <path d="M66 86 H90 M110 86 H134" stroke={outline} strokeWidth="1.1" />
                  <path d="M35 136 L55 138 M165 136 L145 138" stroke={outline} strokeWidth="1.5" />
                </>
              )}
            </>
          )}
        </g>
      )}

      {/* ==================== CAPE / KIMONO / PALTO / PEACOAT / TRENCH / BLAZER / CARDIGAN ==================== */}
      {sub === 'cape' && (
        <g>
          <path d="M74 28 Q100 18 126 28 L174 174 Q100 192 26 174 Z" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M74 28 Q100 18 126 28 L174 174 Q100 192 26 174 Z" fill={`url(#cyl-${uid})`} opacity="0.55" />
          <path d="M74 28 Q100 44 126 28" stroke={outline} strokeWidth="1.5" />
          <path d="M58 94 V142 M142 94 V142" stroke={outline} strokeWidth="2" strokeLinecap="round" />
          <path d="M100 38 V184" stroke={detail} strokeWidth="1.1" />
          <path d="M84 56 L66 174 M116 56 L134 174" stroke={highlight} strokeWidth="1.2" opacity="0.6" />
        </g>
      )}

      {sub === 'kimono' && (
        <g>
          <path d="M70 30 L100 72 L130 30 L176 58 L170 132 L144 130 L144 84 L144 202 H56 L56 84 L56 130 L30 132 L24 58 Z" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M70 30 L100 72 L130 30" stroke={outline} strokeWidth="1.8" />
          <path d="M56 124 H144 V134 H56 Z" fill={accentFill} stroke={outline} strokeWidth="1.2" />
          <path d="M96 134 L86 168 M104 134 L114 168" stroke={accentFill} strokeWidth="3.5" strokeLinecap="round" />
        </g>
      )}

      {(sub === 'palto' ||
        sub === 'peacoat' ||
        sub === 'mac_coat' ||
        sub === 'trench' ||
        sub === 'blazer' ||
        sub === 'tuxedo_blazer' ||
        sub === 'fur_coat' ||
        sub === 'cardigan') && (
        <g>
          <path
            d={
              sub === 'blazer' || sub === 'tuxedo_blazer'
                ? 'M68 30 L88 22 L100 34 L112 22 L132 30 L170 54 L160 148 L142 146 L140 82 L138 184 L62 184 L60 82 L58 146 L40 148 L30 54 Z'
                : sub === 'peacoat'
                  ? 'M68 28 L88 20 L100 33 L112 20 L132 28 L170 52 L160 150 L142 148 L140 82 L140 198 L60 198 L60 82 L58 148 L40 150 L30 52 Z'
                  : sub === 'cardigan'
                    ? 'M72 32 L100 76 L128 32 L166 56 L158 152 L140 150 L138 86 L138 202 L62 202 L62 86 L60 150 L42 152 L34 56 Z'
                    : 'M68 26 L88 18 L100 32 L112 18 L132 26 L172 52 L162 152 L144 150 L142 82 L146 218 L54 218 L58 82 L56 150 L38 152 L28 52 Z'
            }
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d={
              sub === 'blazer' || sub === 'tuxedo_blazer'
                ? 'M68 30 L88 22 L100 34 L112 22 L132 30 L170 54 L160 148 L142 146 L140 82 L138 184 L62 184 L60 82 L58 146 L40 148 L30 54 Z'
                : 'M68 26 L88 18 L100 32 L112 18 L132 26 L172 52 L162 152 L144 150 L142 82 L146 218 L54 218 L58 82 L56 150 L38 152 L28 52 Z'
            }
            fill={`url(#cyl-${uid})`}
            opacity="0.48"
          />
          {sub === 'cardigan' ? (
            <>
              <path d="M62 78 H138 V200 H62 Z" fill={`url(#rib-${uid})`} opacity="0.4" />
              <path d="M72 32 L100 78 L128 32" stroke={outline} strokeWidth="1.4" />
              <path d="M100 78 V202" stroke={outline} strokeWidth="1.3" />
              {[94, 120, 146, 172].map((cy) => (
                <circle key={cy} cx="94" cy={cy} r="2.7" fill={accentFill} stroke={outline} strokeWidth="0.9" />
              ))}
              <rect x="68" y="138" width="22" height="24" fill={softShade} stroke={outline} strokeWidth="1" />
              <rect x="110" y="138" width="22" height="24" fill={softShade} stroke={outline} strokeWidth="1" />
            </>
          ) : (
            <>
              <path d="M88 18 L74 58 L86 64 L78 78 L100 102 L122 78 L114 64 L126 58 L112 18" fill={sub === 'tuxedo_blazer' || sub === 'fur_coat' ? accentFill : `url(#cav-${uid})`} opacity={sub === 'tuxedo_blazer' ? '0.85' : '0.45'} stroke={outline} strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M100 102 V198" stroke={detail} strokeWidth="1.1" />
              <path d="M66 138 H86 M114 138 H134" stroke={outline} strokeWidth="1.5" strokeLinecap="round" />
              {(sub === 'trench' || sub === 'peacoat' ? [108, 134, 160] : [110, 140]).map((cy) => (
                <g key={cy}>
                  <circle cx="91" cy={cy} r="2.7" fill={accentFill} stroke={outline} strokeWidth="0.9" />
                  {(sub === 'trench' || sub === 'peacoat') && (
                    <circle cx="109" cy={cy} r="2.7" fill={accentFill} stroke={outline} strokeWidth="0.9" />
                  )}
                </g>
              ))}
              {sub === 'trench' && (
                <>
                  <path d="M56 120 H144 V130 H56 Z" fill={accentFill} stroke={outline} strokeWidth="1.2" />
                  <rect x="94" y="118" width="12" height="14" rx="1" fill="none" stroke={`url(#metal-${uid})`} strokeWidth="1.8" />
                  <path d="M52 38 L70 30 M148 38 L130 30" stroke={outline} strokeWidth="1.6" />
                </>
              )}
              {(sub === 'blazer' || sub === 'tuxedo_blazer') && (
                <path d="M114 82 H128 V90 H114 Z" fill={accentFill} stroke={outline} strokeWidth="0.9" />
              )}
              {sub === 'fur_coat' && (
                <g stroke={highlight} strokeWidth="1.2" opacity="0.65">
                  <path d="M58 106 Q100 112 142 106 M56 146 Q100 152 144 146 M55 186 Q100 192 145 186" />
                </g>
              )}
            </>
          )}
        </g>
      )}

      {/* ==================== PUFFER / CROPPED PUFFER / PARKA / ANORAK / BOMBER / VARSITY / SHEARLING / LEATHER / DENIM / VEST ==================== */}
      {(sub === 'puffer' ||
        sub === 'cropped_puffer' ||
        sub === 'parka' ||
        sub === 'anorak' ||
        sub === 'bomber' ||
        sub === 'varsity' ||
        sub === 'shearling' ||
        sub === 'leather_jacket' ||
        sub === 'denim_jacket' ||
        sub === 'vest') && (
        <g>
          {sub === 'parka' || sub === 'anorak' ? (
            <path d="M72 40 C72 15 128 15 128 40 Z" fill={`url(#cav-${uid})`} stroke={outline} strokeWidth="1.5" />
          ) : sub === 'leather_jacket' || sub === 'shearling' ? (
            <path d="M72 28 L100 44 L128 28 L122 52 H78 Z" fill={sub === 'shearling' ? accentFill : softShade} stroke={outline} strokeWidth="1.4" />
          ) : (
            <path d="M74 28 Q100 36 126 28 L128 44 Q100 50 72 44 Z" fill={softShade} stroke={outline} strokeWidth="1.5" />
          )}

          {sub === 'vest' ? (
            <g>
              <path
                d="M68 40 L52 62 L58 100 L54 188 H146 L142 100 L148 62 L132 40 Z"
                fill={`url(#grad-${uid})`}
                stroke={outline}
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M68 40 L52 62 L58 100 L54 188 H146 L142 100 L148 62 L132 40 Z" fill={`url(#cyl-${uid})`} opacity="0.5" />
              <g stroke={outline} strokeWidth="1.1" opacity="0.72">
                <path d="M56 76 H144 M56 106 H144 M55 136 H145 M54 166 H146" />
              </g>
              <path d="M100 42 V188" stroke={`url(#metal-${uid})`} strokeWidth="2.4" />
              <path d="M68 140 L84 164 M132 140 L116 164" stroke={outline} strokeWidth="1.3" />
            </g>
          ) : (
            <g>
              <path
                d={
                  sub === 'parka'
                    ? 'M68 40 L34 62 L24 148 L46 152 L54 88 L52 208 L148 208 L146 88 L154 152 L176 148 L166 62 L132 40 Z'
                    : sub === 'bomber' || sub === 'varsity' || sub === 'cropped_puffer'
                      ? 'M72 40 L34 60 L26 138 L46 144 L54 86 L56 172 L144 172 L146 86 L154 144 L174 138 L166 60 L128 40 Z'
                      : 'M68 40 L30 62 L22 142 L46 148 L54 88 L52 192 L148 192 L146 88 L154 148 L178 142 L170 62 L132 40 Z'
                }
                fill={`url(#grad-${uid})`}
                stroke={outline}
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M70 42 H130 V172 H70 Z"
                fill={`url(#cyl-${uid})`}
                opacity="0.45"
              />

              {sub === 'varsity' && (
                <>
                  <path d="M72 40 L34 60 L26 138 L46 144 L54 86 Z" fill={accentFill} stroke={outline} strokeWidth="1.4" />
                  <path d="M128 40 L166 60 L174 138 L154 144 L146 86 Z" fill={accentFill} stroke={outline} strokeWidth="1.4" />
                  <path d="M56 160 H144 V172 H56 Z" fill={accentFill} stroke={outline} strokeWidth="1.1" />
                  <path d="M56 166 H144" stroke={outline} strokeWidth="1.2" />
                  {[62, 86, 110, 134, 154].map((cy) => (
                    <circle key={cy} cx="100" cy={cy} r="2.3" fill={`url(#metal-${uid})`} stroke={outline} strokeWidth="0.9" />
                  ))}
                  <path d="M70 76 H84 V92 H70 Z" fill={accentFill} stroke={outline} strokeWidth="1.1" />
                </>
              )}

              {(sub === 'leather_jacket' || sub === 'shearling') && (
                <>
                  <path d="M74 42 L92 84 L74 88 Z M126 42 L108 84 L126 88 Z" fill={sub === 'shearling' ? accentFill : softShade} stroke={outline} strokeWidth="1.3" />
                  <path d="M108 48 L92 178" stroke={`url(#metal-${uid})`} strokeWidth="2.8" />
                  <path d="M62 114 L84 128 M116 114 L138 128" stroke={`url(#metal-${uid})`} strokeWidth="2" />
                  <path d="M52 178 H148 V190 H52 Z" fill={sub === 'shearling' ? accentFill : softShade} stroke={outline} strokeWidth="1.2" />
                  <rect x="92" y="177" width="14" height="14" rx="1" fill="none" stroke={`url(#metal-${uid})`} strokeWidth="1.8" />
                </>
              )}

              {sub === 'anorak' && (
                <>
                  <path d="M100 42 V98" stroke={`url(#metal-${uid})`} strokeWidth="2.6" />
                  <rect x="70" y="106" width="60" height="32" rx="2" fill={softShade} stroke={outline} strokeWidth="1.3" />
                  <path d="M70 116 H130" stroke={outline} strokeWidth="1.2" />
                  <path d="M54 182 H146" stroke={detail} strokeWidth="1.2" strokeDasharray="3 2" />
                </>
              )}

              {sub === 'denim_jacket' && (
                <>
                  <path d="M74 34 L94 52 L106 52 L126 34" fill={softShade} stroke={outline} strokeWidth="1.3" />
                  <rect x="64" y="76" width="24" height="28" fill={softShade} stroke={outline} strokeWidth="1.2" />
                  <rect x="112" y="76" width="24" height="28" fill={softShade} stroke={outline} strokeWidth="1.2" />
                  <path d="M64 84 H88 M112 84 H136" stroke={outline} strokeWidth="1.2" />
                  <path d="M72 44 V186 M128 44 V186" stroke={accentFill} strokeWidth="1.2" strokeDasharray="3 2" />
                  {[62, 92, 122, 152, 178].map((cy) => (
                    <circle key={cy} cx="100" cy={cy} r="2.4" fill={`url(#metal-${uid})`} stroke={outline} strokeWidth="0.9" />
                  ))}
                </>
              )}

              {(sub === 'puffer' || sub === 'cropped_puffer') && (
                <g stroke={outline} strokeWidth="1.2" opacity="0.78">
                  <path d={sub === 'cropped_puffer' ? 'M54 76 H146 M55 108 H145 M55 140 H145' : 'M54 76 H146 M53 106 H147 M53 136 H147 M52 166 H148'} />
                  <path d="M29 90 L50 96 M25 116 L48 122 M171 90 L150 96 M175 116 L152 122" />
                  <path d={sub === 'cropped_puffer' ? 'M100 42 V170' : 'M100 42 V190'} stroke={`url(#metal-${uid})`} strokeWidth="2.4" />
                </g>
              )}

              {(sub === 'parka' || sub === 'bomber') && (
                <>
                  <path d="M100 42 V172" stroke={`url(#metal-${uid})`} strokeWidth="2.4" />
                  <path d="M100 42 V172" stroke={outline} strokeWidth="1" />
                </>
              )}

              {sub === 'bomber' && (
                <>
                  <path d="M56 160 H144 V172 H56 Z" fill={softShade} stroke={outline} strokeWidth="1.1" />
                  <path d="M27 128 L47 134 M173 128 L153 134" stroke={outline} strokeWidth="1.4" />
                  <path d="M64 128 L82 146 M136 128 L118 146" stroke={outline} strokeWidth="1.4" />
                </>
              )}

              {sub === 'parka' && (
                <>
                  <path d="M54 116 H146" stroke={detail} strokeWidth="1.2" strokeDasharray="3 2" />
                  <rect x="62" y="138" width="24" height="28" fill={softShade} stroke={outline} strokeWidth="1.2" />
                  <rect x="114" y="138" width="24" height="28" fill={softShade} stroke={outline} strokeWidth="1.2" />
                </>
              )}
            </g>
          )}
        </g>
      )}

      {/* ==================== BOTTOMS (14 SUBTYPES) ==================== */}
      {category === 'bottom' && (sub === 'skirt' || sub === 'a_line_skirt') && (
        <g>
          <path
            d={
              sub === 'a_line_skirt'
                ? 'M68 42 H132 L152 146 Q100 156 48 146 Z'
                : 'M66 30 H134 L162 204 Q100 214 38 204 Z'
            }
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d={
              sub === 'a_line_skirt'
                ? 'M68 42 H132 L152 146 Q100 156 48 146 Z'
                : 'M66 30 H134 L162 204 Q100 214 38 204 Z'
            }
            fill={`url(#cyl-${uid})`}
            opacity="0.45"
          />
          <path d={sub === 'a_line_skirt' ? 'M68 54 H132' : 'M66 44 H134'} stroke={outline} strokeWidth="1.4" />
          <g stroke={detail} strokeWidth="1.1">
            {sub === 'a_line_skirt' ? (
              <path d="M84 54 L76 146 M116 54 L124 146" />
            ) : (
              <path d="M80 44 L64 204 M94 44 L88 208 M106 44 L112 208 M120 44 L136 204" />
            )}
          </g>
        </g>
      )}

      {category === 'bottom' && sub === 'shorts' && (
        <g>
          <path d="M54 44 H146 L156 142 H108 L100 100 L92 142 H44 Z" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M54 44 H146 L156 142 H108 L100 100 L92 142 H44 Z" fill={`url(#cyl-${uid})`} opacity="0.45" />
          <path d="M54 58 H146" stroke={outline} strokeWidth="1.3" />
          <path d="M100 58 V94" stroke={detail} strokeWidth="1.1" />
          <circle cx="100" cy="51" r="2.2" fill={accentFill} stroke={outline} strokeWidth="0.9" />
          <path d="M54 78 Q68 88 54 96 M146 78 Q132 88 146 96" stroke={detail} strokeWidth="1" />
        </g>
      )}

      {category === 'bottom' && sub !== 'skirt' && sub !== 'a_line_skirt' && sub !== 'shorts' && (
        <g>
          <path
            d={
              sub === 'culottes'
                ? 'M56 26 H144 L164 176 H108 L100 98 L92 176 H36 Z'
                : sub === 'wide_trousers' || sub === 'pleated_trousers'
                  ? 'M56 24 H144 L158 214 H108 L100 100 L92 214 H42 Z'
                  : sub === 'leggings'
                    ? 'M62 24 H138 L136 212 H112 L100 98 L88 212 H64 Z'
                    : sub === 'joggers' || sub === 'track_pants'
                      ? 'M58 24 H142 L148 198 L120 202 L100 104 L80 202 L52 198 Z'
                      : 'M58 24 H142 L148 212 H108 L100 102 L92 212 H52 Z'
            }
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M58 26 H142 V210 H58 Z" fill={`url(#cyl-${uid})`} opacity="0.4" />
          {sub === 'corduroy_pants' && (
            <path d="M58 26 H142 V210 H58 Z" fill={`url(#rib-${uid})`} opacity="0.45" />
          )}
          <path d="M58 38 H142" stroke={outline} strokeWidth="1.3" />
          {[68, 86, 114, 132].map((lx) => (
            <path key={lx} d={`M${lx} 24 V39`} stroke={outline} strokeWidth="1.6" />
          ))}
          <path d="M100 38 V78" stroke={detail} strokeWidth="1.1" />
          <circle cx="100" cy="31" r="2.2" fill={accentFill} stroke={outline} strokeWidth="0.9" />
          {(sub === 'wide_trousers' || sub === 'pleated_trousers' || sub === 'slim_trousers') && (
            <path d="M76 42 L70 210 M124 42 L130 210" stroke={detail} strokeWidth="1.1" opacity="0.7" />
          )}
          {(sub === 'pleated_trousers' || sub === 'culottes') && (
            <path d="M68 40 L66 76 M84 40 L84 76 M116 40 L116 76 M132 40 L134 76" stroke={outline} strokeWidth="1.1" />
          )}
          {sub === 'denim' && (
            <g stroke={accentFill} strokeWidth="1.2" strokeDasharray="3 2">
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
              <path d="M95 36 L92 58 M105 36 L108 58" stroke={accentFill} strokeWidth="1.8" strokeLinecap="round" />
              <path d="M52 190 H82 M118 190 H148" stroke={outline} strokeWidth="1.4" />
            </>
          )}
          {(sub === 'track_pants' || sub === 'leggings') && (
            <path d="M59 38 L53 196 M64 38 L58 196 M141 38 L147 196 M136 38 L142 196" stroke={accentFill} strokeWidth="2" />
          )}
        </g>
      )}

      {/* ==================== DRESSES (9 SUBTYPES) ==================== */}
      {category === 'dress' && (
        <g>
          {sub === 'hoodie_dress' && (
            <path d="M76 42 C76 18 124 18 124 42 Z" fill={`url(#cav-${uid})`} stroke={outline} strokeWidth="1.5" />
          )}
          {sub === 'maxi_sundress' && (
            <path d="M76 22 V44 M124 22 V44" stroke={outline} strokeWidth="2.2" />
          )}
          <path
            d={
              sub === 'shirt_dress' || sub === 'blazer_dress'
                ? 'M72 28 L100 42 L128 28 L142 66 L124 88 L156 210 Q100 220 44 210 L76 88 L58 66 Z'
                : sub === 'hoodie_dress'
                  ? 'M70 40 L40 62 L32 132 L50 136 L58 88 L50 208 Q100 216 150 208 L142 88 L150 136 L168 132 L160 62 L130 40 Z'
                  : sub === 'maxi_sundress'
                    ? 'M72 44 Q100 54 128 44 L132 84 L164 224 Q100 232 36 224 L68 84 Z'
                    : sub === 'cocktail_dress'
                      ? 'M72 34 Q100 52 128 34 L132 82 L142 164 Q100 172 58 164 L68 82 Z'
                      : 'M72 28 Q100 44 128 28 L138 66 L124 88 L152 212 Q100 222 48 212 L76 88 L62 66 Z'
            }
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M70 40 H130 L148 212 H52 Z" fill={`url(#cyl-${uid})`} opacity="0.48" />
          <path d="M75 90 H125" stroke={accentFill} strokeWidth="3.5" />
          <path d="M75 90 H125" stroke={outline} strokeWidth="1" />
          {(sub === 'shirt_dress' || sub === 'blazer_dress') && (
            <path d="M100 42 V214" stroke={detail} strokeWidth="1.1" strokeDasharray="3 3" />
          )}
          {sub === 'blazer_dress' && (
            <>
              <path d="M84 32 L100 72 L116 32" stroke={outline} strokeWidth="1.4" fill="none" />
              {[104, 128, 152].map((cy) => (
                <g key={cy}>
                  <circle cx="91" cy={cy} r="2.4" fill={accentFill} stroke={outline} strokeWidth="0.9" />
                  <circle cx="109" cy={cy} r="2.4" fill={accentFill} stroke={outline} strokeWidth="0.9" />
                </g>
              ))}
            </>
          )}
          {sub === 'knit_dress' && (
            <>
              <path d="M56 54 H144 V210 H56 Z" fill={`url(#rib-${uid})`} opacity="0.4" />
              <path d="M84 48 L72 210 M100 48 V214 M116 48 L128 210" stroke={detail} strokeWidth="0.9" opacity="0.55" />
            </>
          )}
          {sub === 'atlas_dress' && (
            <path
              d="M72 110 L86 98 L100 110 L114 98 L128 110 M62 148 L82 134 L100 148 L118 134 L138 148 M54 186 L78 170 L100 186 L122 170 L146 186"
              stroke={accentFill}
              strokeWidth="2.2"
              opacity="0.82"
              fill="none"
            />
          )}
          {(sub === 'midi_silk' || sub === 'cocktail_dress' || sub === 'aline_dress') && (
            <path d="M88 94 Q80 156 68 212 M112 94 Q120 156 132 212" stroke={highlight} strokeWidth="1.5" />
          )}
        </g>
      )}

      {/* ==================== SHOES (12 SUBTYPES WITH 3D MIDSOLE & FLOOR SHADOW) ==================== */}
      {(sub === 'sneakers' || sub === 'canvas_sneakers' || sub === 'running_shoes') && (
        <g>
          <ellipse cx="102" cy="183" rx="68" ry="6" fill="rgba(0,0,0,0.22)" />
          <path
            d={
              sub === 'running_shoes'
                ? 'M40 94 L66 94 L86 116 L162 134 C172 138 176 150 170 162 L34 162 L34 130 Z'
                : 'M42 96 L64 96 L82 118 L156 136 C168 140 172 152 168 164 L36 164 L36 134 Z'
            }
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M56 124 Q95 118 148 140" stroke={highlight} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
          <path
            d={
              sub === 'running_shoes'
                ? 'M33 160 H171 L168 179 Q100 185 33 176 Z'
                : 'M35 162 H169 V176 H35 Z'
            }
            fill="#F4EFE6"
            stroke={outline}
            strokeWidth="1.4"
          />
          <path d="M35 176 H169 V181 H35 Z" fill={accentFill} stroke={outline} strokeWidth="1" />
          <path d="M88 120 L98 114 M98 124 L108 118 M108 128 L118 122" stroke={accentFill} strokeWidth="2.3" strokeLinecap="round" />
          <path d="M52 138 Q84 150 118 134" stroke={detail} strokeWidth="1.4" />
          {sub === 'running_shoes' && (
            <path d="M68 132 L114 148 M76 126 L122 142" stroke={accentFill} strokeWidth="2.2" />
          )}
        </g>
      )}

      {(sub === 'chelsea_boots' || sub === 'lug_boots') && (
        <g>
          <ellipse cx="105" cy="186" rx="64" ry="6" fill="rgba(0,0,0,0.25)" />
          <path
            d="M52 54 H98 L104 124 L154 138 C166 142 170 154 166 168 L44 168 L48 130 Z"
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M56 58 H74 L144 146 H50 Z" fill={`url(#cyl-${uid})`} opacity="0.4" />
          <path d="M54 54 V42 H64 V54" stroke={outline} strokeWidth="1.5" fill={accentFill} />
          {sub === 'chelsea_boots' ? (
            <path d="M68 68 H86 V126 Q77 132 68 126 Z" fill={softShade} stroke={outline} strokeWidth="1.1" />
          ) : (
            <g stroke={accentFill} strokeWidth="2.1">
              <path d="M98 70 L108 70 M100 86 L110 86 M102 102 L112 102" />
            </g>
          )}
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

      {(sub === 'loafers' || sub === 'derbies' || sub === 'moccasins') && (
        <g>
          <ellipse cx="101" cy="177" rx="66" ry="5" fill="rgba(0,0,0,0.22)" />
          <path
            d="M44 116 C60 124 80 120 96 108 L122 126 L160 138 C170 142 172 156 166 164 L36 164 L38 136 Z"
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M104 128 Q132 138 158 148" stroke={highlight} strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
          {sub === 'loafers' ? (
            <path d="M84 114 L106 130 L96 138 L74 122 Z" fill={softShade} stroke={outline} strokeWidth="1.2" />
          ) : sub === 'moccasins' ? (
            <path d="M104 128 Q128 138 152 146" stroke={accentFill} strokeWidth="1.6" strokeDasharray="3 3" />
          ) : (
            <>
              <path d="M90 116 L100 111 M98 122 L108 117 M106 128 L116 123" stroke={accentFill} strokeWidth="2" strokeLinecap="round" />
              <path d="M126 138 Q136 150 156 154" stroke={detail} strokeWidth="1" strokeDasharray="2 2" />
            </>
          )}
          <path d="M36 164 H166 V171 H98 V168 H78 V176 H36 Z" fill="#1D1A17" stroke={outline} strokeWidth="1.1" />
        </g>
      )}

      {sub === 'heels' && (
        <g>
          <ellipse cx="104" cy="184" rx="62" ry="5" fill="rgba(0,0,0,0.22)" />
          <path
            d="M42 94 C54 118 78 136 120 142 L166 152 C172 156 170 166 158 166 H102 L68 126 L56 178 H44 L44 120 Z"
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M62 114 Q96 142 154 156" stroke={highlight} strokeWidth="2" opacity="0.55" />
        </g>
      )}

      {(sub === 'ballet_flats' || sub === 'mules') && (
        <g>
          <ellipse cx="102" cy="172" rx="66" ry="5" fill="rgba(0,0,0,0.2)" />
          <path
            d={
              sub === 'mules'
                ? 'M54 154 L94 122 L158 140 C168 144 170 156 164 164 H38 L46 156 Z'
                : 'M40 130 Q74 148 118 134 L160 144 C170 148 170 160 164 166 H36 L36 142 Z'
            }
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {sub === 'ballet_flats' && (
            <path d="M126 136 L136 128 L138 140 L148 132" stroke={accentFill} strokeWidth="1.8" fill="none" />
          )}
          <path d="M36 166 H164 V172 H36 Z" fill="#1D1A17" stroke={outline} strokeWidth="1" />
        </g>
      )}

      {sub === 'sandals' && (
        <g>
          <ellipse cx="102" cy="172" rx="66" ry="5" fill="rgba(0,0,0,0.2)" />
          <path d="M36 154 Q102 162 170 154 L166 168 Q102 174 38 168 Z" fill={accentFill} stroke={outline} strokeWidth="1.5" />
          <path d="M52 156 L58 118 H78 L72 156" fill={color} stroke={outline} strokeWidth="1.4" />
          <path d="M114 156 L128 132 H148 L138 156" fill={color} stroke={outline} strokeWidth="1.4" />
          <rect x="60" y="122" width="8" height="6" fill={`url(#metal-${uid})`} stroke={outline} strokeWidth="1" />
        </g>
      )}

      {/* ==================== BAGS (10 SUBTYPES WITH 3D EXTRUDED GUSSET) ==================== */}
      {(sub === 'tote' || sub === 'woven_tote') && (
        <g>
          {/* Back handle depth */}
          <path d="M78 78 C78 36 134 36 134 78" stroke={detail} strokeWidth="2.2" fill="none" />
          {/* 3D Side Gusset */}
          <path d="M156 78 L170 86 L176 196 L164 202 Z" fill={deepShade} stroke={outline} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M44 78 H156 L164 202 H36 Z" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
          {sub === 'woven_tote' && (
            <g stroke={detail} strokeWidth="1" opacity="0.55">
              <path d="M42 118 H158 M40 144 H160 M38 170 H162" />
              <path d="M64 102 L58 202 M90 102 L88 202 M116 102 L118 202 M140 102 L144 202" />
            </g>
          )}
          <path d="M72 78 C72 34 128 34 128 78" stroke={outline} strokeWidth="3.2" fill="none" />
          <path d="M44 102 H156" stroke={detail} strokeWidth="1.2" />
          <path d="M72 78 V126 M128 78 V126" stroke={outline} strokeWidth="1.4" />
          <rect x="93" y="96" width="14" height="10" rx="1" fill={`url(#metal-${uid})`} stroke={outline} strokeWidth="1.1" />
        </g>
      )}

      {sub === 'briefcase' && (
        <g>
          <path d="M80 76 C80 56 120 56 120 76" stroke={outline} strokeWidth="3" fill="none" />
          <path d="M168 78 L178 86 V186 L166 190 Z" fill={deepShade} stroke={outline} strokeWidth="1.4" />
          <rect x="32" y="78" width="136" height="110" rx="4" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" />
          <path d="M32 118 H168" stroke={outline} strokeWidth="1.4" />
          <rect x="54" y="112" width="14" height="12" rx="1" fill={`url(#metal-${uid})`} stroke={outline} strokeWidth="1" />
          <rect x="132" y="112" width="14" height="12" rx="1" fill={`url(#metal-${uid})`} stroke={outline} strokeWidth="1" />
        </g>
      )}

      {sub === 'baguette' && (
        <g>
          <path d="M56 102 C56 54 144 54 144 102" stroke={outline} strokeWidth="2.8" fill="none" />
          <path d="M164 102 L174 110 V168 L160 172 Z" fill={deepShade} stroke={outline} strokeWidth="1.3" />
          <rect x="36" y="102" width="128" height="68" rx="12" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" />
          <path d="M38 128 L100 140 L162 128" fill={softShade} stroke={outline} strokeWidth="1.3" />
          <rect x="92" y="134" width="16" height="10" rx="1" fill={`url(#metal-${uid})`} stroke={outline} strokeWidth="1" />
        </g>
      )}

      {sub === 'belt_bag' && (
        <g>
          <path d="M20 112 H44 M156 112 H180" stroke={outline} strokeWidth="5" strokeLinecap="round" />
          <path d="M40 94 H160 L150 150 Q100 162 50 150 Z" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M54 110 H146" stroke={`url(#metal-${uid})`} strokeWidth="2.5" />
          <rect x="95" y="106" width="10" height="8" rx="1" fill={`url(#metal-${uid})`} stroke={outline} strokeWidth="0.9" />
        </g>
      )}

      {sub === 'crossbody' && (
        <g>
          <path d="M62 84 C62 24 138 24 138 84" stroke={outline} strokeWidth="2.4" fill="none" />
          <path d="M156 84 L168 92 V176 L156 180 Z" fill={deepShade} stroke={outline} strokeWidth="1.4" strokeLinejoin="round" />
          <rect x="44" y="84" width="112" height="96" rx="4" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" />
          <path d="M44 120 L100 134 L156 120" fill={softShade} stroke={outline} strokeWidth="1.3" />
          <circle cx="100" cy="134" r="4.5" fill={`url(#metal-${uid})`} stroke={outline} strokeWidth="1.1" />
        </g>
      )}

      {sub === 'saddle' && (
        <g>
          <path d="M58 84 C58 26 142 26 142 84" stroke={outline} strokeWidth="2.4" fill="none" />
          <path d="M44 84 H156 L162 132 C162 178 40 178 38 132 Z" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M44 84 H156 L150 126 C140 156 60 156 50 126 Z" fill={softShade} stroke={outline} strokeWidth="1.4" />
          <path d="M100 144 V166" stroke={`url(#metal-${uid})`} strokeWidth="5" strokeLinecap="round" />
          <circle cx="100" cy="156" r="5" fill={`url(#metal-${uid})`} stroke={outline} strokeWidth="1.1" />
        </g>
      )}

      {sub === 'backpack' && (
        <g>
          <path d="M84 44 C84 26 116 26 116 44" stroke={outline} strokeWidth="2.5" fill="none" />
          <path d="M148 72 L162 84 L166 194 L154 198 Z" fill={deepShade} stroke={outline} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M52 72 C52 46 148 46 148 72 L154 198 H46 Z" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
          <rect x="64" y="128" width="72" height="54" rx="2" fill={softShade} stroke={outline} strokeWidth="1.2" />
          <path d="M68 142 H132" stroke={`url(#metal-${uid})`} strokeWidth="2.2" />
        </g>
      )}

      {sub === 'duffle' && (
        <g>
          <path d="M74 96 C74 52 126 52 126 96" stroke={outline} strokeWidth="2.8" fill="none" />
          <rect x="30" y="96" width="140" height="78" rx="14" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" />
          <ellipse cx="164" cy="135" rx="14" ry="36" fill={deepShade} stroke={outline} strokeWidth="1.4" />
          <path d="M74 96 V174 M126 96 V174" stroke={accentFill} strokeWidth="4" />
          <path d="M38 110 H150" stroke={`url(#metal-${uid})`} strokeWidth="2.2" />
        </g>
      )}

      {sub === 'clutch' && (
        <g>
          <path d="M164 94 L174 102 L166 168 L156 164 Z" fill={deepShade} stroke={outline} strokeWidth="1.3" />
          <path d="M36 94 H164 L156 164 H44 Z" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M38 112 L100 128 L162 112" stroke={outline} strokeWidth="1.3" />
          <rect x="90" y="122" width="20" height="8" rx="1" fill={`url(#metal-${uid})`} stroke={outline} strokeWidth="1.1" />
        </g>
      )}

      {/* ==================== ACCESSORIES (11 SUBTYPES) ==================== */}
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
          <circle cx="100" cy="82" r="3" fill={`url(#metal-${uid})`} stroke={outline} strokeWidth="1" />
          <path d="M44 132 Q112 122 178 142 Q128 154 44 138 Z" fill={softShade} stroke={outline} strokeWidth="1.5" />
        </g>
      )}

      {sub === 'bucket_hat' && (
        <g>
          <path d="M62 124 L72 78 Q100 72 128 78 L138 124 Z" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M62 124 L30 144 Q100 162 170 144 L138 124 Z" fill={softShade} stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M64 116 H136" stroke={accentFill} strokeWidth="2.5" />
        </g>
      )}

      {sub === 'beanie' && (
        <g>
          <path d="M50 132 C50 68 150 68 150 132 Z" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" />
          <path d="M50 96 C64 78 136 78 150 96 V132 H50 Z" fill={`url(#rib-${uid})`} opacity="0.4" />
          <rect x="46" y="128" width="108" height="34" rx="3" fill={color} stroke={outline} strokeWidth="1.6" />
          <g stroke={detail} strokeWidth="1.1">
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
          <path d="M88 112 Q100 104 112 112" stroke={`url(#metal-${uid})`} strokeWidth="2.6" />
          <path d="M36 114 L76 138 M122 114 L162 138" stroke={highlight} strokeWidth="2.4" opacity="0.75" />
        </g>
      )}

      {sub === 'belt' && (
        <g>
          <path d="M22 108 H152 V132 H22 Z" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" />
          <rect x="148" y="102" width="28" height="36" rx="2" fill="none" stroke={`url(#metal-${uid})`} strokeWidth="3.8" />
          <rect x="148" y="102" width="28" height="36" rx="2" fill="none" stroke={outline} strokeWidth="1.2" />
          <path d="M148 120 H164" stroke={outline} strokeWidth="2" />
          {[50, 68, 86, 104].map((x) => (
            <circle key={x} cx={x} cy="120" r="2" fill={outline} />
          ))}
        </g>
      )}

      {sub === 'watch' && (
        <g>
          <rect x="83" y="32" width="34" height="52" rx="2" fill={color} stroke={outline} strokeWidth="1.5" />
          <rect x="83" y="156" width="34" height="52" rx="2" fill={color} stroke={outline} strokeWidth="1.5" />
          <path d="M90 32 V84 M110 32 V84 M90 156 V208 M110 156 V208" stroke={detail} strokeWidth="0.9" strokeDasharray="2 2" />
          <rect x="135" y="114" width="6" height="12" rx="1" fill={`url(#metal-${uid})`} stroke={outline} strokeWidth="1" />
          <circle cx="100" cy="120" r="36" fill={`url(#metal-${uid})`} stroke={outline} strokeWidth="2" />
          <circle cx="100" cy="120" r="29" fill="#FAF7F0" stroke={outline} strokeWidth="1" />
          {/* 3D sapphire mineral glass diagonal glare */}
          <path d="M78 106 L114 96 L96 142 Z" fill="rgba(255,255,255,0.45)" />
          <path d="M100 94 V98 M100 142 V146 M74 120 H78 M122 120 H126" stroke="#151412" strokeWidth="1.5" />
          <path d="M100 120 V101 M100 120 L115 129" stroke="#151412" strokeWidth="2.1" strokeLinecap="round" />
          <circle cx="100" cy="120" r="2.2" fill="#8F1D2C" />
        </g>
      )}

      {sub === 'tie' && (
        <g>
          <path d="M88 32 H112 L106 54 H94 Z" fill={color} stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M94 54 H106 L116 176 L100 202 L84 176 Z" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M91 82 L109 98 M89 116 L111 134 M87 150 L113 168" stroke={accentFill} strokeWidth="2.4" opacity="0.78" />
        </g>
      )}

      {sub === 'gloves' && (
        <g>
          <path
            d="M66 94 L66 192 H124 V142 L144 122 C150 116 144 106 136 112 L120 128 V74 C120 66 110 66 110 74 V110 H104 V62 C104 54 94 54 94 62 V108 H88 V66 C88 58 78 58 78 66 V112 H74 V82 C74 74 66 74 66 94 Z"
            fill={`url(#grad-${uid})`}
            stroke={outline}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M66 176 H124" stroke={accentFill} strokeWidth="2.2" />
          <path d="M84 134 V162 M96 132 V162 M108 134 V162" stroke={detail} strokeWidth="1" />
        </g>
      )}

      {sub === 'bracelet' && (
        <g>
          <ellipse cx="100" cy="122" rx="44" ry="30" fill="none" stroke={outline} strokeWidth="10" />
          <ellipse cx="100" cy="122" rx="44" ry="30" fill="none" stroke={color} strokeWidth="7" />
          <ellipse cx="100" cy="122" rx="44" ry="30" fill="none" stroke={highlight} strokeWidth="2" strokeDasharray="16 28" />
          <rect x="92" y="146" width="16" height="10" rx="2" fill={`url(#metal-${uid})`} stroke={outline} strokeWidth="1.2" />
        </g>
      )}

      {sub === 'doppi' && (
        <g>
          <path d="M52 138 L60 92 L100 80 L140 92 L148 138 Z" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M52 130 H148 V142 H52 Z" fill={softShade} stroke={outline} strokeWidth="1.3" />
          <path d="M72 108 Q80 96 86 112 M128 108 Q120 96 114 112 M96 102 Q100 90 104 102" stroke={accentFill} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </g>
      )}

      {sub === 'fedora' && (
        <g>
          <path d="M64 128 L74 74 Q100 84 126 74 L136 128 Z" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M64 118 H136 V128 H64 Z" fill={accentFill} stroke={outline} strokeWidth="1.2" />
          <ellipse cx="100" cy="134" rx="76" ry="15" fill={color} stroke={outline} strokeWidth="1.6" />
          <ellipse cx="100" cy="132" rx="44" ry="8" fill={softShade} />
        </g>
      )}

      {sub === 'bowtie' && (
        <g>
          <path d="M36 92 L92 114 V126 L36 148 Z M164 92 L108 114 V126 L164 148 Z" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
          <rect x="90" y="108" width="20" height="24" rx="3" fill={accentFill} stroke={outline} strokeWidth="1.5" />
        </g>
      )}

      {sub === 'earrings' && (
        <g>
          <circle cx="72" cy="126" r="28" fill="none" stroke={outline} strokeWidth="8" />
          <circle cx="72" cy="126" r="28" fill="none" stroke={`url(#metal-${uid})`} strokeWidth="5.5" />
          <circle cx="128" cy="126" r="28" fill="none" stroke={outline} strokeWidth="8" />
          <circle cx="128" cy="126" r="28" fill="none" stroke={`url(#metal-${uid})`} strokeWidth="5.5" />
        </g>
      )}

      {sub === 'necklace' && (
        <g>
          <path d="M58 64 C58 148 142 148 142 64" fill="none" stroke={outline} strokeWidth="5" strokeLinecap="round" />
          <path d="M58 64 C58 148 142 148 142 64" fill="none" stroke={`url(#metal-${uid})`} strokeWidth="3" strokeDasharray="4 3" strokeLinecap="round" />
          <circle cx="100" cy="146" r="10" fill={color} stroke={outline} strokeWidth="1.6" />
          <circle cx="100" cy="146" r="5" fill={`url(#metal-${uid})`} />
        </g>
      )}

      {sub === 'umbrella' && (
        <g>
          <path d="M30 116 C36 52 164 52 170 116 Q135 104 100 116 Q65 104 30 116 Z" fill={`url(#grad-${uid})`} stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M100 54 V178 C100 192 118 192 118 178" fill="none" stroke={outline} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M100 62 L66 110 M100 62 L134 110" stroke={detail} strokeWidth="1.1" />
        </g>
      )}
    </svg>
  );
}
