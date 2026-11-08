import type { LumeSettings } from "./lume-settings";
import type { MarineData } from "./marine-data";

export type LumeRasterRequest = { backingHeight: number; backingWidth: number; data: MarineData; height: number; id: number; settings: LumeSettings;  width: number };
export type LumeRasterResponse = { bitmap?: ImageBitmap; error?: string; id: number };
