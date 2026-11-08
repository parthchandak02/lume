import type {
  ToolcraftComponentAcceptance,
  ToolcraftControlSectionInventoryEntry,
  ToolcraftProductReadiness,
  ToolcraftTransferMode,
} from "./acceptance/types";
import { appSchema } from "./app-schema";
import { lumeReadiness, lumeSectionInventory } from "../lume/lume-inventory";
import { LUME_TARGETS, SPOT_PRESETS } from "../lume/lume-settings";

export const appTransferMode: ToolcraftTransferMode = {
  animationIntent: { mode: "none" },
  mode: "new-toolcraft-app",
  referenceInputs: [],
};

export const appProductReadiness: ToolcraftProductReadiness = lumeReadiness;

export const appControlSectionInventory: readonly ToolcraftControlSectionInventoryEntry[] = lumeSectionInventory;

type Budget = "extended-io" | "standard";
const browser = (testName: string, file: `e2e/${string}.spec.ts`, budget: Budget = "standard") => ({ budget, file, testName });

const domainFile = (id: string) => `e2e/product-lume-${id.split(".")[0]}.spec.ts` as const;

const sliderRow = (id: string, target: string, label: string, observable: string, interactionId: string): ToolcraftComponentAcceptance => ({
  automated: true,
  automatedTestName: `lume control ${target}`,
  browser: browser(`browser: lume control ${target}`, domainFile(id)),
  componentType: "slider",
  evidence: "product-output",
  expectedObservable: observable,
  fixture: "Default Ocean Beach with stubbed Open-Meteo Marine data",
  id,
  interactionId,
  kind: "control",
  target,
  userAction: `Drag the ${label} slider.`,
});

const actionRow = (id: string, target: string, values: readonly string[], observable: string, interactionId: string): ToolcraftComponentAcceptance => ({
  actionCoverage: values,
  automated: true,
  automatedTestName: `lume control ${target}`,
  browser: browser(`browser: lume control ${target}`, domainFile(id)),
  componentType: "actions",
  evidence: "product-output",
  expectedObservable: observable,
  fixture: "Default Ocean Beach with stubbed Open-Meteo Marine data",
  id,
  interactionId,
  kind: "control",
  target,
  userAction: "Click every button.",
});

const runtimeRow = (id: string, target: string, evidence: ToolcraftComponentAcceptance["evidence"], testName: string, file: `e2e/${string}.spec.ts`, budget: Budget = "standard"): ToolcraftComponentAcceptance => ({
  automated: true,
  automatedTestName: `lume contract ${id}`,
  browser: browser(testName, file, budget),
  componentType: id,
  evidence,
  expectedObservable: `The real product output and runtime workspace implement ${id}.`,
  fixture: "Default settings and real Toolcraft controls",
  id,
  kind: "runtime",
  target,
  userAction: `Exercise ${id} through its visible controls.`,
});

const exportTest = "browser: lume image export delivers every format and size";

export const appAcceptance: readonly ToolcraftComponentAcceptance[] = [
  actionRow("place.spot", LUME_TARGETS.spotPreset, SPOT_PRESETS.map((spot) => spot.value), "Each spot names itself on the poster with its own sea state.", "spot-command"),
  sliderRow("place.latitude", LUME_TARGETS.latitude, "Latitude", "The place changes, sea data reloads and the field, figures and chart change.", "latitude-property"),
  sliderRow("place.longitude", LUME_TARGETS.longitude, "Longitude", "The place changes, sea data reloads and the poster changes.", "longitude-property"),
  sliderRow("time.day", LUME_TARGETS.day, "Day", "The field, figures and chart marker move to that day.", "day-property"),
  sliderRow("time.hour", LUME_TARGETS.hour, "Hour", "The field, figures and chart marker move to that hour.", "hour-property"),
  {
    ...sliderRow("glow.color", LUME_TARGETS.glow, "Glow color", "Every point of light and the chart take the new colour.", "glow-property"),
    componentType: "color",
    userAction: "Enter a new glow colour.",
  },
  sliderRow("glow.spacing", LUME_TARGETS.spacing, "Point spacing", "Points of light get denser or sparser.", "spacing-property"),
  {
    ...runtimeRow("appearance.background", LUME_TARGETS.background, "product-output", "browser: lume background color changes output", "e2e/product-lume-appearance.spec.ts"),
    componentType: "color",
    interactionId: "background-color-property",
    kind: "control",
  },
  {
    ...runtimeRow("background.output", LUME_TARGETS.includeBackground, "product-output", "browser: lume background output follows runtime semantics", "e2e/product-lume-background.spec.ts"),
    backgroundOutputCoverage: "all-required-background-output",
    componentType: "switch",
    interactionId: "background-include-property",
    kind: "control",
  },
  ...(["format", "resolution"] as const).map(
    (key): ToolcraftComponentAcceptance => ({
      ...runtimeRow(`export.image.${key}`, `export.image.${key}`, "exported-bytes", exportTest, "e2e/product-lume-export.spec.ts", "extended-io"),
      componentType: "select",
      kind: "control",
      optionCoverage: key === "format" ? ["png", "jpg"] : ["2k", "4k", "8k"],
    }),
  ),
  {
    ...runtimeRow("export.image", "actions.output", "exported-bytes", exportTest, "e2e/product-lume-export.spec.ts", "extended-io"),
    actionCoverage: ["export.png"],
    componentType: "panelActions",
    kind: "control",
    exportArtifactCoverage: "all-required-image-export-behavior",
  },
  {
    ...runtimeRow("export.infinity", "actions.output", "exported-bytes", exportTest, "e2e/product-lume-export.spec.ts", "extended-io"),
    infinityCanvasCoverage: "scene-bounds-image-export",
  },
  {
    ...runtimeRow("canvas.size", "canvas.size.width", "product-output", "browser: lume canvas sizing changes output", "e2e/product-lume-canvas.spec.ts"),
  },
  {
    ...runtimeRow("canvas.scale", "canvas.renderScale", "product-output", "browser: lume backing preserves selected render scale", "e2e/product-lume-canvas.spec.ts"),
    renderScaleCoverage: { kind: "selected-backing-pixels", states: ["interaction", "steady"] },
  },
  {
    ...runtimeRow("canvas.infinity", "canvas.infinity", "viewport-side-effect", "browser: lume infinity preserves scene and viewport", "e2e/product-lume-canvas.spec.ts"),
    infinityCanvasCoverage: "mode-continuity-and-restoration",
  },
  {
    automated: true,
    automatedTestName: "declares production reload coverage for the starter schema",
    browser: {
      budget: "extended-io",
      file: "e2e/product-lume-persistence.spec.ts",
      testName: "browser: lume restores poster and workspace after reload",
    },
    componentType: "persistence",
    evidence: "persistence-state",
    expectedObservable: "Canvas size, zoom, the chosen spot and the moved, collapsed Controls panel are restored after a real reload, and the poster matches its pre-reload pixels.",
    fixture: "Lume persisted workspace",
    id: "persistence.reload",
    kind: "runtime",
    persistenceCoverage: "reload",
    persistenceSlices: appSchema.persistence.storage === "localStorage" ? appSchema.persistence.include : [],
    target: "canvas.size.width",
    userAction: "Change Canvas width, pick Pipeline, zoom in, move and collapse Controls, wait for persistence, and reload the page.",
  },
];
