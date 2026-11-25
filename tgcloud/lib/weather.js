import { fetch } from 'sdk';

export async function geocodeCity(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const r = data?.results?.[0];
  if (!r) return null;
  return {
    city: r.name,
    country: r.country || '',
    latitude: r.latitude,
    longitude: r.longitude,
  };
}

export async function getLiveWeatherForCoords(lat, lon, cityLabel = 'Toshkent') {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,rain,snowfall,weather_code,wind_speed_10m';
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const c = data?.current;
  if (!c) return null;

  const temp = Math.round(c.temperature_2m);
  const feels = Math.round(c.apparent_temperature ?? temp);
  const wind = Math.round(c.wind_speed_10m ?? 0);
  const humidity = Math.round(c.relative_humidity_2m ?? 50);
  const code = c.weather_code ?? 1;
  const rain =
    (c.rain ?? 0) > 0.1 ||
    (c.snowfall ?? 0) > 0 ||
    (c.precipitation ?? 0) > 0.2 ||
    (code >= 51 && code <= 86) ||
    code >= 95;
  const snow = (c.snowfall ?? 0) > 0 || (code >= 71 && code <= 77) || code === 85 || code === 86;

  let band = 'cool';
  if (feels >= 27) band = 'hot';
  else if (feels >= 18) band = 'warm';
  else if (feels >= 8) band = 'cool';
  else band = 'cold';

  let outfitAdvice;
  if (snow) {
    outfitAdvice =
      `🧥 <b>Qishki tavsiya:</b> Issiq puffer yoki jun palto, qalin hudi/vodolazka, flanel shim va qalin taglikli botinka.\n` +
      `🎨 <b>Rang:</b> Qora + fil suyagi + tuyarang yoki qirmizi sharf urgʻusi.`;
  } else if (rain) {
    outfitAdvice =
      `🧥 <b>Yomgʻir himoyasi:</b> Suv oʻtkazmaydigan plash yoki parka, ichidan hudi/svitshot, yopiq chelsi etik.\n` +
      `🎨 <b>Rang:</b> Toʻq dengiz + oq + qumrang yoki zaytun + bej.`;
  } else if (band === 'cold') {
    outfitAdvice =
      `🧥 <b>Sovuq havo kapsulasi:</b> Tuyarang jun palto, merinos vodolazka yoki oversize hudi, keng jun shim va chelsi etik.\n` +
      `🎨 <b>Rang:</b> Qum + qora + qaymoqrang sharf.`;
  } else if (band === 'cool') {
    outfitAdvice =
      `🧥 <b>Salqin kun kapsulasi:</b> Jaket yoki bomber, tagidan qalin paxta hudi/koʻylak, jinsi yoki chinos, minimalist krossovka.\n` +
      `🎨 <b>Rang:</b> Grafit + fil suyagi + terakota yoki moviy.`;
  } else if (band === 'hot') {
    outfitAdvice =
      `👕 <b>Issiq kun kapsulasi:</b> Nafas oladigan zigʻir koʻylak yoki polo, keng yengil shim, charm sandal/lofer va quyosh koʻzoynak.\n` +
      `🎨 <b>Rang:</b> Fil suyagi + bej + qumrang.`;
  } else {
    outfitAdvice =
      `🧥 <b>Iliq kun kapsulasi:</b> Yengil kardigan yoki zamokli hudi, futbolka, keng shim va oq krossovka.\n` +
      `🎨 <b>Rang:</b> Ohak yashili + yumshoq pushti + oq.`;
  }

  return {
    city: cityLabel,
    temp,
    feels,
    wind,
    humidity,
    rain,
    snow,
    band,
    summaryText:
      `📍 <b>${cityLabel}</b> — jonli ob-havo tahlili\n` +
      `🌡 Harorat: <b>${temp > 0 ? `+${temp}` : temp}°C</b> (his etilishi: ${feels > 0 ? `+${feels}` : feels}°C)\n` +
      `💨 Shamol: <b>${wind} km/soat</b> · 💧 Namlik: <b>${humidity}%</b>\n` +
      `${rain ? '🌧 Yogʻingarchilik aniqlandi' : '☀️ Yogʻingarchilik yoʻq'}\n\n` +
      outfitAdvice,
  };
}
