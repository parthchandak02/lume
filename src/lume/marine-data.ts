// Sea state for Lume: Open-Meteo Marine API, seven days hourly, cached per place.

export const MARINE_API = "https://marine-api.open-meteo.com/v1/marine";

const SERIES = {
  currentDirection: "ocean_current_direction",
  currentSpeed: "ocean_current_velocity",
  seaLevel: "sea_level_height_msl",
  seaTemp: "sea_surface_temperature",
  swellDirection: "swell_wave_direction",
  swellHeight: "swell_wave_height",
  swellPeriod: "swell_wave_period",
  waveDirection: "wave_direction",
  waveHeight: "wave_height",
  wavePeriod: "wave_period",
} as const;
export type SeriesKey = keyof typeof SERIES;

export type MarineData = Record<SeriesKey, number[]> & {
  key: string;
  /** "no-sea" when the point has no marine model data (on land); the poster then shows a labelled sample. */
  source: "fallback" | "live" | "no-sea";
  time: string[];
  timezone: string;
};

export function marineKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
}

export function marineUrl(latitude: number, longitude: number): string {
  return `${MARINE_API}?latitude=${latitude.toFixed(2)}&longitude=${longitude.toFixed(2)}&hourly=${Object.values(SERIES).join(",")}&forecast_days=7&timezone=auto`;
}

export function parseMarineResponse(json: unknown, latitude: number, longitude: number): MarineData | null {
  if (!json || typeof json !== "object") return null;
  const data = json as { hourly?: Record<string, unknown>; timezone?: unknown };
  if (!data.hourly || !Array.isArray(data.hourly.time)) return null;
  const time = (data.hourly.time as unknown[]).map(String);
  const series = {} as Record<SeriesKey, number[]>;
  let known = 0;
  for (const [key, apiKey] of Object.entries(SERIES) as [SeriesKey, string][]) {
    const values = Array.isArray(data.hourly[apiKey]) ? (data.hourly[apiKey] as unknown[]) : [];
    series[key] = time.map((_, i) => {
      const value = values[i];
      if (typeof value === "number" && Number.isFinite(value)) {
        known += 1;
        return value;
      }
      return 0;
    });
  }
  if (known === 0) return null;
  return { ...series, key: marineKey(latitude, longitude), source: "live", time, timezone: typeof data.timezone === "string" ? data.timezone : "UTC" };
}

/** A moderate westerly sea used when there is no data (clearly labelled on the poster). */
export function sampleSea(latitude: number, longitude: number, source: "fallback" | "no-sea"): MarineData {
  const time = Array.from({ length: 168 }, (_, i) => `2026-06-${String(21 + Math.floor(i / 24)).padStart(2, "0")}T${String(i % 24).padStart(2, "0")}:00`);
  const wave = (base: number, amp: number, period: number) => time.map((_, i) => Math.round((base + amp * Math.sin(i / period)) * 100) / 100);
  return {
    currentDirection: wave(90, 30, 30),
    currentSpeed: wave(1, 0.5, 12),
    key: marineKey(latitude, longitude),
    seaLevel: wave(0, 0.6, 1.98),
    seaTemp: wave(16, 0.4, 24),
    source,
    swellDirection: wave(280, 10, 40),
    swellHeight: wave(1.4, 0.6, 30),
    swellPeriod: wave(11, 2, 40),
    time,
    timezone: "UTC",
    waveDirection: wave(270, 20, 20),
    waveHeight: wave(1.7, 0.7, 25),
    wavePeriod: wave(9, 2, 30),
  };
}

const cache = new Map<string, MarineData>();
const pending = new Map<string, Promise<MarineData>>();

export function getCachedMarine(latitude: number, longitude: number): MarineData | null {
  return cache.get(marineKey(latitude, longitude)) ?? null;
}

export function loadMarine(latitude: number, longitude: number, fetcher: typeof fetch = (...args) => fetch(...args)): Promise<MarineData> {
  const key = marineKey(latitude, longitude);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const request = fetcher(marineUrl(latitude, longitude))
    .then((response) => response.json())
    .then((json) => parseMarineResponse(json, latitude, longitude) ?? sampleSea(latitude, longitude, "no-sea"))
    .catch(() => sampleSea(latitude, longitude, "fallback"))
    .then((data) => {
      if (cache.size > 24) cache.delete(cache.keys().next().value!);
      cache.set(key, data);
      pending.delete(key);
      return data;
    });
  pending.set(key, request);
  return request;
}

export function clearMarineCache(): void {
  cache.clear();
  pending.clear();
}
