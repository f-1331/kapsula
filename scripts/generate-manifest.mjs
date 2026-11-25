import fs from 'node:fs';
import path from 'node:path';

/**
 * Generates /public/assets/manifest.json with 6,240 branded garments
 * across 65 distinct garment subtypes, 18 global & Uzbek brands, 16 rich palettes,
 * 8 occasions, and 32 editorial looks.
 *
 * Strict Uzbek orthography: uses U+02BB (ʻ) for oʻ/gʻ and U+2019 (’) for apostrophes.
 */

const PALETTES = [
  { id: 'sand', name_uz: 'Qum', name_en: 'Sand & Ivory', tagline_uz: 'Iliq neytral ohanglar', colors: ['#F4EFE6', '#E2D3BA', '#C4A27A', '#8B6B4F', '#2F2A26'], image: 'palettes/sand.webp' },
  { id: 'earth', name_uz: 'Tuproq', name_en: 'Terracotta & Olive', tagline_uz: 'Tabiiy terakota va zaytun', colors: ['#EFE7D6', '#D3A17E', '#B2573A', '#6D7048', '#3E3228'], image: 'palettes/earth.webp' },
  { id: 'marine', name_uz: 'Dengiz', name_en: 'Marine & Slate', tagline_uz: 'Sokin koʻk va kulrang uygʻunligi', colors: ['#F6F6F3', '#B8B3A8', '#9FB4C9', '#25345A', '#34373D'], image: 'palettes/marine.webp' },
  { id: 'bloom', name_uz: 'Bahor', name_en: 'Blush & Sage', tagline_uz: 'Yumshoq pushti va ohak tuslari', colors: ['#F7ECE8', '#E8C6C0', '#B8C4AB', '#A596A8', '#6B5B57'], image: 'palettes/bloom.webp' },
  { id: 'noir', name_uz: 'Tun', name_en: 'Noir & Crimson', tagline_uz: 'Qora, fil suyagi va qirmizi urgʻu', colors: ['#121212', '#F4F2EE', '#8F1D2C', '#C7CBD1', '#4B1D26'], image: 'palettes/noir.webp' },
  { id: 'emerald', name_uz: 'Zumrad', name_en: 'Emerald & Brass', tagline_uz: 'Chuqur zumrad va oltin kontrast', colors: ['#F4F2EE', '#1B5E42', '#8EB69B', '#C99345', '#1C2420'], image: 'palettes/emerald.webp' },
  { id: 'cobalt', name_uz: 'Kobalt', name_en: 'Cobalt & Ice', tagline_uz: 'Zamonaviy moviy va muz oq tuslar', colors: ['#F6F6F3', '#1E448A', '#D9E4EC', '#525866', '#151821'], image: 'palettes/cobalt.webp' },
  { id: 'espresso', name_uz: 'Kofe', name_en: 'Espresso & Caramel', tagline_uz: 'Issiq shokolad va karamel qatlamlari', colors: ['#EFE3C8', '#B98E5E', '#7A5434', '#3E3228', '#221A14'], image: 'palettes/espresso.webp' },
  { id: 'lavender', name_uz: 'Lavanda', name_en: 'Lavender & Pearl', tagline_uz: 'Nafis binafsha va marvarid kulrang', colors: ['#F7ECE8', '#A596A8', '#5B2C49', '#B8B3A8', '#2C2630'], image: 'palettes/lavender.webp' },
  { id: 'sunset', name_uz: 'Shafaq', name_en: 'Sunset Coral', tagline_uz: 'Kechki shafaq, gʻisht va marjon tus', colors: ['#F4EFE6', '#D6614A', '#9E472D', '#C87B28', '#3E3228'], image: 'palettes/sunset.webp' },
  { id: 'forest', name_uz: 'Oʻrmon', name_en: 'Forest & Moss', tagline_uz: 'Oʻrmon yashili va xaki uygʻunligi', colors: ['#EFE7D6', '#435847', '#6D7048', '#8EB69B', '#273026'], image: 'palettes/forest.webp' },
  { id: 'monochrome', name_uz: 'Monoxrom', name_en: 'Architectural Stone', tagline_uz: 'Oppoq, kulrang va grafit muvozanati', colors: ['#F6F6F3', '#C7CBD1', '#888D96', '#525866', '#121212'], image: 'palettes/monochrome.webp' },
  { id: 'amber', name_uz: 'Qahrabo', name_en: 'Amber & Bronze', tagline_uz: 'Kuzgi xantal, bronza va toʻq jigar', colors: ['#EFE3C8', '#C87B28', '#C99345', '#7A5434', '#2F2A26'], image: 'palettes/amber.webp' },
  { id: 'denim', name_uz: 'Jinsi', name_en: 'Indigo Denim', tagline_uz: 'Klassik indigo, osmon koʻk va qum', colors: ['#F4EFE6', '#9FB4C9', '#25345A', '#1E448A', '#8B6B4F'], image: 'palettes/denim.webp' },
  { id: 'pearl', name_uz: 'Marvarid', name_en: 'Champagne & Silk', tagline_uz: 'Yorugʻ ipak, shampan va sutrang tus', colors: ['#F6F6F3', '#EFE3C8', '#E2D3BA', '#D9E4EC', '#6B5B57'], image: 'palettes/pearl.webp' },
  { id: 'ruby', name_uz: 'Yoqut', name_en: 'Ruby & Charcoal', tagline_uz: 'Bordo, olxoʻri va tutunli grafit', colors: ['#F4F2EE', '#8F1D2C', '#5B2C49', '#34373D', '#121212'], image: 'palettes/ruby.webp' },
];

const BRANDS = [
  { name: 'Zara', tier: 'mid', affinity: ['office', 'party', 'date', 'university', 'walk'] },
  { name: 'Massimo Dutti', tier: 'premium', affinity: ['office', 'date', 'party', 'school'] },
  { name: 'COS', tier: 'premium', affinity: ['office', 'university', 'date', 'walk'] },
  { name: 'Uniqlo', tier: 'budget', affinity: ['school', 'university', 'office', 'travel', 'walk'] },
  { name: 'Mango', tier: 'mid', affinity: ['office', 'date', 'party', 'university'] },
  { name: 'H&M', tier: 'budget', affinity: ['school', 'university', 'walk', 'sport'] },
  { name: 'Nike', tier: 'mid', affinity: ['sport', 'walk', 'university', 'travel'] },
  { name: 'Adidas', tier: 'mid', affinity: ['sport', 'walk', 'university', 'travel'] },
  { name: 'New Balance', tier: 'mid', affinity: ['sport', 'walk', 'university', 'travel'] },
  { name: 'Loro Piana', tier: 'premium', affinity: ['office', 'party', 'date'] },
  { name: 'Ralph Lauren', tier: 'premium', affinity: ['school', 'university', 'office', 'date'] },
  { name: 'Lacoste', tier: 'premium', affinity: ['school', 'university', 'sport', 'date'] },
  { name: 'Brunello Cucinelli', tier: 'premium', affinity: ['office', 'party', 'date', 'travel'] },
  { name: 'The North Face', tier: 'mid', affinity: ['travel', 'walk', 'sport', 'university'] },
  { name: 'Carhartt WIP', tier: 'mid', affinity: ['walk', 'university', 'travel'] },
  { name: '7SABER', tier: 'mid', affinity: ['sport', 'walk', 'university', 'travel'] },
  { name: 'Terra Pro', tier: 'budget', affinity: ['school', 'university', 'office', 'walk'] },
  { name: 'Just!', tier: 'budget', affinity: ['school', 'university', 'walk', 'travel'] },
];

const SWATCHES = [
  { key: 'ivory', name_uz: 'Fil suyagi', name_en: 'Ivory', hex: '#F4EFE6', hex2: null, palettes: ['sand', 'earth', 'bloom', 'marine', 'pearl', 'denim'] },
  { key: 'cream', name_uz: 'Qaymoqrang', name_en: 'Cream', hex: '#EFE7D6', hex2: '#C4A27A', palettes: ['sand', 'earth', 'bloom', 'forest', 'pearl'] },
  { key: 'champagne', name_uz: 'Shampan', name_en: 'Champagne', hex: '#EFE3C8', hex2: '#8B6B4F', palettes: ['pearl', 'espresso', 'amber', 'sand'] },
  { key: 'beige', name_uz: 'Bej', name_en: 'Beige', hex: '#E2D3BA', hex2: null, palettes: ['sand', 'bloom', 'pearl'] },
  { key: 'tan', name_uz: 'Qumrang', name_en: 'Sand', hex: '#C4A27A', hex2: '#EFE7D6', palettes: ['sand', 'earth', 'amber'] },
  { key: 'camel', name_uz: 'Tuyarang', name_en: 'Camel', hex: '#B98E5E', hex2: '#2F2A26', palettes: ['sand', 'earth', 'espresso'] },
  { key: 'cognac', name_uz: 'Konyakrang', name_en: 'Cognac', hex: '#8B6B4F', hex2: '#E2D3BA', palettes: ['sand', 'earth', 'denim', 'espresso'] },
  { key: 'bronze', name_uz: 'Bronza', name_en: 'Bronze', hex: '#7A5434', hex2: '#EFE3C8', palettes: ['amber', 'espresso', 'earth'] },
  { key: 'espresso', name_uz: 'Toʻq qahva', name_en: 'Espresso', hex: '#3E3228', hex2: '#C4A27A', palettes: ['earth', 'sand', 'noir', 'espresso', 'sunset'] },
  { key: 'terracotta', name_uz: 'Terakota', name_en: 'Terracotta', hex: '#B2573A', hex2: '#EFE7D6', palettes: ['earth', 'sand', 'sunset'] },
  { key: 'coral', name_uz: 'Marjon', name_en: 'Coral', hex: '#D6614A', hex2: '#F4EFE6', palettes: ['sunset', 'bloom'] },
  { key: 'rust', name_uz: 'Gʻishtrang', name_en: 'Rust', hex: '#9E472D', hex2: null, palettes: ['earth', 'sunset', 'amber'] },
  { key: 'amber', name_uz: 'Qahrabo', name_en: 'Amber', hex: '#C87B28', hex2: '#3E3228', palettes: ['amber', 'sunset', 'earth'] },
  { key: 'ochre', name_uz: 'Xantalrang', name_en: 'Ochre', hex: '#C99345', hex2: '#3E3228', palettes: ['earth', 'sand', 'emerald', 'amber'] },
  { key: 'olive', name_uz: 'Zaytun', name_en: 'Olive', hex: '#6D7048', hex2: '#3E3228', palettes: ['earth', 'sand', 'forest'] },
  { key: 'forest', name_uz: 'Oʻrmon yashili', name_en: 'Forest', hex: '#435847', hex2: '#EFE7D6', palettes: ['earth', 'marine', 'forest'] },
  { key: 'emerald', name_uz: 'Zumrad', name_en: 'Emerald', hex: '#1B5E42', hex2: '#C99345', palettes: ['emerald', 'forest'] },
  { key: 'mint', name_uz: 'Yalpiz', name_en: 'Mint', hex: '#8EB69B', hex2: '#F4F2EE', palettes: ['emerald', 'forest', 'bloom'] },
  { key: 'sage', name_uz: 'Ohak yashili', name_en: 'Sage', hex: '#B8C4AB', hex2: '#F7ECE8', palettes: ['bloom', 'sand', 'forest'] },
  { key: 'blush', name_uz: 'Yumshoq pushti', name_en: 'Blush', hex: '#E8C6C0', hex2: null, palettes: ['bloom', 'noir', 'pearl'] },
  { key: 'lavender', name_uz: 'Lavanda kulrang', name_en: 'Muted Lavender', hex: '#A596A8', hex2: '#F7ECE8', palettes: ['bloom', 'marine', 'lavender'] },
  { key: 'plum', name_uz: 'Olxoʻri', name_en: 'Deep Plum', hex: '#5B2C49', hex2: '#F7ECE8', palettes: ['lavender', 'ruby', 'noir'] },
  { key: 'ice', name_uz: 'Muz koʻk', name_en: 'Ice Mist', hex: '#D9E4EC', hex2: '#34373D', palettes: ['cobalt', 'pearl', 'marine'] },
  { key: 'sky', name_uz: 'Osmon koʻk', name_en: 'Slate Blue', hex: '#9FB4C9', hex2: '#F6F6F3', palettes: ['marine', 'sand', 'denim'] },
  { key: 'cobalt', name_uz: 'Kobalt koʻk', name_en: 'Cobalt', hex: '#1E448A', hex2: '#D9E4EC', palettes: ['cobalt', 'denim', 'marine'] },
  { key: 'navy', name_uz: 'Toʻq koʻk', name_en: 'Navy', hex: '#25345A', hex2: '#F6F6F3', palettes: ['marine', 'noir', 'sand', 'denim', 'cobalt'] },
  { key: 'slate', name_uz: 'Poʻlat kulrang', name_en: 'Steel Slate', hex: '#525866', hex2: '#D9E4EC', palettes: ['monochrome', 'cobalt', 'marine'] },
  { key: 'charcoal', name_uz: 'Grafit', name_en: 'Charcoal', hex: '#34373D', hex2: '#C7CBD1', palettes: ['marine', 'noir', 'sand', 'monochrome', 'ruby'] },
  { key: 'crimson', name_uz: 'Qirmizi', name_en: 'Crimson', hex: '#8F1D2C', hex2: '#F4F2EE', palettes: ['noir', 'sand', 'ruby'] },
  { key: 'noir', name_uz: 'Qora', name_en: 'Black', hex: '#121212', hex2: '#C7CBD1', palettes: ['noir', 'marine', 'sand', 'bloom', 'monochrome', 'ruby'] },
  { key: 'white', name_uz: 'Oppoq', name_en: 'Crisp White', hex: '#F6F6F3', hex2: null, palettes: ['marine', 'noir', 'sand', 'bloom', 'cobalt', 'monochrome', 'pearl'] },
  { key: 'stone', name_uz: 'Tosh kulrang', name_en: 'Stone Gray', hex: '#B8B3A8', hex2: '#34373D', palettes: ['marine', 'sand', 'noir', 'monochrome', 'lavender'] },
];

// 65 distinct garment subtypes across all 7 categories
const SUBTYPES = [
  // OUTERWEAR (15)
  { key: 'palto', category: 'outerwear', name_uz: 'uzun palto', name_en: 'long wool coat', fabrics: [{ uz: 'jun', en: 'wool' }, { uz: 'kashmir', en: 'cashmere' }, { uz: 'tvid', en: 'tweed' }], weather: ['cool', 'cold'], occasions: ['office', 'party', 'date', 'school', 'walk'], warmth: 3, formality: 3, gender: 'u', w: 880, h: 1120 },
  { key: 'peacoat', category: 'outerwear', name_uz: 'ikki bortli palto', name_en: 'double-breasted peacoat', fabrics: [{ uz: 'zich jun', en: 'melton wool' }, { uz: 'drap', en: 'drape wool' }], weather: ['cool', 'cold'], occasions: ['office', 'school', 'university', 'date'], warmth: 3, formality: 3, gender: 'u', w: 880, h: 1080 },
  { key: 'trench', category: 'outerwear', name_uz: 'yomgʻirplash', name_en: 'waterproof trench coat', fabrics: [{ uz: 'gabardin', en: 'gabardine' }, { uz: 'suv oʻtkazmas', en: 'weatherproof' }, { uz: 'paxta', en: 'cotton twill' }], weather: ['warm', 'cool', 'rain'], occasions: ['office', 'walk', 'party', 'date', 'university'], warmth: 2, formality: 2, gender: 'u', w: 880, h: 1100 },
  { key: 'cape', category: 'outerwear', name_uz: 'kashmir keyp-nakidka', name_en: 'draped cashmere cape', fabrics: [{ uz: 'kashmir', en: 'cashmere' }, { uz: 'merinos', en: 'double wool' }], weather: ['cool', 'cold'], occasions: ['party', 'date', 'office'], warmth: 2, formality: 3, gender: 'w', w: 900, h: 1080 },
  { key: 'kimono', category: 'outerwear', name_uz: 'kimono-jaket', name_en: 'minimalist kimono cardigan', fabrics: [{ uz: 'zigʻir', en: 'woven linen' }, { uz: 'ipak-jun', en: 'silk-wool' }], weather: ['hot', 'warm', 'cool'], occasions: ['walk', 'date', 'office', 'university'], warmth: 1, formality: 2, gender: 'u', w: 880, h: 1040 },
  { key: 'blazer', category: 'outerwear', name_uz: 'jaket', name_en: 'tailored blazer', fabrics: [{ uz: 'kostyum jun', en: 'worsted wool' }, { uz: 'zigʻir', en: 'linen' }, { uz: 'tvid', en: 'herringbone' }], weather: ['warm', 'cool'], occasions: ['office', 'party', 'date', 'school', 'university'], warmth: 1, formality: 3, gender: 'u', w: 860, h: 1040 },
  { key: 'puffer', category: 'outerwear', name_uz: 'puffer kurtka', name_en: 'quilted puffer jacket', fabrics: [{ uz: 'suv oʻtkazmas', en: 'water-repellent' }, { uz: 'issiq par', en: 'down-fill' }, { uz: 'mat', en: 'matte shell' }], weather: ['cold', 'cool', 'rain'], occasions: ['walk', 'university', 'school', 'travel', 'sport'], warmth: 3, formality: 1, gender: 'u', w: 880, h: 1060 },
  { key: 'cropped_puffer', category: 'outerwear', name_uz: 'kalta puffer kurtka', name_en: 'cropped down puffer', fabrics: [{ uz: 'par', en: 'down feather' }, { uz: 'texnik mato', en: 'tech matte' }], weather: ['cold', 'cool', 'rain'], occasions: ['walk', 'university', 'travel', 'sport'], warmth: 3, formality: 1, gender: 'u', w: 860, h: 980 },
  { key: 'parka', category: 'outerwear', name_uz: 'parka kurtka', name_en: 'storm hooded parka', fabrics: [{ uz: 'yomgʻirga chidamli', en: 'storm-shell' }, { uz: 'mumlangan', en: 'waxed cotton' }, { uz: 'qalin', en: 'heavyweight' }], weather: ['cool', 'cold', 'rain'], occasions: ['walk', 'travel', 'university', 'school'], warmth: 3, formality: 1, gender: 'u', w: 880, h: 1080 },
  { key: 'bomber', category: 'outerwear', name_uz: 'bomber kurtka', name_en: 'bomber jacket', fabrics: [{ uz: 'zamsha', en: 'suede' }, { uz: 'neylon', en: 'flight nylon' }, { uz: 'jun', en: 'wool-blend' }], weather: ['warm', 'cool', 'rain'], occasions: ['walk', 'university', 'date', 'travel'], warmth: 2, formality: 1, gender: 'u', w: 860, h: 1000 },
  { key: 'varsity', category: 'outerwear', name_uz: 'kollej kurtka', name_en: 'varsity campus jacket', fabrics: [{ uz: 'jun va charm', en: 'wool & leather' }, { uz: 'qalin flis', en: 'heavy fleece' }], weather: ['warm', 'cool', 'cold'], occasions: ['university', 'school', 'walk', 'sport'], warmth: 2, formality: 1, gender: 'u', w: 860, h: 1020 },
  { key: 'leather_jacket', category: 'outerwear', name_uz: 'charm kurtka', name_en: 'leather moto jacket', fabrics: [{ uz: 'tabiiy charm', en: 'lambskin' }, { uz: 'mat charm', en: 'matte leather' }], weather: ['warm', 'cool', 'rain'], occasions: ['walk', 'date', 'party', 'university'], warmth: 2, formality: 2, gender: 'u', w: 860, h: 1000 },
  { key: 'denim_jacket', category: 'outerwear', name_uz: 'jinsi kurtka', name_en: 'denim trucker jacket', fabrics: [{ uz: 'selvidj denim', en: 'selvedge denim' }, { uz: 'organik denim', en: 'organic denim' }], weather: ['warm', 'cool'], occasions: ['walk', 'university', 'travel'], warmth: 2, formality: 1, gender: 'u', w: 860, h: 1000 },
  { key: 'vest', category: 'outerwear', name_uz: 'issiq nimcha', name_en: 'quilted vest gilet', fabrics: [{ uz: 'suv oʻtkazmas', en: 'quilted shell' }, { uz: 'flis', en: 'fleece-lined' }], weather: ['warm', 'cool', 'cold', 'rain'], occasions: ['walk', 'travel', 'sport', 'university', 'school'], warmth: 2, formality: 1, gender: 'u', w: 820, h: 980 },
  { key: 'cardigan', category: 'outerwear', name_uz: 'kardigan', name_en: 'knit cardigan', fabrics: [{ uz: 'merinos', en: 'merino' }, { uz: 'kashmir', en: 'cashmere' }, { uz: 'paxta', en: 'ribbed cotton' }], weather: ['warm', 'cool'], occasions: ['office', 'school', 'university', 'date', 'walk'], warmth: 1, formality: 2, gender: 'u', w: 860, h: 1020 },

  // TOPS (13)
  { key: 'hoodie', category: 'top', name_uz: 'oversize hudi', name_en: 'heavyweight hoodie', fabrics: [{ uz: 'qalin flis', en: 'heavyweight fleece' }, { uz: 'organik paxta', en: 'french terry' }, { uz: 'yumshoq', en: 'brushed cotton' }], weather: ['warm', 'cool', 'cold', 'rain'], occasions: ['walk', 'university', 'sport', 'travel'], warmth: 2, formality: 0, gender: 'u', w: 840, h: 980 },
  { key: 'ziphoodie', category: 'top', name_uz: 'zamokli hudi', name_en: 'zip-up hoodie', fabrics: [{ uz: 'flis', en: 'brushed fleece' }, { uz: 'interlok', en: 'interlock cotton' }, { uz: 'merinos', en: 'merino knit' }], weather: ['warm', 'cool', 'cold', 'rain'], occasions: ['walk', 'university', 'sport', 'travel', 'school'], warmth: 2, formality: 1, gender: 'u', w: 840, h: 980 },
  { key: 'sweatshirt', category: 'top', name_uz: 'svitshot', name_en: 'crewneck sweatshirt', fabrics: [{ uz: 'qalin paxta', en: 'loopback cotton' }, { uz: 'flis', en: 'fleece' }, { uz: 'velvet', en: 'velour' }], weather: ['warm', 'cool', 'cold'], occasions: ['walk', 'university', 'school', 'sport', 'travel'], warmth: 2, formality: 1, gender: 'u', w: 840, h: 960 },
  { key: 'overshirt', category: 'top', name_uz: 'koʻylak-kurtka', name_en: 'structured overshirt', fabrics: [{ uz: 'flanel', en: 'brushed flannel' }, { uz: 'velvet', en: 'corduroy' }, { uz: 'tvill', en: 'cotton twill' }], weather: ['warm', 'cool', 'cold'], occasions: ['university', 'walk', 'office', 'date', 'travel'], warmth: 2, formality: 2, gender: 'u', w: 840, h: 980 },
  { key: 'turtleneck', category: 'top', name_uz: 'vodolazka', name_en: 'fine turtleneck', fabrics: [{ uz: 'merinos', en: 'merino wool' }, { uz: 'kashmir', en: 'cashmere' }, { uz: 'ribana', en: 'ribbed modal' }], weather: ['cool', 'cold'], occasions: ['office', 'school', 'university', 'party', 'date'], warmth: 2, formality: 2, gender: 'u', w: 820, h: 940 },
  { key: 'sweater', category: 'top', name_uz: 'sviter', name_en: 'knit sweater', fabrics: [{ uz: 'kashmir', en: 'cashmere' }, { uz: 'alpak', en: 'alpaca' }, { uz: 'merinos', en: 'merino' }], weather: ['cool', 'cold'], occasions: ['office', 'university', 'school', 'date', 'walk'], warmth: 3, formality: 2, gender: 'u', w: 840, h: 960 },
  { key: 'shirt', category: 'top', name_uz: 'koʻylak', name_en: 'button-down shirt', fabrics: [{ uz: 'poplin', en: 'crisp poplin' }, { uz: 'zigʻir', en: 'relaxed linen' }, { uz: 'oksford', en: 'oxford cotton' }], weather: ['hot', 'warm', 'cool', 'cold'], occasions: ['office', 'school', 'university', 'party', 'date'], warmth: 1, formality: 3, gender: 'u', w: 820, h: 960 },
  { key: 'silk_blouse', category: 'top', name_uz: 'ipak bluza', name_en: 'draped silk blouse', fabrics: [{ uz: 'tabiiy ipak', en: 'mulberry silk' }, { uz: 'satin', en: 'fluid satin' }], weather: ['hot', 'warm', 'cool'], occasions: ['office', 'party', 'date'], warmth: 0, formality: 3, gender: 'w', w: 820, h: 940 },
  { key: 'polo', category: 'top', name_uz: 'polo koʻylak', name_en: 'knit polo shirt', fabrics: [{ uz: 'pikey paxta', en: 'pique cotton' }, { uz: 'trikotaj', en: 'fine knit' }, { uz: 'merserizatsiya', en: 'mercerized' }], weather: ['hot', 'warm'], occasions: ['school', 'university', 'office', 'walk', 'date'], warmth: 0, formality: 2, gender: 'u', w: 820, h: 920 },
  { key: 'longsleeve', category: 'top', name_uz: 'longsliv', name_en: 'henley longsleeve', fabrics: [{ uz: 'supima paxta', en: 'supima jersey' }, { uz: 'vafel', en: 'waffle knit' }], weather: ['warm', 'cool'], occasions: ['university', 'walk', 'sport', 'travel'], warmth: 1, formality: 1, gender: 'u', w: 820, h: 940 },
  { key: 'track_top', category: 'top', name_uz: 'sportivnaya', name_en: 'athletic track jacket', fabrics: [{ uz: 'texnik trikotaj', en: 'tech tricot' }, { uz: 'nafas oluvchi', en: 'dri-fit' }], weather: ['hot', 'warm', 'cool'], occasions: ['sport', 'walk', 'travel'], warmth: 1, formality: 0, gender: 'u', w: 840, h: 960 },
  { key: 'tunic', category: 'top', name_uz: 'uzun tunika', name_en: 'modest long tunic', fabrics: [{ uz: 'zigʻir', en: 'breathable linen' }, { uz: 'paxta', en: 'poplin cotton' }], weather: ['hot', 'warm', 'cool'], occasions: ['office', 'school', 'university', 'walk', 'date'], warmth: 1, formality: 2, gender: 'w', w: 840, h: 1020 },
  { key: 'tee', category: 'top', name_uz: 'futbolka', name_en: 'heavyweight tee', fabrics: [{ uz: 'supima paxta', en: 'supima cotton' }, { uz: 'zigʻir', en: 'linen-jersey' }, { uz: 'sport paxta', en: 'active dry' }], weather: ['hot', 'warm', 'cool'], occasions: ['walk', 'university', 'sport', 'travel', 'school'], warmth: 0, formality: 1, gender: 'u', w: 820, h: 920 },

  // BOTTOMS (9)
  { key: 'wide_trousers', category: 'bottom', name_uz: 'keng shim', name_en: 'wide-leg trousers', fabrics: [{ uz: 'kostyum jun', en: 'tailored wool' }, { uz: 'viskoza', en: 'draped twill' }, { uz: 'zigʻir', en: 'linen blend' }], weather: ['hot', 'warm', 'cool', 'cold'], occasions: ['office', 'party', 'date', 'school', 'university'], warmth: 2, formality: 3, gender: 'u', w: 800, h: 1120 },
  { key: 'pleated_trousers', category: 'bottom', name_uz: 'burmali klassik shim', name_en: 'pleated dress trousers', fabrics: [{ uz: 'flanel', en: 'wool flannel' }, { uz: 'gabardin', en: 'gabardine' }], weather: ['warm', 'cool', 'cold'], occasions: ['office', 'school', 'party', 'date'], warmth: 2, formality: 3, gender: 'u', w: 800, h: 1120 },
  { key: 'chinos', category: 'bottom', name_uz: 'chinos shim', name_en: 'tailored chinos', fabrics: [{ uz: 'tvill paxta', en: 'cotton twill' }, { uz: 'gabardin', en: 'stretch gabardine' }, { uz: 'yumshoq', en: 'brushed cotton' }], weather: ['hot', 'warm', 'cool', 'rain'], occasions: ['office', 'school', 'university', 'walk', 'date'], warmth: 1, formality: 2, gender: 'u', w: 800, h: 1100 },
  { key: 'cargo', category: 'bottom', name_uz: 'kargo shim', name_en: 'utility cargo pants', fabrics: [{ uz: 'ripstop paxta', en: 'ripstop cotton' }, { uz: 'neylon', en: 'tech nylon' }, { uz: 'tvill', en: 'washed twill' }], weather: ['warm', 'cool', 'cold', 'rain'], occasions: ['walk', 'university', 'travel', 'sport'], warmth: 2, formality: 1, gender: 'u', w: 800, h: 1120 },
  { key: 'joggers', category: 'bottom', name_uz: 'jogger shim', name_en: 'tailored fleece joggers', fabrics: [{ uz: 'qalin flis', en: 'heavyweight fleece' }, { uz: 'paxta', en: 'french terry' }], weather: ['warm', 'cool', 'cold'], occasions: ['sport', 'walk', 'travel', 'university'], warmth: 2, formality: 0, gender: 'u', w: 800, h: 1100 },
  { key: 'track_pants', category: 'bottom', name_uz: 'sport shim', name_en: 'athletic track pants', fabrics: [{ uz: 'texnik trikotaj', en: 'dri-fit tricot' }, { uz: 'yengil neylon', en: 'lightweight nylon' }], weather: ['hot', 'warm', 'cool', 'rain'], occasions: ['sport', 'walk', 'travel'], warmth: 1, formality: 0, gender: 'u', w: 800, h: 1100 },
  { key: 'denim', category: 'bottom', name_uz: 'jinsi shim', name_en: 'straight selvedge jeans', fabrics: [{ uz: 'selvidj denim', en: 'selvedge denim' }, { uz: 'organik denim', en: 'organic denim' }], weather: ['warm', 'cool', 'cold', 'rain'], occasions: ['walk', 'university', 'travel', 'date', 'office'], warmth: 2, formality: 1, gender: 'u', w: 800, h: 1100 },
  { key: 'shorts', category: 'bottom', name_uz: 'bermuda shorti', name_en: 'tailored bermuda shorts', fabrics: [{ uz: 'zigʻir', en: 'tailored linen' }, { uz: 'paxta', en: 'chino twill' }, { uz: 'sport', en: 'mesh poly' }], weather: ['hot', 'warm'], occasions: ['walk', 'sport', 'travel'], warmth: 0, formality: 0, gender: 'u', w: 800, h: 780 },
  { key: 'skirt', category: 'bottom', name_uz: 'midi yubka', name_en: 'pleated midi skirt', fabrics: [{ uz: 'ipak satin', en: 'silk satin' }, { uz: 'plisse', en: 'pleated crepe' }, { uz: 'jun', en: 'wool flannel' }], weather: ['hot', 'warm', 'cool'], occasions: ['office', 'school', 'university', 'party', 'date'], warmth: 1, formality: 3, gender: 'w', w: 800, h: 1080 },

  // DRESSES (4)
  { key: 'midi_silk', category: 'dress', name_uz: 'ipak midi libos', name_en: 'bias-cut silk dress', fabrics: [{ uz: 'tabiiy ipak', en: 'mulberry silk' }, { uz: 'satin', en: 'heavy satin' }], weather: ['hot', 'warm', 'cool'], occasions: ['party', 'date', 'office'], warmth: 1, formality: 3, gender: 'w', w: 840, h: 1200 },
  { key: 'shirt_dress', category: 'dress', name_uz: 'koʻylak-libos', name_en: 'belted shirt dress', fabrics: [{ uz: 'zigʻir', en: 'belted linen' }, { uz: 'poplin', en: 'crisp poplin' }], weather: ['hot', 'warm', 'cool'], occasions: ['office', 'school', 'university', 'date', 'walk'], warmth: 0, formality: 2, gender: 'w', w: 840, h: 1180 },
  { key: 'knit_dress', category: 'dress', name_uz: 'trikotaj libos', name_en: 'ribbed knit dress', fabrics: [{ uz: 'merinos', en: 'merino rib' }, { uz: 'kashmir', en: 'cashmere knit' }], weather: ['cool', 'cold'], occasions: ['office', 'party', 'date', 'university'], warmth: 3, formality: 2, gender: 'w', w: 840, h: 1200 },
  { key: 'hoodie_dress', category: 'dress', name_uz: 'hudi-libos', name_en: 'relaxed hoodie dress', fabrics: [{ uz: 'flis', en: 'fleece cotton' }, { uz: 'terri paxta', en: 'french terry' }], weather: ['warm', 'cool', 'cold'], occasions: ['walk', 'university', 'travel'], warmth: 2, formality: 0, gender: 'w', w: 840, h: 1160 },

  // SHOES (7)
  { key: 'sneakers', category: 'shoes', name_uz: 'krossovka', name_en: 'minimalist sneakers', fabrics: [{ uz: 'buzoq charmi', en: 'calfskin' }, { uz: 'zamsha', en: 'suede trim' }], weather: ['hot', 'warm', 'cool'], occasions: ['walk', 'university', 'school', 'travel', 'sport', 'office'], warmth: 1, formality: 1, gender: 'u', w: 760, h: 580 },
  { key: 'running_shoes', category: 'shoes', name_uz: 'yugurish krossovkasi', name_en: 'running athletic sneakers', fabrics: [{ uz: 'nafas oluvchi toʻr', en: 'engineered mesh' }, { uz: 'amortizatsiyali', en: 'cushion knit' }], weather: ['hot', 'warm', 'cool'], occasions: ['sport', 'walk', 'travel', 'university'], warmth: 1, formality: 0, gender: 'u', w: 760, h: 580 },
  { key: 'chelsea_boots', category: 'shoes', name_uz: 'chelsi etik', name_en: 'leather Chelsea boots', fabrics: [{ uz: 'silliq charm', en: 'burnished leather' }, { uz: 'namga chidamli zamsha', en: 'waterproof suede' }], weather: ['cool', 'cold', 'rain'], occasions: ['office', 'party', 'date', 'school', 'university', 'walk'], warmth: 3, formality: 2, gender: 'u', w: 760, h: 640 },
  { key: 'lug_boots', category: 'shoes', name_uz: 'qishki botinka', name_en: 'lug-sole weather boots', fabrics: [{ uz: 'suv oʻtkazmas charm', en: 'storm leather' }, { uz: 'issiq astarli', en: 'shearling-lined' }], weather: ['cold', 'cool', 'rain'], occasions: ['walk', 'travel', 'university', 'school', 'office'], warmth: 3, formality: 1, gender: 'u', w: 760, h: 660 },
  { key: 'loafers', category: 'shoes', name_uz: 'lofer', name_en: 'penny loafers', fabrics: [{ uz: 'tabiiy charm', en: 'box calf' }, { uz: 'yumshoq zamsha', en: 'suede' }], weather: ['hot', 'warm', 'cool', 'rain'], occasions: ['office', 'school', 'university', 'party', 'date'], warmth: 1, formality: 3, gender: 'u', w: 760, h: 580 },
  { key: 'derbies', category: 'shoes', name_uz: 'oksford tufli', name_en: 'lace-up oxford derbies', fabrics: [{ uz: 'sayqallangan charm', en: 'polished calf' }, { uz: 'klassik charm', en: 'full-grain leather' }], weather: ['hot', 'warm', 'cool', 'cold', 'rain'], occasions: ['office', 'school', 'party', 'date'], warmth: 2, formality: 3, gender: 'u', w: 760, h: 580 },
  { key: 'sandals', category: 'shoes', name_uz: 'charm sandal', name_en: 'minimalist sandals', fabrics: [{ uz: 'yumshoq charm', en: 'nappa leather' }, { uz: 'toʻqilgan', en: 'woven leather' }], weather: ['hot', 'warm'], occasions: ['walk', 'date', 'party', 'travel'], warmth: 0, formality: 1, gender: 'u', w: 760, h: 560 },

  // BAGS (6)
  { key: 'tote', category: 'bag', name_uz: 'shoper sumka', name_en: 'structured tote bag', fabrics: [{ uz: 'donador charm', en: 'pebbled leather' }, { uz: 'kanvas', en: 'heavy canvas' }], weather: ['hot', 'warm', 'cool', 'cold', 'rain'], occasions: ['office', 'university', 'school', 'walk', 'date'], warmth: 0, formality: 2, gender: 'u', w: 760, h: 820 },
  { key: 'crossbody', category: 'bag', name_uz: 'kross-bodi sumka', name_en: 'crossbody bag', fabrics: [{ uz: 'silliq charm', en: 'calfskin' }, { uz: 'neylon', en: 'tech nylon' }], weather: ['hot', 'warm', 'cool', 'cold', 'rain'], occasions: ['walk', 'date', 'travel', 'university', 'office'], warmth: 0, formality: 2, gender: 'u', w: 760, h: 740 },
  { key: 'saddle', category: 'bag', name_uz: 'egar charm sumka', name_en: 'sculpted saddle bag', fabrics: [{ uz: 'silliq charm', en: 'box calf' }, { uz: 'zamsha', en: 'suede trim' }], weather: ['hot', 'warm', 'cool', 'cold', 'rain'], occasions: ['date', 'party', 'walk', 'office'], warmth: 0, formality: 2, gender: 'w', w: 760, h: 740 },
  { key: 'backpack', category: 'bag', name_uz: 'shahar ryukzagi', name_en: 'urban minimalist backpack', fabrics: [{ uz: 'suv oʻtkazmas neylon', en: 'waterproof nylon' }, { uz: 'charm', en: 'full-grain leather' }], weather: ['hot', 'warm', 'cool', 'cold', 'rain'], occasions: ['school', 'university', 'travel', 'sport', 'walk'], warmth: 0, formality: 1, gender: 'u', w: 760, h: 840 },
  { key: 'duffle', category: 'bag', name_uz: 'safar sumkasi', name_en: 'weekender duffle bag', fabrics: [{ uz: 'kanvas va charm', en: 'waxed canvas' }, { uz: 'qalin neylon', en: 'ballistic nylon' }], weather: ['hot', 'warm', 'cool', 'cold', 'rain'], occasions: ['travel', 'sport', 'walk'], warmth: 0, formality: 1, gender: 'u', w: 800, h: 660 },
  { key: 'clutch', category: 'bag', name_uz: 'kechki klatch', name_en: 'architectural clutch', fabrics: [{ uz: 'satin', en: 'silk satin' }, { uz: 'silliq charm', en: 'box leather' }], weather: ['hot', 'warm', 'cool', 'cold', 'rain'], occasions: ['party', 'date', 'office'], warmth: 0, formality: 3, gender: 'w', w: 760, h: 640 },

  // ACCESSORIES (11)
  { key: 'scarf', category: 'accessory', name_uz: 'qishki sharf', name_en: 'cashmere scarf', fabrics: [{ uz: 'kashmir', en: 'pure cashmere' }, { uz: 'merinos', en: 'merino wool' }], weather: ['cool', 'cold'], occasions: ['office', 'school', 'university', 'walk', 'date', 'travel'], warmth: 3, formality: 2, gender: 'u', w: 720, h: 720 },
  { key: 'silk_scarf', category: 'accessory', name_uz: 'ipak roʻmol', name_en: 'silk neck scarf', fabrics: [{ uz: 'tvill ipak', en: 'silk twill' }, { uz: 'shifon', en: 'printed silk' }], weather: ['hot', 'warm', 'cool'], occasions: ['party', 'date', 'office', 'university'], warmth: 0, formality: 3, gender: 'u', w: 680, h: 680 },
  { key: 'cap', category: 'accessory', name_uz: 'beysbol kepka', name_en: 'brushed cotton cap', fabrics: [{ uz: 'tvill paxta', en: 'brushed cotton' }, { uz: 'suv oʻtkazmas', en: 'waterproof nylon' }], weather: ['hot', 'warm', 'cool', 'rain'], occasions: ['walk', 'sport', 'travel', 'university'], warmth: 0, formality: 0, gender: 'u', w: 720, h: 560 },
  { key: 'bucket_hat', category: 'accessory', name_uz: 'panama shlyapa', name_en: 'structured bucket hat', fabrics: [{ uz: 'paxta kanvas', en: 'cotton canvas' }, { uz: 'neylon', en: 'rain nylon' }], weather: ['hot', 'warm', 'cool', 'rain'], occasions: ['walk', 'travel', 'university', 'sport'], warmth: 0, formality: 0, gender: 'u', w: 720, h: 560 },
  { key: 'beanie', category: 'accessory', name_uz: 'jun shapka', name_en: 'ribbed merino beanie', fabrics: [{ uz: 'merinos', en: 'ribbed merino' }, { uz: 'kashmir', en: 'cashmere' }], weather: ['cool', 'cold', 'rain'], occasions: ['walk', 'travel', 'sport', 'university', 'school'], warmth: 3, formality: 1, gender: 'u', w: 680, h: 640 },
  { key: 'sunglasses', category: 'accessory', name_uz: 'quyosh koʻzoynak', name_en: 'acetate sunglasses', fabrics: [{ uz: 'atsetat', en: 'sculpted acetate' }, { uz: 'titan', en: 'titanium frame' }], weather: ['hot', 'warm', 'cool'], occasions: ['walk', 'date', 'party', 'travel', 'university'], warmth: 0, formality: 2, gender: 'u', w: 720, h: 520 },
  { key: 'belt', category: 'accessory', name_uz: 'charm kamar', name_en: 'brass-buckle belt', fabrics: [{ uz: 'tabiiy charm', en: 'bridle leather' }, { uz: 'zamsha', en: 'suede' }], weather: ['hot', 'warm', 'cool', 'cold', 'rain'], occasions: ['office', 'school', 'university', 'party', 'date'], warmth: 0, formality: 2, gender: 'u', w: 720, h: 520 },
  { key: 'watch', category: 'accessory', name_uz: 'klassik soat', name_en: 'minimalist dress watch', fabrics: [{ uz: 'poʻlat va charm', en: 'steel & leather' }, { uz: 'mat titan', en: 'matte titanium' }], weather: ['hot', 'warm', 'cool', 'cold', 'rain'], occasions: ['office', 'school', 'university', 'party', 'date', 'walk', 'sport', 'travel'], warmth: 0, formality: 3, gender: 'u', w: 680, h: 680 },
  { key: 'tie', category: 'accessory', name_uz: 'ipak galstuk', name_en: 'woven silk necktie', fabrics: [{ uz: 'jakkard ipak', en: 'jacquard silk' }, { uz: 'jun', en: 'knit wool' }], weather: ['hot', 'warm', 'cool', 'cold'], occasions: ['office', 'school', 'party'], warmth: 0, formality: 3, gender: 'u', w: 680, h: 760 },
  { key: 'gloves', category: 'accessory', name_uz: 'charm qoʻlqop', name_en: 'cashmere-lined gloves', fabrics: [{ uz: 'yumshoq charm', en: 'nappa leather' }, { uz: 'jun', en: 'merino knit' }], weather: ['cold', 'rain'], occasions: ['office', 'walk', 'school', 'university', 'travel'], warmth: 3, formality: 2, gender: 'u', w: 680, h: 680 },
  { key: 'bracelet', category: 'accessory', name_uz: 'minimalist bilaguzuk', name_en: 'sculpted metal bracelet', fabrics: [{ uz: 'kumush rang poʻlat', en: 'brushed steel' }, { uz: 'charm va poʻlat', en: 'woven leather' }], weather: ['hot', 'warm', 'cool', 'cold'], occasions: ['party', 'date', 'university', 'walk', 'office'], warmth: 0, formality: 2, gender: 'u', w: 640, h: 640 },
];

const garments = [];
let idxCounter = 1;

for (const sub of SUBTYPES) {
  for (const sw of SWATCHES) {
    const variantCount = 3;
    for (let vIdx = 0; vIdx < variantCount; vIdx++) {
      const fab = sub.fabrics[vIdx % sub.fabrics.length];
      const matchingBrands = BRANDS.filter((b) =>
        sub.occasions.some((occ) => b.affinity.includes(occ)),
      );
      const brandPool = matchingBrands.length > 0 ? matchingBrands : BRANDS;
      const brandObj = brandPool[(idxCounter + vIdx) % brandPool.length];

      const gender =
        sub.gender === 'w'
          ? 'w'
          : idxCounter % 5 === 0
            ? 'w'
            : 'u';

      const id = `${sub.category}-${sub.key}-${sw.key}-${vIdx + 1}`;
      garments.push({
        id,
        category: sub.category,
        name_uz: `${sw.name_uz} ${fab.uz} ${sub.name_uz}`,
        name_en: `${brandObj.name} ${sw.name_en} ${fab.en} ${sub.name_en}`,
        image: `garments/${sub.category}/${id}.webp`,
        w: sub.w,
        h: sub.h,
        color: sw.hex,
        color2: vIdx === 1 ? sw.hex2 : null,
        palettes: sw.palettes,
        weather: sub.weather,
        occasions: sub.occasions,
        warmth: sub.warmth,
        formality: sub.formality,
        gender,
        brand: brandObj.name,
        priceTier: brandObj.tier,
      });
      idxCounter++;
    }
  }
}

const LOOK_TEMPLATES = [
  { title: 'Toshkent tongi', occasion: 'walk', weather: 'warm', palette: 'sand', model: 'w', items: ['top-shirt-ivory-1', 'bottom-wide_trousers-beige-1', 'shoes-sandals-tan-1', 'bag-tote-cognac-1', 'accessory-sunglasses-camel-1'] },
  { title: 'Dengiz sokinligi', occasion: 'office', weather: 'cool', palette: 'marine', model: 'm', items: ['outerwear-trench-navy-1', 'top-shirt-white-1', 'bottom-wide_trousers-charcoal-1', 'shoes-loafers-noir-1', 'bag-crossbody-charcoal-1'] },
  { title: 'Kechki qirmizi', occasion: 'party', weather: 'warm', palette: 'noir', model: 'w', items: ['outerwear-blazer-charcoal-1', 'dress-midi_silk-crimson-1', 'shoes-loafers-noir-1', 'bag-clutch-noir-1', 'accessory-silk_scarf-crimson-1'] },
  { title: 'Qishki klassika', occasion: 'office', weather: 'cold', palette: 'sand', model: 'w', items: ['outerwear-palto-camel-1', 'top-turtleneck-noir-1', 'bottom-wide_trousers-beige-1', 'shoes-chelsea_boots-cognac-1', 'accessory-scarf-beige-1'] },
  { title: 'Tuproq va zaytun', occasion: 'walk', weather: 'cool', palette: 'earth', model: 'm', items: ['outerwear-parka-olive-1', 'top-sweater-terracotta-1', 'bottom-cargo-olive-1', 'shoes-lug_boots-espresso-1', 'accessory-belt-espresso-1'] },
  { title: 'Bahor nafasi', occasion: 'office', weather: 'warm', palette: 'bloom', model: 'w', items: ['outerwear-cardigan-sage-1', 'top-silk_blouse-blush-1', 'bottom-skirt-ivory-1', 'shoes-sneakers-ivory-1', 'bag-clutch-noir-1'] },
  { title: 'Universitet kampusi', occasion: 'university', weather: 'cool', palette: 'sand', model: 'm', items: ['outerwear-varsity-camel-1', 'top-hoodie-ivory-1', 'bottom-denim-espresso-1', 'shoes-sneakers-ivory-1', 'bag-backpack-espresso-1'] },
  { title: 'Maktab klassikasi', occasion: 'school', weather: 'cool', palette: 'marine', model: 'm', items: ['outerwear-cardigan-navy-1', 'top-shirt-white-1', 'bottom-pleated_trousers-charcoal-1', 'shoes-derbies-noir-1', 'accessory-tie-navy-1'] },
  { title: 'Litsey va kampus', occasion: 'school', weather: 'warm', palette: 'sand', model: 'w', items: ['outerwear-blazer-navy-1', 'top-shirt-ivory-1', 'bottom-skirt-charcoal-1', 'shoes-loafers-noir-1', 'bag-backpack-noir-1'] },
  { title: 'Sport va 7SABER ritmi', occasion: 'sport', weather: 'warm', palette: 'noir', model: 'm', items: ['top-track_top-noir-1', 'bottom-track_pants-charcoal-1', 'shoes-running_shoes-white-1', 'bag-backpack-noir-1', 'accessory-cap-noir-1'] },
  { title: 'Kafe uchrashuvi', occasion: 'date', weather: 'cool', palette: 'bloom', model: 'w', items: ['outerwear-palto-stone-1', 'dress-knit_dress-blush-1', 'shoes-chelsea_boots-espresso-1', 'bag-crossbody-espresso-1', 'accessory-watch-espresso-1'] },
  { title: 'Safar kapsulasi', occasion: 'travel', weather: 'cool', palette: 'earth', model: 'm', items: ['outerwear-vest-olive-1', 'top-ziphoodie-cream-1', 'bottom-cargo-espresso-1', 'shoes-running_shoes-stone-1', 'bag-duffle-olive-1'] },
  { title: 'Zumrad va oltin', occasion: 'party', weather: 'cool', palette: 'emerald', model: 'w', items: ['outerwear-cape-emerald-1', 'dress-midi_silk-emerald-1', 'shoes-loafers-espresso-1', 'bag-saddle-champagne-1', 'accessory-watch-espresso-1'] },
  { title: 'Kobalt studiyasi', occasion: 'office', weather: 'cool', palette: 'cobalt', model: 'm', items: ['outerwear-peacoat-cobalt-1', 'top-turtleneck-ice-1', 'bottom-pleated_trousers-slate-1', 'shoes-derbies-noir-1', 'bag-tote-cobalt-1'] },
  { title: 'Shokolad espresso', occasion: 'date', weather: 'cold', palette: 'espresso', model: 'm', items: ['outerwear-palto-espresso-1', 'top-sweater-champagne-1', 'bottom-wide_trousers-bronze-1', 'shoes-chelsea_boots-espresso-1', 'accessory-watch-bronze-1'] },
  { title: 'Lavanda marvaridi', occasion: 'date', weather: 'warm', palette: 'lavender', model: 'w', items: ['outerwear-kimono-lavender-1', 'top-silk_blouse-ivory-1', 'bottom-skirt-plum-1', 'shoes-sandals-stone-1', 'bag-saddle-lavender-1'] },
  { title: 'Shafaq urgʻusi', occasion: 'walk', weather: 'cool', palette: 'sunset', model: 'm', items: ['outerwear-cropped_puffer-rust-1', 'top-hoodie-cream-1', 'bottom-cargo-espresso-1', 'shoes-sneakers-ivory-1', 'accessory-cap-coral-1'] },
  { title: 'Oʻrmon va xaki', occasion: 'travel', weather: 'cold', palette: 'forest', model: 'm', items: ['outerwear-parka-forest-1', 'top-sweater-mint-1', 'bottom-cargo-olive-1', 'shoes-lug_boots-espresso-1', 'accessory-beanie-forest-1'] },
  { title: 'Sof monoxrom', occasion: 'office', weather: 'cool', palette: 'monochrome', model: 'w', items: ['outerwear-blazer-slate-1', 'top-turtleneck-white-1', 'bottom-wide_trousers-charcoal-1', 'shoes-loafers-noir-1', 'bag-tote-stone-1'] },
  { title: 'Qahrabo va bronza', occasion: 'university', weather: 'cool', palette: 'amber', model: 'm', items: ['outerwear-overshirt-amber-1', 'top-tee-champagne-1', 'bottom-chinos-espresso-1', 'shoes-sneakers-cream-1', 'bag-backpack-bronze-1'] },
  { title: 'Indigo jinsi klassika', occasion: 'walk', weather: 'warm', palette: 'denim', model: 'm', items: ['outerwear-denim_jacket-cobalt-1', 'top-tee-ivory-1', 'bottom-denim-navy-1', 'shoes-sneakers-white-1', 'accessory-bucket_hat-navy-1'] },
  { title: 'Shampan va ipak', occasion: 'party', weather: 'warm', palette: 'pearl', model: 'w', items: ['outerwear-kimono-champagne-1', 'dress-midi_silk-ivory-1', 'shoes-sandals-champagne-1', 'bag-clutch-champagne-1', 'accessory-bracelet-champagne-1'] },
  { title: 'Yoqut va grafit', occasion: 'party', weather: 'cold', palette: 'ruby', model: 'w', items: ['outerwear-palto-plum-1', 'dress-knit_dress-crimson-1', 'shoes-chelsea_boots-noir-1', 'bag-clutch-crimson-1', 'accessory-gloves-noir-1'] },
  { title: 'Shahar hudisi', occasion: 'walk', weather: 'cool', palette: 'sand', model: 'm', items: ['outerwear-bomber-camel-1', 'top-hoodie-ivory-1', 'bottom-cargo-espresso-1', 'shoes-sneakers-ivory-1', 'accessory-watch-camel-1'] },
  { title: 'Qishki koʻcha uslubi', occasion: 'walk', weather: 'cold', palette: 'noir', model: 'm', items: ['outerwear-puffer-noir-1', 'top-hoodie-stone-1', 'bottom-joggers-charcoal-1', 'shoes-lug_boots-noir-1', 'accessory-beanie-noir-1'] },
  { title: 'Zamokli minimalizm', occasion: 'university', weather: 'warm', palette: 'marine', model: 'w', items: ['top-ziphoodie-sky-1', 'bottom-denim-navy-1', 'shoes-sneakers-white-1', 'bag-backpack-navy-1', 'accessory-sunglasses-charcoal-1'] },
  { title: 'Issiq yozgi zigʻir', occasion: 'office', weather: 'hot', palette: 'sand', model: 'm', items: ['top-shirt-ivory-2', 'bottom-chinos-tan-1', 'shoes-loafers-cognac-1', 'bag-tote-espresso-1', 'accessory-watch-espresso-1'] },
  { title: 'Samarqand oqshomi', occasion: 'date', weather: 'cool', palette: 'earth', model: 'w', items: ['outerwear-palto-espresso-1', 'dress-midi_silk-terracotta-1', 'shoes-chelsea_boots-espresso-1', 'bag-clutch-cream-1', 'accessory-bracelet-camel-1'] },
  { title: 'Buxoro quyoshi', occasion: 'travel', weather: 'hot', palette: 'earth', model: 'w', items: ['dress-shirt_dress-cream-1', 'shoes-sandals-camel-1', 'bag-crossbody-terracotta-1', 'accessory-sunglasses-espresso-1'] },
  { title: 'Yomgʻirli Toshkent', occasion: 'office', weather: 'cool', palette: 'marine', model: 'w', items: ['outerwear-trench-beige-1', 'top-turtleneck-navy-1', 'bottom-chinos-charcoal-1', 'shoes-chelsea_boots-noir-1', 'bag-tote-noir-1'] },
  { title: 'Kechki qora tvid', occasion: 'party', weather: 'cold', palette: 'noir', model: 'm', items: ['outerwear-peacoat-noir-1', 'top-turtleneck-noir-2', 'bottom-pleated_trousers-charcoal-1', 'shoes-derbies-noir-1', 'accessory-watch-noir-1'] },
  { title: 'Charm va jinsi', occasion: 'date', weather: 'cool', palette: 'noir', model: 'm', items: ['outerwear-leather_jacket-noir-1', 'top-turtleneck-stone-1', 'bottom-denim-noir-1', 'shoes-chelsea_boots-noir-1', 'accessory-watch-noir-1'] },
];

const garmentIds = new Set(garments.map((g) => g.id));
const looks = LOOK_TEMPLATES.map((tpl, i) => {
  const validItems = tpl.items.filter((id) => garmentIds.has(id));
  const num = String(i + 1).padStart(2, '0');
  return {
    id: `look-${num}`,
    title_uz: tpl.title,
    image: `looks/look-${num}-${tpl.occasion}-${tpl.weather}-${tpl.palette}.webp`,
    thumb: `looks/look-${num}-${tpl.occasion}-${tpl.weather}-${tpl.palette}-thumb.webp`,
    w: 1200,
    h: 1800,
    occasion: tpl.occasion,
    weather: tpl.weather,
    palette: tpl.palette,
    model: tpl.model,
    items: validItems,
  };
});

const manifest = {
  version: 1,
  palettes: PALETTES,
  garments,
  looks,
  hero: {
    cover: 'hero/hero-cover.webp',
    w: 1200,
    h: 1800,
  },
};

const serialized = JSON.stringify(manifest);
if (/['`]/.test(serialized)) {
  throw new Error('Found forbidden ASCII apostrophe in generated manifest!');
}

const outPath = path.resolve(process.cwd(), 'public/assets/manifest.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, serialized);

console.log(
  `Generated manifest.json: ${garments.length} garments across ${SUBTYPES.length} subtypes, ${BRANDS.length} brands & ${PALETTES.length} palettes, ${looks.length} looks (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`,
);
