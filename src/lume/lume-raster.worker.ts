/// <reference lib="webworker" />
import { drawLume } from "./lume-draw";
import type { LumeRasterRequest, LumeRasterResponse } from "./lume-raster-protocol";

declare const self: DedicatedWorkerGlobalScope;
const canvas = new OffscreenCanvas(1, 1);

self.onmessage = (event: MessageEvent<LumeRasterRequest>) => {
  const { backingHeight, backingWidth, data, height, id, settings, width } = event.data;
  try {
    canvas.width = backingWidth;
    canvas.height = backingHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable");
    context.setTransform(backingWidth / width, 0, 0, backingHeight / height, 0, 0);
    drawLume(context, width, height, settings, data);
    const bitmap = canvas.transferToImageBitmap();
    self.postMessage({ bitmap, id } satisfies LumeRasterResponse, [bitmap]);
  } catch (error) {
    self.postMessage({ error: String(error), id } satisfies LumeRasterResponse);
  }
};
