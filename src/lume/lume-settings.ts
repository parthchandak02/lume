export const LUME_TARGETS = {
  background: "appearance.background",
  day: "time.day",
  glow: "glow.color",
  hour: "time.hour",
  includeBackground: "export.includeBackground",
  latitude: "place.latitude",
  longitude: "place.longitude",
  spacing: "glow.spacing",
  spotPreset: "place.spot",
} as const;

export const LUME_DEFAULTS = { background: "#06121F", day: 0, glow: "#6FE7DD", hour: 12, latitude: 37.75, longitude: -122.55, spacing: 14 } as const;

export const SPOT_PRESETS = [
  { label: "Ocean Beach", latitude: 37.75, longitude: -122.55, region: "San Francisco · California", value: "spot-ocean-beach" },
  { label: "Mavericks", latitude: 37.49, longitude: -122.51, region: "Half Moon Bay · California", value: "spot-mavericks" },
  { label: "Pipeline", latitude: 21.67, longitude: -158.06, region: "North Shore · Oʻahu", value: "spot-pipeline" },
  { label: "Teahupoʻo", latitude: -17.87, longitude: -149.27, region: "Tahiti · French Polynesia", value: "spot-teahupoo" },
  { label: "Nazaré", latitude: 39.6, longitude: -9.1, region: "Praia do Norte · Portugal", value: "spot-nazare" },
  { label: "Hossegor", latitude: 43.67, longitude: -1.47, region: "Landes · France", value: "spot-hossegor" },
  { label: "Jeffreys Bay", latitude: -34.05, longitude: 24.95, region: "Eastern Cape · South Africa", value: "spot-jeffreys-bay" },
  { label: "Bondi", latitude: -33.9, longitude: 151.3, region: "Sydney · Australia", value: "spot-bondi" },
] as const;

export type LumeSettings = {
  background: string;
  day: number;
  glow: string;
  hour: number;
  includeBackground: boolean;
  latitude: number;
  longitude: number;
  spacing: number;
  spot: { label: string; region: string } | null;
};

const num = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

function colorValue(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as { hex?: unknown }).hex === "string") return (value as { hex: string }).hex;
  return fallback;
}

export function readLumeSettings(values: Readonly<Record<string, unknown>>): LumeSettings {
  const latitude = num(values[LUME_TARGETS.latitude], LUME_DEFAULTS.latitude);
  const longitude = num(values[LUME_TARGETS.longitude], LUME_DEFAULTS.longitude);
  const spot = SPOT_PRESETS.find((preset) => Math.abs(preset.latitude - latitude) < 0.005 && Math.abs(preset.longitude - longitude) < 0.005);
  return {
    background: colorValue(values[LUME_TARGETS.background], LUME_DEFAULTS.background),
    day: Math.max(0, Math.min(6, Math.round(num(values[LUME_TARGETS.day], LUME_DEFAULTS.day)))),
    glow: colorValue(values[LUME_TARGETS.glow], LUME_DEFAULTS.glow),
    hour: Math.max(0, Math.min(23, Math.round(num(values[LUME_TARGETS.hour], LUME_DEFAULTS.hour)))),
    includeBackground: values[LUME_TARGETS.includeBackground] !== false,
    latitude,
    longitude,
    spacing: Math.max(8, num(values[LUME_TARGETS.spacing], LUME_DEFAULTS.spacing)),
    spot: spot ? { label: spot.label, region: spot.region } : null,
  };
}
