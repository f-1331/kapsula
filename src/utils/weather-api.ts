import type { WeatherBand } from '../data/schema';

export interface GeoLocationInfo {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  isAutoDetected: boolean;
}

export interface LiveWeatherAnalysis {
  location: GeoLocationInfo;
  temperatureC: number;
  apparentTempC: number;
  rain: boolean;
  snow: boolean;
  windKmh: number;
  humidityPct: number;
  weatherCode: number;
  conditionUz: string;
  weatherBand: WeatherBand;
  adviceUz: string;
}

export const DEFAULT_LOCATION: GeoLocationInfo = {
  city: 'Toshkent',
  country: 'Oʻzbekiston',
  latitude: 41.2995,
  longitude: 69.2401,
  isAutoDetected: false,
};

export const PRESET_CITIES: GeoLocationInfo[] = [
  { city: 'Toshkent', country: 'Oʻzbekiston', latitude: 41.2995, longitude: 69.2401, isAutoDetected: false },
  { city: 'Samarqand', country: 'Oʻzbekiston', latitude: 39.6542, longitude: 66.9597, isAutoDetected: false },
  { city: 'Buxoro', country: 'Oʻzbekiston', latitude: 39.7747, longitude: 64.4286, isAutoDetected: false },
  { city: 'Andijon', country: 'Oʻzbekiston', latitude: 40.7821, longitude: 72.3442, isAutoDetected: false },
  { city: 'Namangan', country: 'Oʻzbekiston', latitude: 40.9983, longitude: 71.6726, isAutoDetected: false },
  { city: 'Fargʻona', country: 'Oʻzbekiston', latitude: 40.3842, longitude: 71.7843, isAutoDetected: false },
  { city: 'Xiva', country: 'Oʻzbekiston', latitude: 41.3775, longitude: 60.3619, isAutoDetected: false },
  { city: 'Nukus', country: 'Oʻzbekiston', latitude: 42.4531, longitude: 59.6103, isAutoDetected: false },
  { city: 'Istanbul', country: 'Turkiya', latitude: 41.0082, longitude: 28.9784, isAutoDetected: false },
  { city: 'Dubay', country: 'BAA', latitude: 25.2048, longitude: 55.2708, isAutoDetected: false },
  { city: 'Seul', country: 'Janubiy Koreya', latitude: 37.5665, longitude: 126.978, isAutoDetected: false },
  { city: 'London', country: 'Buyuk Britaniya', latitude: 51.5074, longitude: -0.1278, isAutoDetected: false },
];

export function tempToWeatherBand(tempC: number): WeatherBand {
  if (tempC >= 27) return 'hot';
  if (tempC >= 18) return 'warm';
  if (tempC >= 8) return 'cool';
  return 'cold';
}

export function weatherBandDefaultTemp(band: WeatherBand): number {
  switch (band) {
    case 'hot':
      return 31;
    case 'warm':
      return 22;
    case 'cool':
      return 13;
    case 'cold':
      return 2;
  }
}

function describeWeatherCodeUz(code: number): { label: string; isRain: boolean; isSnow: boolean } {
  if (code === 0) return { label: 'Ochiq osmon', isRain: false, isSnow: false };
  if (code >= 1 && code <= 3) return { label: 'Oʻzgaruvchan bulutli', isRain: false, isSnow: false };
  if (code === 45 || code === 48) return { label: 'Tumanli havo', isRain: false, isSnow: false };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) {
    return { label: 'Yomgʻir', isRain: true, isSnow: false };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { label: 'Qor yogʻishi', isRain: true, isSnow: true };
  }
  return { label: 'Bulutli', isRain: false, isSnow: false };
}

function buildAutoWeatherAdvice(params: {
  city: string;
  band: WeatherBand;
  rain: boolean;
  snow: boolean;
  windKmh: number;
  humidityPct: number;
}): string {
  const { city, band, rain, snow, windKmh, humidityPct } = params;
  if (snow) {
    return `${city}da qorli sovuq — issiq puffer yoki jun palto, qalin botinka va sharf-shapka qatlami avtomatik tanlandi.`;
  }
  if (rain && windKmh >= 18) {
    return `${city}da shamol (${windKmh} km/soat) va yomgʻir: suv oʻtkazmaydigan plash yoki parka, yopiq etik va zich trikotaj tavsiya etildi.`;
  }
  if (rain) {
    return `${city}da nam va yomgʻirli havo tahlil qilindi: yomgʻirplash, yopiq charm poyabzal va qatlamli hudi/sviterlar ustuvor.`;
  }
  if (band === 'cold') {
    return `${city}da havo sovuq — issiqlikni saqlovchi palto, vodolazka yoki hudi hamda yopiq etiklar asosida kapsula tuzildi.`;
  }
  if (band === 'cool') {
    return `${city}da salqin havo${windKmh >= 18 ? ' va kuchli shamol' : ''}: jaket, yengil hudi yoki bomber qatlami kun boʻyi muvozanat beradi.`;
  }
  if (band === 'hot') {
    return `${city}da issiq harorat${humidityPct >= 65 ? ' va yuqori namlik' : ''}: nafas oladigan zigʻir, paxta koʻylak va ochiq poyabzallar tanlandi.`;
  }
  return `${city}da iliq va qulay ob-havo: yengil qatlamlar, hudi yoki polo bilan muvozanatli kombinatsiyalar tayyor.`;
}

async function fetchJsonWithTimeout(url: string, ms = 3200): Promise<unknown> {
  const controller = new AbortController();
  const id = window.setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    window.clearTimeout(id);
  }
}

/**
 * Automatically detects the user's current Country and City via CORS-enabled IP geolocation.
 * Falls back cleanly to Toshkent, Oʻzbekiston if offline or blocked.
 */
export async function detectUserLocation(): Promise<GeoLocationInfo> {
  const geojs = (await fetchJsonWithTimeout('https://get.geojs.io/v1/ip/geo.json')) as Record<
    string,
    unknown
  > | null;

  if (geojs) {
    const lat = Number(geojs.latitude);
    const lon = Number(geojs.longitude);
    const city = typeof geojs.city === 'string' && geojs.city.trim() ? geojs.city.trim() : null;
    const country =
      typeof geojs.country === 'string' && geojs.country.trim() ? geojs.country.trim() : null;
    if (city && country && Number.isFinite(lat) && Number.isFinite(lon)) {
      return { city, country, latitude: lat, longitude: lon, isAutoDetected: true };
    }
  }

  const ipwho = (await fetchJsonWithTimeout('https://ipwho.is/')) as Record<string, unknown> | null;
  if (ipwho && ipwho.success !== false) {
    const lat = Number(ipwho.latitude);
    const lon = Number(ipwho.longitude);
    const city = typeof ipwho.city === 'string' && ipwho.city.trim() ? ipwho.city.trim() : null;
    const country =
      typeof ipwho.country === 'string' && ipwho.country.trim() ? ipwho.country.trim() : null;
    if (city && country && Number.isFinite(lat) && Number.isFinite(lon)) {
      return { city, country, latitude: lat, longitude: lon, isAutoDetected: true };
    }
  }

  return DEFAULT_LOCATION;
}

/**
 * Fetches live Open-Meteo telemetry for any location and generates automatic clothing analysis.
 */
export async function fetchLiveWeatherAnalysis(
  location: GeoLocationInfo,
): Promise<LiveWeatherAnalysis | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}` +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,rain,snowfall,weather_code,wind_speed_10m';

  const data = (await fetchJsonWithTimeout(url, 4000)) as {
    current?: Record<string, unknown>;
  } | null;

  if (!data?.current) return null;
  const c = data.current;

  const tempRaw = typeof c.temperature_2m === 'number' ? Math.round(c.temperature_2m) : null;
  if (tempRaw === null || !Number.isFinite(tempRaw)) return null;

  const apparentRaw =
    typeof c.apparent_temperature === 'number' ? Math.round(c.apparent_temperature) : tempRaw;
  const humidityPct =
    typeof c.relative_humidity_2m === 'number' ? Math.round(c.relative_humidity_2m) : 50;
  const windKmh = typeof c.wind_speed_10m === 'number' ? Math.round(c.wind_speed_10m) : 8;
  const weatherCode = typeof c.weather_code === 'number' ? c.weather_code : 1;
  const rainMm = typeof c.rain === 'number' ? c.rain : 0;
  const precipMm = typeof c.precipitation === 'number' ? c.precipitation : 0;
  const snowCm = typeof c.snowfall === 'number' ? c.snowfall : 0;

  const codeInfo = describeWeatherCodeUz(weatherCode);
  const snow = codeInfo.isSnow || snowCm > 0;
  const rain = codeInfo.isRain || snow || rainMm > 0.1 || precipMm > 0.2;
  const effectiveTemp = Math.max(-15, Math.min(42, apparentRaw));
  const weatherBand = tempToWeatherBand(effectiveTemp);

  return {
    location,
    temperatureC: Math.max(-15, Math.min(42, tempRaw)),
    apparentTempC: effectiveTemp,
    rain,
    snow,
    windKmh,
    humidityPct,
    weatherCode,
    conditionUz: codeInfo.label,
    weatherBand,
    adviceUz: buildAutoWeatherAdvice({
      city: location.city,
      band: weatherBand,
      rain,
      snow,
      windKmh,
      humidityPct,
    }),
  };
}

/**
 * Searches global cities & countries via Open-Meteo Geocoding API (no key).
 */
export async function searchCities(query: string): Promise<GeoLocationInfo[]> {
  const q = query.trim();
  if (q.length < 2) return PRESET_CITIES;

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`;
  const data = (await fetchJsonWithTimeout(url, 3200)) as {
    results?: Array<Record<string, unknown>>;
  } | null;

  if (!data?.results || data.results.length === 0) return [];

  return data.results
    .map((r) => ({
      city: typeof r.name === 'string' ? r.name : '',
      country: typeof r.country === 'string' ? r.country : '',
      latitude: typeof r.latitude === 'number' ? r.latitude : 0,
      longitude: typeof r.longitude === 'number' ? r.longitude : 0,
      isAutoDetected: false,
    }))
    .filter((r) => r.city.length > 0 && r.country.length > 0);
}
