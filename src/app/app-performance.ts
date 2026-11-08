import { defineToolcraftPerformance, deriveToolcraftPerformancePaths, type ToolcraftPerformanceScenario } from "@/toolcraft/runtime";

import { lumePerformanceModel } from "../lume/lume-performance-model";
import { appSchema } from "./app-schema";

export const lumePerformancePaths = deriveToolcraftPerformancePaths(appSchema, lumePerformanceModel);

export const appPerformance = defineToolcraftPerformance({
  ...lumePerformanceModel,
  scenarios: lumePerformancePaths.map(
    (path, index): ToolcraftPerformanceScenario =>
      ({
        automated: true,
        automatedTestName: "lume render plan has valid derived paths and fixtures",
        browser: true,
        browserTestName: `browser perf: toolcraft path ${path.id}`,
        coversTargets: path.targets,
        expectedObservable: "The sea poster, viewport or decoded artifact reflects the exact applied operation.",
        fixture: "Compiled reachable lume workload",
        id: `lume-path-${index}`,
        interaction: path.interaction,
        pathId: path.id,
        uiSelector: '[data-testid="lume-output"]',
        ...(path.interaction === "export" ? { actionValue: "export.png", completionEvidence: "download" as const, controlLabel: "Export PNG" } : {}),
      }) as ToolcraftPerformanceScenario,
  ),
});
