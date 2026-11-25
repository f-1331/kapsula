# Kapsula — Garderob & Stilist

**“Bugun nima kiyasiz?”** — 30 soniya ichida ob-havo, borish joyi (ofis, universitet, maktab/litsey, sayr, ziyofat, uchrashuv, sport, safar) va rang palitrasiga koʻra tayyor kapsula kombinatsiyalarini koʻrsatadigan, shaxsiy foto-rang tahlili, brend katalogi, 7 kunlik ob-havo rejasi va jonli OKLCH uygʻunlik hisoblagichiga ega moda ilovasi hamda Telegram Mini App boti.

> **Shaffoflik eslatmasi:** Stilist, qoʻshimcha detal maslahatchisi, foto-rang tahlili (HTML5 Canvas) va OKLCH rang matematikasi toʻliq deterministik qoidalar asosida brauzerning oʻzida ishlaydi — hech qanday tashqi LLM yoki pullik API kalit ishlatilmaydi. Katalogdagi rasmlar va vektor illyustratsiyalar sun’iy intellekt yordamida loyihalashtirilgan.

---

## Texnologik stek va Imkoniyatlar

- **UI va alohida boʻlimlar arxitekturasi:** Vite + React 19 + TypeScript (`strict: true`) + Tailwind CSS v4 — `Bosh sahifa`, `Stilist`, `Atelye`, `Foto-tahlil`, `Brendlar`, `Lookbook`, `Garderobim` va `Ranglar` boʻlimlari alohida sahifalar sifatida ishlaydi.
- **3D Sahna, 10 ta Sayt Dizayni va 5 ta Til:** Interaktiv 3D aylanish (`360° Aylanish`, `Z-Qatlam`), `10` ta sayt dizayn mavzusi (yorugʻ/qorongʻi) va `5` ta til (`Oʻzbek Lotin`, `Ўзбек Кирилл`, `Русский`, `English`, `Türkçe`).
- **Katalog koʻlami:** `6,240` ta kiyim, `65` xil 3D soyali batafsil kiyim turi, `18` ta brend (`Zara`, `Massimo Dutti`, `COS`, `Uniqlo`, `Mango`, `H&M`, `Nike`, `Adidas`, `New Balance`, `Loro Piana`, `Ralph Lauren`, `The North Face`, `Carhartt WIP`, `Burberry`, `Stone Island`, `7SABER`, `Terra Pro`, `Just!`), `32` ta look va `16` ta rang palitrasi.
- **Foto va Kamera Tahlili (`#skaner`):** Galereyadan yuklash, mobil kamera yoki jonli WebRTC koʻzgu orqali rasm olib, OKLCH asosiy ranglarni aniqlaydi, qaysi kiyimlar bilan kiyish va qaysi aksessuarni qoʻshish kerakligini tavsiya qiladi hamda `Garderobim` ga saqlaydi.
- **Animatsiya va Sudrab tashlash:** `motion` (`LazyMotion` + `domAnimation`) va `@dnd-kit/core` (sichqoncha, 150 ms uzoq bosish, klaviatura va oʻzbekcha ekran oʻquvchi e’lonlari).
- **Rang matematikasi:** `culori` (OKLCH, OKLab, CIEDE2000 ΔE) + kunduzgi/tungi rejim (Light/Dark Mode).
- **Telegram Bot va Mini App (`tgcloud/`):** Open-Meteo avtomatik shahar/mamlakat ob-havosi, boʻlimlarga tezkor tugmalar, `@fayzbek1331` uchun jonli foydalanuvchilar (5 daq / 1 soat / 24 soat online monitor) va adminlarni cheklangan huquqlar bilan boshqarish.

---

## Ishga tushirish

```bash
npm install
npm run generate:catalog   # 6,240+ buyum va 18 brend, 16 palitra katalogini yaratish
npm run dev                # Mahalliy ishlab chiqish serveri
npm test                   # Vitest birlik va 8-tadbir qamrov testlari
npm run typecheck          # TypeScript qat’iy tekshiruvi
npm run build              # Ishlab chiqarish (production) yigʻmasi
```

---

## Qabul qilingan qarorlar va farazlar (Assumptions)

1. **Shrift tanlovi va `U+02BB` tekshiruvi:** `Cormorant Garamond` va `Inter` (`@fontsource`) oʻzbekcha `oʻ`, `gʻ` (`U+02BB`) hamda tutuq belgisi `’` (`U+2019`) gliflarini toʻliq qoʻllab-quvvatlaydi.
2. **OKLCH rang tasnifi va `ΔE` chegarasi:** Neytral chegaralar `C < 0.028` va `L > 0.92 && C < 0.030` darajada kalibrlangan; 60-30-10 nisbat panelida `ΔE < 6`, foto-tahlil klasterlashda `ΔE < 10` ishlatiladi.
3. **Tezkorlik (Performance):** Katalogdagi `6,240+` buyum `Atelye` va `Brendlar` boʻlimlarida sahifalanib (`<= 36` karta) koʻrsatiladi va `WeakMap` indeksatsiyasi qoʻllanadi; boshlangʻich JS yuklanishi 250 KB gzip chegarasidan past saqlanadi (`PhotoAnalyzerSection`, `BrandsSection`, `MyWardrobeSection` dinamik yuklanadi).
4. **Windows papka nomidagi `&` belgisi:** Loyiha katalogida `&` mavjudligi sabab `package.json` buyruqlari `.bin/*.cmd` oʻrniga bevosita `node ./node_modules/...` orqali ishga tushiriladi.
5. **Ob-havo va Geo-aniqlash:** IP asosida davlat/shahar aniqlash va Open-Meteo 7 kunlik prognoz kalitsiz API orqali ishlaydi va tarmoq uzilganda jim holda muqobil ma’lumotlarga oʻtadi.
