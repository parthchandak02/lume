import { registerToolcraftRendererPipeline, type ToolcraftRendererPipelinePassContract } from "@/toolcraft/runtime";

import type { LumeRasterClient } from "./lume-raster-client";
import { LUME_TARGETS } from "./lume-settings";

const productTargets = [LUME_TARGETS.latitude, LUME_TARGETS.longitude, LUME_TARGETS.day, LUME_TARGETS.hour, LUME_TARGETS.glow, LUME_TARGETS.spacing, LUME_TARGETS.background, LUME_TARGETS.includeBackground];
const rasterInputs = [...productTargets, "canvas.size.width", "canvas.size.height", "canvas.renderScale", "canvas.zoom"];

export const lumePipeline = registerToolcraftRendererPipeline<{
  export: ToolcraftRendererPipelinePassContract<void>;
  raster: ToolcraftRendererPipelinePassContract<string | null, LumeRasterClient, readonly ["lume"]>;
}>()({
  interactionInvalidation: [
    { interaction: "initial-render", invalidates: ["raster"], targets: ["canvas"] },
    { interaction: "control-drag", invalidates: ["raster"], targets: [LUME_TARGETS.latitude, LUME_TARGETS.longitude, LUME_TARGETS.day, LUME_TARGETS.hour, LUME_TARGETS.spacing, "canvas.renderScale"] },
    { interaction: "control-change", invalidates: ["raster"], targets: [LUME_TARGETS.spotPreset, LUME_TARGETS.glow, LUME_TARGETS.background, LUME_TARGETS.includeBackground, "canvas.size.width", "canvas.size.height"] },
    { interaction: "control-change", invalidates: [], mustNotInvalidate: ["raster"], targets: ["canvas.infinity", "canvas.workspaceBackground", "export.image.format", "export.image.resolution"] },
    { interaction: "viewport-drag", invalidates: [], mustNotInvalidate: ["raster"], targets: ["canvas"] },
    { interaction: "viewport-zoom", invalidates: ["raster"], targets: ["canvas"] },
    { interaction: "export", invalidates: ["export"], mustNotInvalidate: ["raster"], targets: ["export.image"] },
  ],
  passes: [
    {
      cacheKey: ["request"],
      cost: { dimensions: ["width", "height", "scale", "zoom"], frequency: "interaction", relationship: "product" },
      id: "raster",
      inputs: rasterInputs,
      invalidatedBy: rasterInputs,
      kind: "rasterize",
      lifecycle: { cache: "retained-resource", resourceScope: "renderer" },
      output: "preview",
      quality: "retina",
      runsOn: "worker",
      sceneBounds: { kind: "intrinsic", reason: "Lume is a poster laid out inside its artboard; points of light stay inside the field frame and every element is positioned from the frame size, so nothing is drawn outside it." },
    },
    {
      cost: { dimensions: ["resolution"], frequency: "batch", relationship: "product" },
      id: "export",
      inputs: [...productTargets, "export.image.resolution"],
      invalidatedBy: ["export.image"],
      kind: "export",
      lifecycle: { cache: "none", resourceScope: "call" },
      output: "export",
      quality: "export",
      runsOn: "export-only",
    },
  ],
  runtimeId: "lume-sea-poster-v1",
});

export const rasterPass = lumePipeline.getPass("raster");
export const exportPass = lumePipeline.getPass("export");
