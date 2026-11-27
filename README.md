# Kapsula — Garderob & Stilist

**“Bugun nima kiyasiz?”** — 30 soniya ichida ob-havo, borish joyi (ofis, universitet, maktab/litsey, sayr, ziyofat, uchrashuv, sport, safar) va rang palitrasiga koʻra tayyor kapsula kombinatsiyalarini koʻrsatadigan, WebGL 3D podium sahnasi, QR ulashish markazi, shaxsiy foto-rang tahlili, brend katalogi, 7 kunlik ob-havo rejasi va jonli OKLCH uygʻunlik hisoblagichiga ega moda ilovasi hamda Telegram Mini App boti.

> **Shaffoflik eslatmasi:** Stilist, qoʻshimcha detal maslahatchisi, foto-rang tahlili (HTML5 Canvas), QR kod generatori va OKLCH rang matematikasi toʻliq deterministik qoidalar asosida brauzerning oʻzida ishlaydi — hech qanday tashqi LLM yoki pullik API kalit ishlatilmaydi. Katalogdagi rasmlar va vektor illyustratsiyalar sun’iy intellekt yordamida loyihalashtirilgan.
> **Aloqa / Stilist:** `+998 77 272 3101` · https://kapsulauz.vercel.app · Telegram: `@kapsula_garderob_bot`

---

## Texnologik stek va Imkoniyatlar

- **UI va alohida boʻlimlar arxitekturasi:** Vite + React 19 + TypeScript (`strict: true`) + Tailwind CSS v4 — `Bosh sahifa`, `Stilist`, `Atelye`, `Foto-tahlil`, `Brendlar`, `Lookbook`, `Garderobim` va `Ranglar` boʻlimlari alohida sahifalar sifatida ishlaydi.
- **WebGL 3D Studio & Spatial UI:** Lazy-loaded **Three.js (`three`)** PBR 3D sahnasi (`360° Aylanish`, `Qatlamlarni ajratish`, `Old / 3/4 / Yon / Orqa / Podium` kamera burchaklari, raycast bosish va mato/byudjet koʻrsatkichi), `Card3D` kinetik kartalar va `Bosh sahifa` jonli 3D podiumi.
- **QR Kod & Tezkor Aloqa (`+998 77 272 3101`):** `qrcode` kutubxonasi yordamida joriy 3D obraz (`?items=...`), sayt (`https://kapsulauz.vercel.app`), Telegram bot va toʻgʻridan-toʻgʻri qoʻngʻiroq (`TEL:+998772723101`) uchun skanerlanuvchi SVG/PNG QR kodlar.
- **10 ta Sayt Dizayni va 5 ta Til:** `10` ta yorugʻ/qorongʻi dizayn mavzusi va `5` ta til (`Oʻzbek Lotin`, `Ўзбек Кирилл`, `Русский`, `English`, `Türkçe`).
- **Katalog koʻlami:** `9,600` ta kiyim, `100` xil kiyim turi, `18` ta brend (`Zara`, `Massimo Dutti`, `COS`, `Uniqlo`, `Mango`, `H&M`, `Nike`, `Adidas`, `New Balance`, `Loro Piana`, `Ralph Lauren`, `The North Face`, `Carhartt WIP`, `Burberry`, `Stone Island`, `7SABER`, `Terra Pro`, `Just!`), `32` ta look va `16` ta rang palitrasi.
- **Foto va Kamera Tahlili (`#skaner`):** Galereyadan yuklash, mobil kamera yoki jonli WebRTC koʻzgu orqali rasm olib, OKLCH asosiy ranglarni aniqlaydi, mos buyumlarni va qoʻshimcha detallarni tavsiya qiladi hamda `Garderobim` ga saqlaydi.
- **Telegram Bot va Mini App (`tgcloud/`):** Open-Meteo avtomatik shahar/mamlakat ob-havosi, boʻlimlarga tezkor tugmalar, `@fayzbek1331` uchun jonli foydalanuvchilar monitori va admin boshqaruvi.

---

## Ishga tushirish

```bash
npm install
npm run generate:catalog   # 9,600+ buyum, 18 brend, 16 palitra katalogini yaratish
npm run dev                # Mahalliy ishlab chiqish serveri
npm test                   # Vitest birlik, 3D geometriya, QR va 8-tadbir qamrov testlari
npm run typecheck          # TypeScript qat’iy tekshiruvi
npm run build              # Ishlab chiqarish (production) yigʻmasi
```

---

## Qabul qilingan qarorlar va farazlar (Assumptions)

1. **Shrift tanlovi va `U+02BB` tekshiruvi:** `Cormorant Garamond` va `Inter` (`@fontsource`) oʻzbekcha `oʻ`, `gʻ` (`U+02BB`) hamda tutuq belgisi `’` (`U+2019`) gliflarini toʻliq qoʻllab-quvvatlaydi.
2. **OKLCH rang tasnifi va `ΔE` chegarasi:** Neytral chegaralar `C < 0.028` va `L > 0.92 && C < 0.030` darajada kalibrlangan; 60-30-10 nisbat panelida `ΔE < 6`, foto-tahlil klasterlashda `ΔE < 10` ishlatiladi.
3. **Tezkorlik (Performance):** Katalogdagi `9,600+` buyum `Atelye` va `Brendlar` boʻlimlarida sahifalanib (`<= 36` karta) koʻrsatiladi; `three` va `qrcode` dinamik lazy chunk (`vendor-three`, `vendor-qr`) qilib ajratilgani sabab boshlangʻich JS yuklanishi `250 KB` gzip byudjetidan past saqlanadi.
4. **Windows papka nomidagi `&` belgisi:** Loyiha katalogida `&` mavjudligi sabab `package.json` buyruqlari `.bin/*.cmd` oʻrniga bevosita `node ./node_modules/...` orqali ishga tushiriladi.
5. **Ob-havo va Geo-aniqlash:** IP asosida davlat/shahar aniqlash va Open-Meteo 7 kunlik prognoz kalitsiz API orqali ishlaydi va tarmoq uzilganda jim holda muqobil ma’lumotlarga oʻtadi.
