import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { assessToolcraftRenderPlan, compileToolcraftPerformanceFixturePlan } from "@/toolcraft/runtime";

import { lumePerformancePaths, appPerformance } from "../app/app-performance";
import { appSchema } from "../app/app-schema";
import { handleLumeAction } from "./lume-actions";
import { compass, drawLume, lumeInk, seaBrightness, tempColor, timeIndex } from "./lume-draw";
import { lumeExport } from "./lume-export";
import { lumePerformanceModel } from "./lume-performance-model";
import { lumePipeline } from "./lume-pipeline";
import { LUME_TARGETS, readLumeSettings, SPOT_PRESETS } from "./lume-settings";
import { clearMarineCache, loadMarine, marineUrl, parseMarineResponse, sampleSea, type MarineData } from "./marine-data";

type Call = unknown[];

function recordingContext(calls: Call[]): CanvasRenderingContext2D {
  let font = "10px sans-serif";
  return new Proxy({}, {
    get: (_target, key) => {
      if (key === "font") return font;
      if (key === "measureText") return (text: string) => ({ width: text.length * parseFloat(/(\d+(\.\d+)?)px/.exec(font)?.[1] ?? "10") * 0.55 });
      return (...args: unknown[]) => calls.push([key, ...args]);
    },
    set: (_target, key, value) => {
      if (key === "font") font = value;
      calls.push([key, value]);
      return true;
    },
  }) as CanvasRenderingContext2D;
}

const dataFor = (values: Record<string, unknown>): MarineData => {
  const settings = readLumeSettings(values);
  const data = sampleSea(settings.latitude, settings.longitude, "fallback");
  // Make the sample depend on place so place controls are observable offline
  return { ...data, waveHeight: data.waveHeight.map((h) => h + Math.abs(settings.latitude) / 100 + Math.abs(settings.longitude) / 1000) };
};

function draw(values: Record<string, unknown> = {}, width = 1920, height = 1080): Call[] {
  const calls: Call[] = [];
  drawLume(recordingContext(calls), width, height, readLumeSettings(values), dataFor(values));
  return calls;
}
const signature = (calls: Call[]) => createHash("sha256").update(JSON.stringify(calls)).digest("hex");
const texts = (calls: Call[]) => calls.filter((call) => call[0] === "fillText").map((call) => String(call[1]));
const DEFAULT = signature(draw());

describe("marine data", () => {
  it("asks for seven days of hourly sea state", () => {
    const url = new URL(marineUrl(37.75, -122.55));
    expect(url.origin + url.pathname).toBe("https://marine-api.open-meteo.com/v1/marine");
    expect(url.searchParams.get("hourly")?.split(",")).toEqual(expect.arrayContaining(["wave_height", "swell_wave_height", "sea_surface_temperature", "sea_level_height_msl"]));
    expect(url.searchParams.get("forecast_days")).toBe("7");
  });

  it("parses the response and treats an all-empty point as land", () => {
    const parsed = parseMarineResponse({ hourly: { sea_surface_temperature: [17.5], time: ["2026-11-08T00:00"], wave_height: [1.9] }, timezone: "America/Los_Angeles" }, 37.75, -122.55);
    expect(parsed?.waveHeight[0]).toBe(1.9);
    expect(parsed?.seaTemp[0]).toBe(17.5);
    expect(parseMarineResponse({ hourly: { time: ["2026-11-08T00:00"], wave_height: [null] } }, 40, -100)).toBeNull();
  });

  it("labels offline and on-land samples", async () => {
    clearMarineCache();
    const offline = await loadMarine(10, 10, (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch);
    expect(offline.source).toBe("fallback");
    const land = await loadMarine(40, -100, (async () => ({ json: async () => ({ hourly: { time: ["t"], wave_height: [null] } }) })) as unknown as typeof fetch);
    expect(land.source).toBe("no-sea");
    const calls: Call[] = [];
    drawLume(recordingContext(calls), 1920, 1080, readLumeSettings({}), land);
    expect(texts(calls).join("")).toContain("no marine data at this point");
  });

  it("maps temperature to colour and degrees to compass names", () => {
    expect(tempColor(0)).toBe("#3B6FD8");
    expect(tempColor(40)).toBe("#F07A5A");
    expect(tempColor(17)).toBe("#4FCB9C");
    expect(compass(283)).toBe("west-north-west");
  });

  it("brightens and darkens along the wave train", () => {
    const data = sampleSea(0, 0, "fallback");
    const values = Array.from({ length: 20 }, (_, i) => seaBrightness(data, 0, i * 20, 0));
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.3);
    expect(timeIndex(data, 2, 6)).toBe(54);
  });
});

describe("Lume controls", () => {
  it("lume control place.spot", () => {
    for (const spot of SPOT_PRESETS) {
      const dispatch = vi.fn();
      handleLumeAction({ action: { value: spot.value }, dispatch });
      expect(dispatch.mock.calls.map(([command]) => command)).toEqual([
        expect.objectContaining({ target: LUME_TARGETS.latitude, value: spot.latitude }),
        expect.objectContaining({ target: LUME_TARGETS.longitude, value: spot.longitude }),
      ]);
      expect(texts(draw({ [LUME_TARGETS.latitude]: spot.latitude, [LUME_TARGETS.longitude]: spot.longitude }))).toContain(spot.label);
    }
  });

  it("lume control place.latitude", () => {
    expect(signature(draw({ [LUME_TARGETS.latitude]: 10 }))).not.toBe(DEFAULT);
  });

  it("lume control place.longitude", () => {
    expect(signature(draw({ [LUME_TARGETS.longitude]: 10 }))).not.toBe(DEFAULT);
  });

  it("lume control time.day", () => {
    expect(signature(draw({ [LUME_TARGETS.day]: 3 }))).not.toBe(DEFAULT);
  });

  it("lume control time.hour", () => {
    expect(signature(draw({ [LUME_TARGETS.hour]: 18 }))).not.toBe(DEFAULT);
    expect(texts(draw({ [LUME_TARGETS.hour]: 18 })).join("")).toContain("18:00 local");
  });

  it("lume control glow.color", () => {
    expect(draw({ [LUME_TARGETS.glow]: "#F2A65A" }).some((call) => call[0] === "strokeStyle" && String(call[1]).startsWith("rgba(242, 166, 90"))).toBe(true);
  });

  it("lume control glow.spacing", () => {
    const arcs = (calls: Call[]) => calls.filter((call) => call[0] === "lineTo").length;
    expect(arcs(draw({ [LUME_TARGETS.spacing]: 10 }))).toBeGreaterThan(arcs(draw({ [LUME_TARGETS.spacing]: 28 })));
  });
});

describe("Lume contracts", () => {
  it("lume contract appearance.background", () => {
    expect(lumeInk({ background: "#06121F", includeBackground: true })).toBe("#E8F4F6");
    expect(lumeInk({ background: "#F4F1EA", includeBackground: true })).toBe("#0B2233");
    expect(signature(draw({ [LUME_TARGETS.background]: "#F4F1EA" }))).not.toBe(DEFAULT);
  });

  it("lume contract background.output", () => {
    const fullFills = (calls: Call[]) => calls.filter((call) => call[0] === "fillRect" && call[3] === 1920 && call[4] === 1080);
    expect(fullFills(draw())).toHaveLength(0);
    expect(fullFills(draw({ [LUME_TARGETS.includeBackground]: false }))).toHaveLength(0);
  });

  it("lume contract export.image.format", () => {
    const control = appSchema.panels.controls?.sections.flatMap((section) => Object.values(section.controls)).find((entry) => entry.target === "export.image.format");
    expect(control?.options?.map((option) => option.value)).toEqual(["png", "jpg"]);
  });

  it("lume contract export.image.resolution", () => {
    const control = appSchema.panels.controls?.sections.flatMap((section) => Object.values(section.controls)).find((entry) => entry.target === "export.image.resolution");
    expect(control?.options?.map((option) => option.value)).toEqual(["2k", "4k", "8k"]);
  });

  it("lume contract export.image", async () => {
    clearMarineCache();
    vi.stubGlobal("fetch", async () => {
      throw new Error("offline");
    });
    const calls: Call[] = [];
    await lumeExport.renderFrame({ context: recordingContext(calls), frame: { height: 1080, width: 1920, x: -960, y: -540 }, signal: new AbortController().signal, state: { values: {} } } as unknown as Parameters<typeof lumeExport.renderFrame>[0]);
    vi.unstubAllGlobals();
    expect(calls[1]).toEqual(["translate", -960, -540]);
    expect(texts(calls)).toContain("Ocean Beach");
  });

  it("lume contract export.infinity", () => {
    expect(lumePipeline.passes.find((pass) => pass.id === "raster")?.sceneBounds?.kind).toBe("intrinsic");
  });

  it("lume contract canvas.size", () => {
    expect(signature(draw({}, 960, 540))).not.toBe(DEFAULT);
  });

  it("lume contract canvas.scale", () => {
    const raster = lumePipeline.passes.find((pass) => pass.id === "raster");
    expect(raster?.invalidatedBy).toContain("canvas.renderScale");
    expect(appSchema.canvas.renderScale.enabled).toBe(true);
  });

  it("lume contract canvas.infinity", () => {
    expect(lumePipeline.interactionInvalidation.find((entry) => entry.targets.includes("canvas.infinity"))?.invalidates).toEqual([]);
  });

  it("lume render plan has valid derived paths and fixtures", () => {
    expect(assessToolcraftRenderPlan(appSchema, lumePerformanceModel).errors ?? []).toEqual([]);
    expect(lumePerformancePaths.length).toBe(appPerformance.scenarios.length);
    for (const path of lumePerformancePaths) {
      if (path.workloadDimensions.length) expect(() => compileToolcraftPerformanceFixturePlan(lumePerformanceModel, path)).not.toThrow();
    }
  });
});
