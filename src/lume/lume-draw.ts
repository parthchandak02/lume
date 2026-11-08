// Draws one Lume frame in scene coordinates. The runtime paints the Background; this is foreground.

import type { LumeSettings } from "./lume-settings";
import type { MarineData } from "./marine-data";

const SANS = "'Avenir Next', 'Futura', 'Helvetica Neue', Arial, sans-serif";
const ALPHA_BUCKETS = 8;
/** Width of sea shown by the field, in metres. */
const FIELD_METRES = 900;

function rgb(hex: string): [number, number, number] {
  const v = /^#?([0-9a-f]{6})$/i.exec(hex.trim())?.[1] ?? "000000";
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

const toHex = (c: readonly number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase()}`;

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function lumeInk(settings: Pick<LumeSettings, "background" | "includeBackground">): string {
  return settings.includeBackground && luminance(settings.background) > 0.55 ? "#0B2233" : "#E8F4F6";
}

const TEMP_STOPS: readonly [number, string][] = [[2, "#3B6FD8"], [10, "#39A9C9"], [17, "#4FCB9C"], [23, "#F2C14E"], [29, "#F07A5A"]];

/** Colour of a sea surface temperature in °C (cold blue to warm coral). */
export function tempColor(celsius: number): string {
  if (celsius <= TEMP_STOPS[0][0]) return TEMP_STOPS[0][1];
  for (let i = 1; i < TEMP_STOPS.length; i += 1) {
    const [t1, c1] = TEMP_STOPS[i];
    if (celsius <= t1) {
      const [t0, c0] = TEMP_STOPS[i - 1];
      const f = (celsius - t0) / (t1 - t0);
      const a = rgb(c0);
      const b = rgb(c1);
      return toHex(a.map((v, k) => v + (b[k] - v) * f));
    }
  }
  return TEMP_STOPS[TEMP_STOPS.length - 1][1];
}

const POINTS = ["north", "north-north-east", "north-east", "east-north-east", "east", "east-south-east", "south-east", "south-south-east", "south", "south-south-west", "south-west", "west-south-west", "west", "west-north-west", "north-west", "north-north-west"];
export const compass = (degrees: number) => POINTS[Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16];
const SHORT = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const short = (degrees: number) => SHORT[Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16];

/** Index into the hourly series for a day and local hour. */
export function timeIndex(data: MarineData, day: number, hour: number): number {
  return Math.max(0, Math.min(data.time.length - 1, day * 24 + hour));
}

/** Brightness 0..1 at a point (metres, x east, y south) from the wind sea and swell trains. */
export function seaBrightness(data: MarineData, index: number, x: number, y: number): number {
  const trains = [
    { direction: data.waveDirection[index], height: data.waveHeight[index], period: data.wavePeriod[index] },
    { direction: data.swellDirection[index], height: data.swellHeight[index], period: data.swellPeriod[index] },
  ];
  let sum = 0;
  let total = 0;
  for (const train of trains) {
    if (train.height <= 0 || train.period <= 0) continue;
    const wavelength = 1.56 * train.period * train.period;
    const toward = ((train.direction + 180) * Math.PI) / 180;
    const along = x * Math.sin(toward) - y * Math.cos(toward);
    const phase = (2 * Math.PI * index * 3600) / train.period;
    sum += train.height * Math.cos((2 * Math.PI * along) / wavelength - phase);
    total += train.height;
  }
  return total > 0 ? (sum / total + 1) / 2 : 0.5;
}

/** Scene-unit layout shared with tests. */
export function lumeLayout(width: number, height: number) {
  const u = Math.min(width / 1920, height / 1080);
  const offsetX = (width - 1920 * u) / 2;
  const offsetY = (height - 1080 * u) / 2;
  const left = offsetX + 96 * u;
  const field = { height: 590 * u, width: 1184 * u, x: offsetX + 640 * u, y: offsetY + 96 * u };
  const chart = { height: 190 * u, width: 1184 * u, x: offsetX + 640 * u, y: offsetY + 760 * u };
  const swatch = { r: 46 * u, x: left + 46 * u, y: offsetY + 872 * u };
  return { chart, field, left, offsetY, swatch, u };
}

type Frame = { data: MarineData; index: number; ink: string; layout: ReturnType<typeof lumeLayout>; muted: string; settings: LumeSettings };

function tracked(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, text: string, x: number, y: number, spacing: number): void {
  let cursor = x;
  for (const char of text) {
    context.fillText(char, cursor, y);
    cursor += context.measureText(char).width + spacing;
  }
}

function dayLabel(stamp: string, day: number): string {
  const date = new Date(`${stamp}:00Z`);
  return Number.isNaN(date.getTime()) ? `Day ${day}` : date.toLocaleDateString("en-GB", { day: "numeric", timeZone: "UTC", weekday: "short" });
}

function drawField(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, frame: Frame): void {
  const { data, index, settings } = frame;
  const { field, u } = frame.layout;
  const spacing = settings.spacing * u;
  const metresPerUnit = FIELD_METRES / field.width;
  const buckets: number[][] = Array.from({ length: ALPHA_BUCKETS }, () => []);
  let row = 0;
  for (let y = field.y + spacing / 2; y < field.y + field.height; y += spacing * 0.866, row += 1) {
    const shift = row % 2 ? spacing / 2 : 0;
    for (let x = field.x + spacing / 2 + shift; x < field.x + field.width; x += spacing) {
      const b = seaBrightness(data, index, (x - field.x) * metresPerUnit, (y - field.y) * metresPerUnit);
      const level = Math.pow(b, 1.6);
      const bucket = Math.min(ALPHA_BUCKETS - 1, Math.floor(level * ALPHA_BUCKETS));
      buckets[bucket].push(x, y);
    }
  }
  // Each point is a zero-length round-capped stroke; one path per brightness band
  context.save();
  context.lineCap = "round";
  buckets.forEach((points, bucket) => {
    if (!points.length) return;
    const level = (bucket + 0.5) / ALPHA_BUCKETS;
    const alpha = 0.12 + 0.88 * level;
    const diameter = spacing * (0.16 + 0.72 * level);
    context.beginPath();
    for (let i = 0; i < points.length; i += 2) {
      context.moveTo(points[i], points[i + 1]);
      context.lineTo(points[i] + 0.01, points[i + 1]);
    }
    // Soft halo, then the bright core
    context.strokeStyle = withAlpha(settings.glow, alpha * 0.16);
    context.lineWidth = diameter * 2.2;
    context.stroke();
    context.strokeStyle = withAlpha(settings.glow, alpha);
    context.lineWidth = diameter;
    context.stroke();
  });
  context.restore();
}

function drawChart(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, frame: Frame): void {
  const { data, settings } = frame;
  const { chart, u } = frame.layout;
  const n = data.time.length;
  const max = Math.max(1, ...data.waveHeight, ...data.swellHeight) * 1.1;
  const xAt = (i: number) => chart.x + (i / Math.max(1, n - 1)) * chart.width;
  const yAt = (value: number) => chart.y + chart.height - (value / max) * chart.height;
  context.fillStyle = withAlpha(settings.glow, 0.16);
  context.beginPath();
  context.moveTo(chart.x, chart.y + chart.height);
  data.waveHeight.forEach((value, i) => context.lineTo(xAt(i), yAt(value)));
  context.lineTo(chart.x + chart.width, chart.y + chart.height);
  context.closePath();
  context.fill();
  context.strokeStyle = withAlpha(settings.glow, 0.9);
  context.lineWidth = 2 * u;
  context.beginPath();
  data.waveHeight.forEach((value, i) => (i ? context.lineTo(xAt(i), yAt(value)) : context.moveTo(xAt(i), yAt(value))));
  context.stroke();
  context.setLineDash([5 * u, 6 * u]);
  context.strokeStyle = withAlpha(settings.glow, 0.5);
  context.lineWidth = 1.4 * u;
  context.beginPath();
  data.swellHeight.forEach((value, i) => (i ? context.lineTo(xAt(i), yAt(value)) : context.moveTo(xAt(i), yAt(value))));
  context.stroke();
  context.setLineDash([]);
}

function drawChartAxis(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, frame: Frame): void {
  const { data, muted } = frame;
  const { chart, u } = frame.layout;
  const n = data.time.length;
  const xAt = (i: number) => chart.x + (i / Math.max(1, n - 1)) * chart.width;
  // Day boundaries and labels
  context.font = `${15 * u}px ${SANS}`;
  for (let day = 0; day < Math.ceil(n / 24); day += 1) {
    const x = xAt(day * 24);
    context.fillStyle = withAlpha(frame.ink, 0.12);
    context.fillRect(x, chart.y, 1 * u, chart.height);
    context.fillStyle = muted;
    context.fillText(dayLabel(data.time[day * 24] ?? "", day), x + 8 * u, chart.y + chart.height + 24 * u);
  }
}

function drawChartMarker(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, frame: Frame): void {
  const { data, index, muted } = frame;
  const { chart, u } = frame.layout;
  const n = data.time.length;
  const max = Math.max(1, ...data.waveHeight, ...data.swellHeight) * 1.1;
  const xAt = (i: number) => chart.x + (i / Math.max(1, n - 1)) * chart.width;
  const yAt = (value: number) => chart.y + chart.height - (value / max) * chart.height;
  const nowX = xAt(index);
  context.fillStyle = frame.ink;
  context.fillRect(nowX - 1 * u, chart.y - 8 * u, 2 * u, chart.height + 8 * u);
  context.beginPath();
  context.arc(nowX, yAt(data.waveHeight[index]), 6 * u, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = muted;
  context.font = `600 ${14 * u}px ${SANS}`;
  tracked(context, "WAVE HEIGHT, 7 DAYS", chart.x, chart.y - 18 * u, 2.4 * u);
  context.textAlign = "right";
  context.font = `${14 * u}px ${SANS}`;
  context.fillText(`solid: all waves · dashed: swell · peak ${Math.max(...data.waveHeight).toFixed(1)} m`, chart.x + chart.width, chart.y - 18 * u);
  context.textAlign = "left";
}

function localTime(data: MarineData, index: number): string {
  const stamp = data.time[index] ?? "";
  const date = new Date(`${stamp}:00Z`);
  if (Number.isNaN(date.getTime())) return stamp;
  return `${date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC", weekday: "short" })} · ${stamp.slice(11, 16)} local`;
}

function drawColumn(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, frame: Frame): void {
  const { data, index, ink, muted, settings } = frame;
  const { left, offsetY, u } = frame.layout;
  context.fillStyle = muted;
  context.font = `600 ${17 * u}px ${SANS}`;
  tracked(context, "SEA STATE", left, offsetY + 118 * u, 3.6 * u);
  const title = settings.spot?.label ?? "Open sea";
  let size = 80;
  context.font = `300 ${size * u}px ${SANS}`;
  while (context.measureText(title).width > 470 * u && size > 44) {
    size -= 4;
    context.font = `300 ${size * u}px ${SANS}`;
  }
  context.fillStyle = ink;
  context.fillText(title, left - 4 * u, offsetY + 204 * u);
  context.fillStyle = muted;
  context.font = `${20 * u}px ${SANS}`;
  const where = `${Math.abs(settings.latitude).toFixed(2)}°${settings.latitude >= 0 ? "N" : "S"}  ${Math.abs(settings.longitude).toFixed(2)}°${settings.longitude >= 0 ? "E" : "W"}`;
  context.fillText(settings.spot ? `${settings.spot.region} · ${where}` : where, left, offsetY + 246 * u);
  context.fillText(localTime(data, index), left, offsetY + 276 * u);

  context.fillStyle = ink;
  context.font = `200 ${150 * u}px ${SANS}`;
  const heightText = data.waveHeight[index].toFixed(1);
  context.fillText(heightText, left - 8 * u, offsetY + 452 * u);
  const width = context.measureText(heightText).width;
  context.font = `300 ${40 * u}px ${SANS}`;
  context.fillText("m", left + width + 6 * u, offsetY + 452 * u);
  context.font = `${23 * u}px ${SANS}`;
  context.fillText(`waves from the ${compass(data.waveDirection[index])}, every ${data.wavePeriod[index].toFixed(0)} s`, left, offsetY + 498 * u);

  const rows: [string, string][] = [
    ["Swell", `${data.swellHeight[index].toFixed(1)} m · ${data.swellPeriod[index].toFixed(0)} s from ${short(data.swellDirection[index])}`],
    ["Sea level", `${data.seaLevel[index] >= 0 ? "+" : "−"}${Math.abs(data.seaLevel[index]).toFixed(2)} m (tide and surge)`],
    ["Current", `${data.currentSpeed[index].toFixed(1)} km/h toward ${short(data.currentDirection[index])}`],
  ];
  let y = offsetY + 574 * u;
  for (const [label, value] of rows) {
    context.fillStyle = muted;
    context.font = `${19 * u}px ${SANS}`;
    context.fillText(label, left, y);
    context.fillStyle = ink;
    context.font = `500 ${20 * u}px ${SANS}`;
    context.textAlign = "right";
    context.fillText(value, left + 470 * u, y);
    context.textAlign = "left";
    context.fillStyle = withAlpha(ink, 0.14);
    context.fillRect(left, y + 14 * u, 470 * u, 1 * u);
    y += 50 * u;
  }
}

function drawTemperature(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, frame: Frame): void {
  const { data, index, ink, muted } = frame;
  const { left, offsetY, swatch, u } = frame.layout;
  const temp = data.seaTemp[index];
  context.fillStyle = tempColor(temp);
  context.beginPath();
  context.arc(swatch.x, swatch.y, swatch.r, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = ink;
  context.font = `300 ${44 * u}px ${SANS}`;
  context.fillText(`${temp.toFixed(1)} °C`, left + 114 * u, swatch.y + 4 * u);
  context.fillStyle = muted;
  context.font = `${17 * u}px ${SANS}`;
  context.fillText("sea surface temperature", left + 116 * u, swatch.y + 32 * u);
  context.fillStyle = withAlpha(ink, 0.42);
  context.font = `${14 * u}px ${SANS}`;
  const source = data.source === "live" ? "live" : data.source === "no-sea" ? "no marine data at this point, showing a sample sea" : "offline sample";
  context.fillText(`Open-Meteo Marine forecast · ${source}`, left, offsetY + 984 * u);
}

export function drawLume(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number, settings: LumeSettings, data: MarineData): void {
  const ink = lumeInk(settings);
  const frame: Frame = { data, index: timeIndex(data, settings.day, settings.hour), ink, layout: lumeLayout(width, height), muted: withAlpha(ink, 0.6), settings };
  context.save();
  context.textBaseline = "alphabetic";
  context.textAlign = "left";
  drawField(context, frame);
  drawChart(context, frame);
  drawChartAxis(context, frame);
  drawChartMarker(context, frame);
  drawColumn(context, frame);
  drawTemperature(context, frame);
  context.restore();
}
