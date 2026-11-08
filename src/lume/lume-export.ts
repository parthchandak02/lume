import type { ToolcraftProductExportRenderer } from "@/toolcraft/runtime";

import { drawLume } from "./lume-draw";
import { exportPass } from "./lume-pipeline";
import { readLumeSettings } from "./lume-settings";
import { loadMarine } from "./marine-data";

export const lumeExport: ToolcraftProductExportRenderer = {
  baseFileName: "lume",
  async renderFrame({ context, frame, rendererPipeline, signal, state }) {
    const settings = readLumeSettings(state.values);
    const data = await loadMarine(settings.latitude, settings.longitude);
    const render = () => {
      signal.throwIfAborted();
      context.save();
      context.translate(frame.x, frame.y);
      drawLume(context, frame.width, frame.height, settings, data);
      context.restore();
      signal.throwIfAborted();
    };
    if (rendererPipeline) await rendererPipeline.runPass(exportPass, undefined, render);
    else render();
  },
};
