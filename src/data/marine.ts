export interface MarineData {
  waveHeight: number;
  sst: number;
  currentVelocity: number;
  currentDirection: number;
  timestamp: number;
  isFallback: boolean;
}

const FALLBACK_DATA: MarineData = {
  waveHeight: 1.06,
  sst: 15.4,
  currentVelocity: 1.5,
  currentDirection: 30,
  timestamp: Date.now(),
  isFallback: true,
};

export async function fetchMarineData(): Promise<MarineData> {
  try {
    const url =
      "https://marine-api.open-meteo.com/v1/marine" +
      "?latitude=37.77&longitude=-122.42" +
      "&current=ocean_current_velocity,ocean_current_direction,wave_height,sea_surface_temperature";
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const json = await res.json();
    const c = json.current;
    return {
      waveHeight: c.wave_height ?? FALLBACK_DATA.waveHeight,
      sst: c.sea_surface_temperature ?? FALLBACK_DATA.sst,
      currentVelocity: c.ocean_current_velocity ?? FALLBACK_DATA.currentVelocity,
      currentDirection: c.ocean_current_direction ?? FALLBACK_DATA.currentDirection,
      timestamp: Date.now(),
      isFallback: false,
    };
  } catch {
    return { ...FALLBACK_DATA, timestamp: Date.now(), isFallback: true };
  }
}

export function sstToColor(sst: number, scheme: string): string {
  const cold = 5;
  const hot = 30;
  const t = Math.max(0, Math.min(1, (sst - cold) / (hot - cold)));
  switch (scheme) {
    case "warm":
      return lerpColor("#ffab40", "#ff6d00", t);
    case "cool":
      return lerpColor("#00bcd4", "#0277bd", t);
    case "mono":
      return lerpColor("#4dd0e1", "#00bcd4", t);
    case "natural":
    default:
      if (t < 0.33) return lerpColor("#00bcd4", "#4dd0e1", t * 3);
      if (t < 0.66) return lerpColor("#4dd0e1", "#ffab40", (t - 0.33) * 3);
      return lerpColor("#ffab40", "#ff6d00", (t - 0.66) * 3);
  }
}

function lerpColor(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 0xff,
    ag = (ah >> 8) & 0xff,
    ab = ah & 0xff;
  const br = (bh >> 16) & 0xff,
    bg = (bh >> 8) & 0xff,
    bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `rgb(${rr},${rg},${rb})`;
}

export function headingName(deg: number): string {
  const names = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const i = Math.round(deg / 22.5) % 16;
  return names[i];
}

export function directionToVector(dirDeg: number, speed: number): { vx: number; vy: number } {
  const rad = dirDeg * (Math.PI / 180);
  return { vx: Math.sin(rad) * speed, vy: -Math.cos(rad) * speed };
}
