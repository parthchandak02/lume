import { getToolcraftFiniteArtboardRect } from "@/toolcraft/runtime";
import { composeToolcraftApp } from "@/toolcraft/runtime/react";

import { handleLumeAction } from "../lume/lume-actions";
import { LumeCanvas } from "../lume/LumeCanvas";
import { lumeExport } from "../lume/lume-export";
import { lumePipeline } from "../lume/lume-pipeline";
import { appSchema } from "./app-schema";

export const appComposition = composeToolcraftApp(appSchema, {
  actions: { onPanelAction: handleLumeAction },
  renderer: { pipelineRegistration: lumePipeline },
  scene: {
    canvasContent: <LumeCanvas />,
    rasterFrameRenderer: lumeExport,
    renderDefaultCanvasMedia: false,
    sceneBoundsProvider: ({ state }) => [getToolcraftFiniteArtboardRect(state.canvas.size)],
  },
});
