import type { ToolcraftCommand } from "@/toolcraft/runtime";

import { LUME_TARGETS, SPOT_PRESETS } from "./lume-settings";

type ActionContext = { action: { value: string }; dispatch: (command: ToolcraftCommand) => void };

export function handleLumeAction({ action, dispatch }: ActionContext): void {
  const spot = SPOT_PRESETS.find((preset) => preset.value === action.value);
  if (!spot) return;
  dispatch({ label: spot.label, target: LUME_TARGETS.latitude, type: "controls.setValue", value: spot.latitude });
  dispatch({ label: spot.label, target: LUME_TARGETS.longitude, type: "controls.setValue", value: spot.longitude });
}
