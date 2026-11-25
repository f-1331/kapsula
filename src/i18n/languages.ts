import { UZ } from './uz';

export type AppLanguage = 'uz' | 'uz_cyrl' | 'ru' | 'en' | 'tr';

export interface LanguageOption {
  id: AppLanguage;
  short: string;
  label: string;
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { id: 'uz', short: 'OʻZ', label: 'Oʻzbek (Lotin)' },
  { id: 'uz_cyrl', short: 'ЎЗ', label: 'Ўзбек (Кирилл)' },
  { id: 'ru', short: 'RU', label: 'Русский' },
  { id: 'en', short: 'EN', label: 'English' },
  { id: 'tr', short: 'TR', label: 'Türkçe' },
] as const;

type WidenStrings<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => WidenStrings<R>
    : T extends readonly (infer U)[]
      ? readonly WidenStrings<U>[]
      : T extends Record<string, unknown>
        ? { [K in keyof T]: WidenStrings<T[K]> }
        : T;

export type AppDictionary = WidenStrings<typeof UZ> & {
  studio: {
    modeBoard: string;
    mode3d: string;
    themesTitle: string;
    langTitle: string;
    spin360: string;
    zLayers: string;
    dragHint: string;
  };
};

/**
 * Deterministic Uzbek Latin -> Cyrillic transliterator so dynamic catalog & weather phrases
 * render natively when 'uz_cyrl' is active without inflating bundle size.
 */
export function latinToCyrillicUz(input: string): string {
  if (!input) return input;
  const pairs: Array<[RegExp, string]> = [
    [/\bLookbook/g, 'Лукбук'],
    [/\blookbook/g, 'лукбук'],
    [/\blook(?=\b)/g, 'образ'],
    [/Oʻ|O'|O`/g, 'Ў'],
    [/oʻ|o'|o`/g, 'ў'],
    [/Gʻ|G'|G`/g, 'Ғ'],
    [/gʻ|g'|g`/g, 'ғ'],
    [/Sh/g, 'Ш'],
    [/SH/g, 'Ш'],
    [/sh/g, 'ш'],
    [/Ch/g, 'Ч'],
    [/CH/g, 'Ч'],
    [/ch/g, 'ч'],
    [/Ng/g, 'Нг'],
    [/ng/g, 'нг'],
    [/Yo/g, 'Ё'],
    [/yo/g, 'ё'],
    [/Yu/g, 'Ю'],
    [/yu/g, 'ю'],
    [/Ya/g, 'Я'],
    [/ya/g, 'я'],
    [/Ye/g, 'Е'],
    [/ye/g, 'е'],
    [/’/g, 'ъ'],
  ];
  let out = input;
  for (const [rx, rep] of pairs) out = out.replace(rx, rep);

  const map: Record<string, string> = {
    A: 'А', a: 'а', B: 'Б', b: 'б', D: 'Д', d: 'д', E: 'Э', e: 'е',
    F: 'Ф', f: 'ф', G: 'Г', g: 'г', H: 'Ҳ', h: 'ҳ', I: 'И', i: 'и',
    J: 'Ж', j: 'ж', K: 'К', k: 'к', L: 'Л', l: 'л', M: 'М', m: 'м',
    N: 'Н', n: 'н', O: 'О', o: 'о', P: 'П', p: 'п', Q: 'Қ', q: 'қ',
    R: 'Р', r: 'р', S: 'С', s: 'с', T: 'Т', t: 'т', U: 'У', u: 'у',
    V: 'В', v: 'в', X: 'Х', x: 'х', Y: 'Й', y: 'й', Z: 'З', z: 'з',
    C: 'С', c: 'с', W: 'В', w: 'в',
  };
  return out.replace(/[A-Za-z]/g, (ch) => map[ch] ?? ch);
}

function deepCyrl<T>(val: T): T {
  if (typeof val === 'string') return latinToCyrillicUz(val) as unknown as T;
  if (typeof val === 'function') {
    const fn = val as (...args: unknown[]) => unknown;
    return ((...args: unknown[]) => {
      const res = fn(...args);
      return typeof res === 'string' ? latinToCyrillicUz(res) : res;
    }) as unknown as T;
  }
  if (Array.isArray(val)) return val.map(deepCyrl) as unknown as T;
  if (val && typeof val === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      out[k] = deepCyrl(v);
    }
    return out as T;
  }
  return val;
}

const UZ_BASE: AppDictionary = {
  ...UZ,
  studio: {
    modeBoard: '2D Taxta',
    mode3d: '3D Sahna',
    themesTitle: 'Sayt dizayni',
    langTitle: 'Til',
    spin360: '360° Aylanish',
    zLayers: 'Z-Qatlam',
    dragHint: '360° aylantirish uchun sudrang',
  },
};

const EN_DICT: AppDictionary = {
  ...UZ_BASE,
  meta: {
    brand: 'Kapsula',
    brandFull: 'Kapsula — Wardrobe & Stylist',
    edition: 'Wardrobe & Stylist · Issue No. 01',
    sampleBanner: 'Sample data preview — showing fallback items until manifest.json loads.',
    skipToContent: 'Skip to main content',
  },
  nav: {
    cover: 'Home',
    stilist: 'Stylist',
    atelye: 'Atelier',
    lookbook: 'Lookbook',
    skaner: 'Photo Scan',
    brendlar: 'Brands',
    garderobim: 'My Closet',
    ranglar: 'Colors',
    ariaLabel: 'Main sections navigation',
    themeDark: 'Dark',
    themeLight: 'Light',
  },
  cover: {
    kicker: 'Wardrobe & Stylist · Issue No. 01',
    title: 'What are you wearing today?',
    promise:
      'Every workspace on its own clean page: live weather stylist, 6,200+ branded 3D items studio, photo color scan, 7-day planner & OKLCH harmony lab.',
    ctaPrimary: 'Open Stylist',
    ctaSecondary: 'Analyze Photo',
    counters: (items, looks, palettes, brands) =>
      `${items} items · ${brands} brands · ${looks} looks · ${palettes} palettes`,
    coverCaption: 'Capsule wardrobe: calm, confident dressing every morning.',
    hubTitle: 'Workspaces',
  },
  weather: {
    ...UZ.weather,
    hot: { label: 'Hot', range: '27°+', desc: 'Breathable fabrics' },
    warm: { label: 'Warm', range: '18–26°', desc: 'Light layers' },
    cool: { label: 'Cool', range: '8–17°', desc: 'Light outerwear' },
    cold: { label: 'Cold', range: '<8°', desc: 'Warm coat & boots' },
    rain: 'Rain',
    rainHint: 'Water-resistant layers',
    tempSliderLabel: 'Adjust temperature',
    autoBadge: 'Auto forecast',
    autoOn: 'Auto weather active',
    autoOff: 'Manual mode',
    changeCity: 'City / Country',
    detectCity: 'Auto detect',
    tashkentApplied: (temp, rain) => `${temp > 0 ? `+${temp}` : temp}°C${rain ? ' · rain' : ''}`,
    feelsLike: 'Feels like',
    wind: 'Wind',
    humidity: 'Humidity',
    rainYes: 'Rain / snow',
    rainNo: 'Dry sky',
  },
  occasions: {
    office: { label: 'Office / Work', desc: 'Tailored silhouettes and calm professional structure.' },
    university: { label: 'University', desc: 'Campus ease: hoodies, selvedge denim, overshirts & sneakers.' },
    school: { label: 'School / Lyceum', desc: 'Neat everyday elegance: crisp shirts, knit cardigans & loafers.' },
    walk: { label: 'City Walk', desc: 'Street rhythm: hoodies, cargo pants, bombers & breathable tees.' },
    party: { label: 'Evening / Party', desc: 'Accent textures, silk dresses, structured blazers & heels.' },
    date: { label: 'Date / Cafe', desc: 'Soft knits, tailored coats and inviting warmth.' },
    sport: { label: 'Sport / Fitness', desc: 'Active movement: track tops, joggers & cushioned runners.' },
    travel: { label: 'Travel / Trip', desc: 'Versatile transit layers: puffer gilets, duffles & zip hoodies.' },
  },
  gender: { label: 'For whom', w: 'Women', m: 'Men', all: 'All' },
  palette: { any: 'Any palette', anyTagline: 'Best harmony across all color stories' },
  categories: {
    all: 'All',
    outerwear: 'Outerwear',
    top: 'Tops',
    bottom: 'Bottoms',
    dress: 'Dress',
    shoes: 'Shoes',
    bag: 'Bags',
    accessory: 'Accessories',
  },
  stylist: {
    ...UZ.stylist,
    heading: 'Personal Stylist',
    subheading: 'Instant capsule outfits tailored to live weather, occasion and palette.',
    step1Title: '01 Weather',
    step2Title: '02 Occasion',
    step3Title: '03 Palette',
    topPickTitle: 'Stylist Top Pick',
    alternativesTitle: 'More Variations',
    inspirationTitle: 'Inspiration',
    inspirationSub: 'Closest editorial looks matching your selection',
    openInAtelier: 'Open in Atelier',
    saveOutfit: 'Save Outfit',
    savedSuccess: 'Saved',
  },
  atelier: {
    ...UZ.atelier,
    heading: 'Atelier Studio',
    subheading: 'Switch between the 3D Stage and interactive 2D Drag & Drop Board.',
    trayTitle: 'Wardrobe',
    searchPlaceholder: 'Search: hoodie, zara, coat, sneakers...',
    loadMore: (shown, total) => `Load more (${shown}/${total})`,
    mobileTabBoard: 'Board',
    mobileTabTray: 'Wardrobe',
    mobileTabLab: 'Color Lab',
    filterWeather: 'Fits weather',
    filterPalette: 'Fits palette',
    emptySlotHint: 'Pick',
    pickForSlot: 'Choose item',
    closePicker: 'Close',
    smartAdvisorTitle: 'Stylist Pairing Advisor',
    smartAdvisorAdd: 'Try Adding',
    toolbar: {
      undo: 'Undo',
      redo: 'Redo',
      random: 'Random',
      clear: 'Clear',
      harmonize: 'Harmonize',
      save: 'Save',
      share: 'Share',
      exportPng: 'Export PNG',
      savedList: 'Saved',
    },
  },
  photoAnalyzer: {
    ...UZ.photoAnalyzer,
    heading: 'Photo & Camera Style Analyzer',
    subheading: 'Upload an item photo or snap via live camera to extract OKLCH hues & instant pairings.',
    privacyNote: 'Transparency: image pixels and OKLCH math run 100% locally in your browser.',
    uploadBtn: 'Choose from Gallery',
    cameraBtn: 'Take Camera Photo',
    selfieBtn: 'Live Camera (Mirror)',
    stopCamera: 'Close Camera',
    capturePhoto: 'Capture Shot',
    itemTypeLabel: 'What item is in the photo?',
    customNameLabel: 'Item name',
    saveToWardrobe: 'Save to My Closet',
    savedToWardrobe: 'Saved to My Closet!',
    dominantColorsTitle: 'Extracted Dominant Colors',
    adviceTitle: 'What to Wear With It',
    pairsTitle: 'Best Matching Pieces',
    addAndOpenAtelier: 'Open in Atelier',
  },
  brands: {
    ...UZ.brands,
    heading: 'Brand Collections',
    subheading: 'Browse 18 global & Uzbek labels and drop items into the 3D Atelier.',
    allBrands: 'All Brands',
    itemsSuffix: 'items',
    tierLabels: { budget: 'Essential', mid: 'Mid-Tier', premium: 'Luxury' },
    addToAtelier: 'Add to Atelier',
  },
  myWardrobe: {
    ...UZ.myWardrobe,
    heading: 'My Closet & 7-Day Plan',
    subheading: 'Your uploaded items, 7-day forecast capsule and travel packing list.',
    tabWeekly: '7-Day Forecast',
    tabPacking: 'Trip Packing',
    tabCustom: 'My Items',
    tabSaved: 'Saved Outfits',
    packingTitle: 'Minimal Pieces, Maximum Looks',
    packingDays: (d) => `${d}-Day Trip`,
  },
  colorLab: {
    ...UZ.colorLab,
    heading: 'Color Laboratory',
    subheading: 'Perceptual OKLCH harmony, tonal contrast and 60-30-10 balance.',
    scoreUnit: 'pts',
    standalone: {
      ...UZ.colorLab.standalone,
      title: 'Color Harmony Calculator',
      subtitle: 'Pick 2 to 5 colors to calculate perceptual score and find matching garments.',
      applyToAtelier: 'Try in Atelier',
    },
  },
  lookbook: {
    ...UZ.lookbook,
    heading: 'Editorial Lookbook',
    subheading: 'Curated capsule looks — tap to inspect in 3D or load into Atelier.',
    allFilter: 'All',
    buildLookTitle: 'Build this Look',
    openInAtelier: 'Open in Atelier',
    closeModal: 'Close',
    itemsCount: (n) => `${n} items`,
    prevLook: 'Prev Look',
    nextLook: 'Next Look',
  },
  studio: {
    modeBoard: '2D Board',
    mode3d: '3D Stage',
    themesTitle: 'Site Themes',
    langTitle: 'Language',
    spin360: '360° Spin',
    zLayers: 'Z-Layers',
    dragHint: 'Drag to orbit 360°',
  },
};

const RU_DICT: AppDictionary = {
  ...UZ_BASE,
  meta: {
    brand: 'Kapsula',
    brandFull: 'Kapsula — Гардероб и Стилист',
    edition: 'Гардероб и Стилист · Выпуск № 01',
    sampleBanner: 'Демо-данные — используются до загрузки полного manifest.json.',
    skipToContent: 'Перейти к основному содержимому',
  },
  nav: {
    cover: 'Главная',
    stilist: 'Стилист',
    atelye: 'Ателье 3D',
    lookbook: 'Лукбук',
    skaner: 'Фото-анализ',
    brendlar: 'Бренды',
    garderobim: 'Гардероб',
    ranglar: 'Цвета',
    ariaLabel: 'Навигация по разделам',
    themeDark: 'Тёмная',
    themeLight: 'Светлая',
  },
  cover: {
    kicker: 'Гардероб и Стилист · Выпуск № 01',
    title: 'Что надеть сегодня?',
    promise:
      'Каждый раздел на отдельной странице: погодный стилист, 3D-ателье на 6200+ вещей, фото-сканер цветов, план на неделю и OKLCH-калькулятор.',
    ctaPrimary: 'Открыть стилиста',
    ctaSecondary: 'Анализ по фото',
    counters: (items, looks, palettes, brands) =>
      `${items} вещей · ${brands} брендов · ${looks} образов · ${palettes} палитр`,
    coverCaption: 'Капсульный гардероб: уверенный выбор каждое утро.',
    hubTitle: 'Разделы студии',
  },
  weather: {
    ...UZ.weather,
    hot: { label: 'Жарко', range: '27°+', desc: 'Лёгкие ткани' },
    warm: { label: 'Тепло', range: '18–26°', desc: 'Комфортный слой' },
    cool: { label: 'Прохладно', range: '8–17°', desc: 'Лёгкая верхняя одежда' },
    cold: { label: 'Холодно', range: '<8°', desc: 'Пальто и тёплая обувь' },
    rain: 'Дождь',
    rainHint: 'Влагостойкие слои',
    tempSliderLabel: 'Настроить температуру',
    autoBadge: 'Автопогода',
    autoOn: 'Автоанализ включён',
    autoOff: 'Вручную',
    changeCity: 'Город / Страна',
    detectCity: 'Определить город',
    tashkentApplied: (temp, rain) => `${temp > 0 ? `+${temp}` : temp}°C${rain ? ' · дождь' : ''}`,
    feelsLike: 'Ощущается',
    wind: 'Ветер',
    humidity: 'Влажность',
    rainYes: 'Есть осадки',
    rainNo: 'Без осадков',
  },
  occasions: {
    office: { label: 'Офис / Работа', desc: 'Сдержанные силуэты и деловая структура.' },
    university: { label: 'Университет', desc: 'Комфорт кампуса: худи, деним, кроссовки и рюкзак.' },
    school: { label: 'Школа / Лицей', desc: 'Опрятная классика: рубашки, кардиганы, поло и лоферы.' },
    walk: { label: 'Прогулка', desc: 'Городской ритм: худи, карго, бомберы и мягкий трикотаж.' },
    party: { label: 'Вечер / Праздник', desc: 'Акцентные фактуры, шёлк, пиджаки и туфли.' },
    date: { label: 'Свидание / Кафе', desc: 'Мягкий трикотаж, пальто и тёплый баланс.' },
    sport: { label: 'Спорт / Фитнес', desc: 'Движение: олимпийки, джоггеры и беговые кроссовки.' },
    travel: { label: 'Поездка / Путь', desc: 'Слои для дороги: жилеты, даффлы и зип-худи.' },
  },
  gender: { label: 'Для кого', w: 'Женщинам', m: 'Мужчинам', all: 'Все' },
  palette: { any: 'Любая палитра', anyTagline: 'Лучшая гармония среди всех палитр' },
  categories: {
    all: 'Все',
    outerwear: 'Верх',
    top: 'Топы',
    bottom: 'Низ',
    dress: 'Платья',
    shoes: 'Обувь',
    bag: 'Сумки',
    accessory: 'Аксессуары',
  },
  atelier: {
    ...UZ.atelier,
    heading: '3D-Студия и Ателье',
    subheading: 'Переключайтесь между 3D-сценой и доской перетаскивания.',
    trayTitle: 'Гардероб',
    searchPlaceholder: 'Поиск: худи, zara, пальто, кроссовки...',
    loadMore: (shown, total) => `Показать ещё (${shown}/${total})`,
    mobileTabBoard: 'Доска / 3D',
    mobileTabTray: 'Гардероб',
    mobileTabLab: 'Анализ',
    filterWeather: 'По погоде',
    filterPalette: 'По палитре',
    emptySlotHint: 'Выбрать',
    pickForSlot: 'Выбрать вещь',
    closePicker: 'Закрыть',
    smartAdvisorTitle: 'Советник по сочетанию',
    smartAdvisorAdd: 'Примерить',
    toolbar: {
      undo: 'Назад',
      redo: 'Вперёд',
      random: 'Случайно',
      clear: 'Очистить',
      harmonize: 'Улучшить',
      save: 'Сохранить',
      share: 'Поделиться',
      exportPng: 'Скачать PNG',
      savedList: 'Сохранённые',
    },
  },
  lookbook: {
    ...UZ.lookbook,
    heading: 'Редакционный Лукбук',
    subheading: 'Готовые образы — нажмите для просмотра в 3D и переноса в ателье.',
    allFilter: 'Все',
    buildLookTitle: 'Собрать образ',
    openInAtelier: 'Открыть в Ателье',
    closeModal: 'Закрыть',
    itemsCount: (n) => `${n} вещей`,
    prevLook: 'Назад',
    nextLook: 'Далее',
  },
  studio: {
    modeBoard: '2D Доска',
    mode3d: '3D Сцена',
    themesTitle: 'Дизайн сайта',
    langTitle: 'Язык',
    spin360: '360° Вращение',
    zLayers: 'Z-Слои',
    dragHint: 'Потяните для вращения 360°',
  },
};

const TR_DICT: AppDictionary = {
  ...UZ_BASE,
  meta: {
    brand: 'Kapsula',
    brandFull: 'Kapsula — Gardırop & Stilist',
    edition: 'Gardırop & Stilist · Sayı 01',
    sampleBanner: 'Örnek veriler — manifest.json yüklenene kadar gösteriliyor.',
    skipToContent: 'Ana içeriğe geç',
  },
  nav: {
    cover: 'Ana Sayfa',
    stilist: 'Stilist',
    atelye: 'Atölye 3D',
    lookbook: 'Lookbook',
    skaner: 'Foto Analiz',
    brendlar: 'Markalar',
    garderobim: 'Gardırobum',
    ranglar: 'Renkler',
    ariaLabel: 'Ana bölüm gezintisi',
    themeDark: 'Koyu',
    themeLight: 'Açık',
  },
  cover: {
    kicker: 'Gardırop & Stilist · Sayı 01',
    title: 'Bugün ne giyiyorsun?',
    promise:
      'Her bölüm ayrı sayfada: canlı hava durumu stilisti, 6.200+ markalı 3D stüdyo, kamera/fotoğraf analizi, haftalık plan ve OKLCH renk laboratuvarı.',
    ctaPrimary: 'Stilisti Aç',
    ctaSecondary: 'Fotoğraf Analizi',
    counters: (items, looks, palettes, brands) =>
      `${items} parça · ${brands} marka · ${looks} kombin · ${palettes} palet`,
    coverCaption: 'Kapsül gardırop: her sabah net ve zahmetsiz seçim.',
    hubTitle: 'Stüdyo Bölümleri',
  },
  occasions: {
    office: { label: 'Ofis / İş', desc: 'Yapılandırılmış kesimler ve ölçülü zarafet.' },
    university: { label: 'Üniversite', desc: 'Kampüs rahatı: hoodie, denim, sırt çantası ve sneaker.' },
    school: { label: 'Okul / Lise', desc: 'Düzenli okul stili: gömlek, hırka, polo ve loafer.' },
    walk: { label: 'Yürüyüş / Sokak', desc: 'Sokak stili: hoodie, kargo pantolon, bomber ve kep.' },
    party: { label: 'Davet / Parti', desc: 'İpek dokular, ceketler ve akşam şıklığı.' },
    date: { label: 'Buluşma / Kafe', desc: 'Yumuşak trikolar ve zarif kaban dengesi.' },
    sport: { label: 'Spor / Fitness', desc: 'Aktif konfor: eşofman üstü, jogger ve koşu ayakkabısı.' },
    travel: { label: 'Seyahat', desc: 'Yolculuk katmanları: şişme yelek, duffle ve fermuarlı hoodie.' },
  },
  studio: {
    modeBoard: '2D Pano',
    mode3d: '3D Sahne',
    themesTitle: 'Site Temaları',
    langTitle: 'Dil',
    spin360: '360° Döndür',
    zLayers: 'Z-Katman',
    dragHint: '360° döndürmek için sürükleyin',
  },
};

const CYRL_DICT: AppDictionary = deepCyrl(UZ_BASE);

export function getDictionary(lang: AppLanguage): AppDictionary {
  switch (lang) {
    case 'uz_cyrl':
      return CYRL_DICT;
    case 'ru':
      return RU_DICT;
    case 'en':
      return EN_DICT;
    case 'tr':
      return TR_DICT;
    default:
      return UZ_BASE;
  }
}
