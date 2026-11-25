# Kapsula — Garderob & Stilist

**“Bugun nima kiyasiz?”** — 30 soniya ichida ob-havo, tadbir va rang palitrasiga koʻra tayyor kapsula kombinatsiyalarini koʻrsatadigan, keyin esa kiyimlarni sudrab almashtirish va OKLCH rang uygʻunligini jonli tekshirish imkonini beruvchi tahririy moda ilovasi.

> **Shaffoflik eslatmasi:** Stilist toʻliq deterministik qoidalar va OKLCH rang matematikasi asosida brauzerning oʻzida ishlaydi — hech qanday LLM, API kalit yoki server qayta ishlovi ishlatilmaydi. Katalogdagi kiyim va model suratlari sun’iy intellekt yordamida yaratilgan.

---

## Texnologik stek

- **UI va yigʻma:** Vite + React 19 + TypeScript (`strict: true`) + Tailwind CSS v4
- **Animatsiya:** `motion` (`LazyMotion` + `domAnimation`, `prefers-reduced-motion` qoʻllab-quvvatlanadi)
- **Sudrab tashlash (DnD):** `@dnd-kit/core` (sichqoncha, 150 ms uzoq bosish sensori, klaviatura navigatsiyasi va oʻzbekcha ekran oʻquvchi e’lonlari)
- **Rang matematikasi:** `culori` (OKLCH, OKLab, CIEDE2000 ΔE)
- **Holat va tekshiruv:** `zustand` + `zod` + `vitest`
- **Shriftlar:** `@fontsource/cormorant-garamond` va `@fontsource/inter` (oʻzbekcha `oʻ`, `gʻ` (`U+02BB`) va `’` (`U+2019`) gliflari bilan tekshirilgan)

---

## Ishga tushirish

```bash
npm install
npm run dev       # Mahalliy ishlab chiqish serveri
npm test          # Vitest birlik va qamrov testlari
npm run typecheck # TypeScript qat’iy tekshiruvi
npm run build     # Ishlab chiqarish (production) yigʻmasi
```

---

## Katalog va suratlarni almashtirish (`/public/assets/`)

Ilovaning yagona haqiqat manbai — `public/assets/manifest.json` fayli. Yangi kiyimlar yoki tahririy look suratlari tayyor boʻlganda:

1. Barcha rasmlarni `public/assets/` ostiga joylashtiring:
   - `public/assets/hero/hero-cover.webp` (2:3 nisbat)
   - `public/assets/palettes/<id>.webp` (`sand`, `earth`, `marine`, `bloom`, `noir`)
   - `public/assets/garments/<category>/<id>.webp` (shaffof fonli kesilgan WebP, soyasiz)
   - `public/assets/looks/<id>.webp` va `<id>-thumb.webp` (2:3 nisbat)
2. `public/assets/manifest.json` faylini `src/data/schema.ts` dagi Zod sxemasiga muvofiq yozing (`version: 1`, `palettes`, `garments`, `looks`, `hero`).
3. Agar `manifest.json` hali mavjud boʻlmasa yoki sxema buzilgan boʻlsa, ilova avtomatik ravishda `src/data/sample-manifest.ts` namuna ma’lumotlariga va kategoriya SVG siluetlariga oʻtadi (`dev` muhitida yuqorida “Namuna ma’lumotlar” xabari koʻrinadi).

---

## Baholash vaznlarini sozlash (`src/engine/config.ts`)

Barcha rang tasnifi chegaralari va stilist qoidalari bitta faylda — `src/engine/config.ts` da jamlangan:

- **`COLOR_CONFIG.classification`** — OKLCH `C` va `L` chegaralari (`neutral`, `soft`, `chromatic`)
- **`COLOR_CONFIG.clustering`** — garmoniya burchaklari (`±15°`, yumshoq ranglar uchun `2×` kengayish, `ΔE < 6` birlashtirish)
- **`COLOR_CONFIG.weights`** — 100 ballik tizim taqsimoti (`hueHarmony: 40`, `lightnessStructure: 20`, `statementBalance: 20`, `warmCoolCoherence: 10`, `paletteFit: 10`)
- **`COLOR_CONFIG.categoryVisualWeights`** — 60-30-10 nisbat uchun kategoriya ulushlari (`dress: 0.45`, `outerwear: 0.30`, `top: 0.25`, `bottom: 0.25`, `shoes: 0.07`, `bag: 0.05`, `accessory: 0.03`)
- **`STYLIST_CONFIG.rankingWeights`** — yakuniy kombinatsiya reytingi (`0.40` rang + `0.25` tadbir + `0.20` ob-havo + `0.15` palitra)

Oʻzgartirishlardan soʻng `npm test` orqali barcha 432 filtr kombinatsiyasi va rang testlarini qayta tekshiring.

---

## Joylashtirish (Deploy)

Statik SPA sifatida backend talab qilmaydi (`dist/` papkasi):

- **Vercel:** loyihani ulang (`Build Command: npm run build`, `Output Directory: dist`).
- **Netlify:** `Build command: npm run build`, `Publish directory: dist`.
- **GitHub Pages:** `vite.config.ts` da kerak boʻlsa `base: '/<repo-nomi>/'` ni qoʻshing va `dist/` ni `gh-pages` shoxiga chiqaring.

---

## Qabul qilingan qarorlar va farazlar (Assumptions)

1. **Shrift tanlovi va `U+02BB` tekshiruvi:** `Instrument Serif` va `Hanken Grotesk` shriftlarining `.woff` `cmap` jadvallarida oʻzbekcha `ʻ` (`U+02BB`) glifi mavjud emasligi aniqlandi (ular faqat `unicode-range` da koʻrsatilgan edi). Shuning uchun `U+02BB` va `U+2019` gliflarini toʻliq qoʻllab-quvvatlaydigan **`Cormorant Garamond`** (tahririy serif, regular + italic) va **`Inter`** (UI sans-serif) shriftlari bilan almashtirildi.
2. **OKLCH rang tasnifi kalibrlash:** Manifestdagi `beige` (`#E2D3BA`, `C=0.037`) va `sage` (`#B8C4AB`, `C=0.037`) ohanglari `0.04` dan biroz past xromaga ega boʻlgani sababli, neytral chegara `C < 0.028` (va yorugʻ off-white `L > 0.92 && C < 0.030`) qilib kalibrlandi; natijada oq/fil suyagi neytral, bej/yalpiz/pushti esa `soft` sifatida aniq ajraladi.
3. **ΔE birlashish chegarasi:** 60-30-10 nisbat panelida yaqin ranglarni birlashtirish uchun CIEDE2000 `ΔE < 6` ishlatiladi (0–100 shkalada).
4. **Namuna katalogi:** Real WebP tasvirlar qoʻshilmagunga qadar, barcha 432 filtr kombinatsiyasi uchun kamida 3 ta toʻliq obraz kafolatlanishi maqsadida `src/data/sample-manifest.ts` da 33 ta kiyim va 6 ta look tayyorlandi.
5. **Windows papka nomidagi `&` belgisi:** Loyiha katalogi nomida `&` belgisi boʻlgani sababli `package.json` skriptlari `.bin/*.cmd` oʻrniga bevosita `node ./node_modules/...` orqali ishga tushiriladi.
6. **Ob-havo vidjeti:** “Toshkent: hozir” tugmasi kalitsiz Open-Meteo API ga murojaat qiladi va tarmoq boʻlmasa jim holda yashirinadi.
