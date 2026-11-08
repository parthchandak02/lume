import type { ToolcraftControlSchema } from "@/toolcraft/runtime";

import { LUME_DEFAULTS, LUME_TARGETS, SPOT_PRESETS } from "./lume-settings";

const live = {
  applicability: { mode: "always" },
  keyframeable: false,
  performanceReason: "Redraws one still poster in a worker; sea data loads once per place and is cached.",
  performanceRole: "responsiveness",
} as const;

export const placeControls = {
  spot: {
    actions: SPOT_PRESETS.map((spot) => ({ label: spot.label, value: spot.value, variant: "outline" as const })),
    applicability: { mode: "always" },
    description: "Moves to a well-known surf spot just offshore.",
    label: "Spots",
    performanceReason: "Sets two sliders at once; one data load and redraw.",
    performanceRole: "responsiveness",
    target: LUME_TARGETS.spotPreset,
    type: "actions",
  },
  latitude: { ...live, defaultValue: LUME_DEFAULTS.latitude, description: "North is positive. Points on land have no sea data.", label: "Latitude", max: 80, min: -80, sliderValueKind: "continuous", step: 0.01, target: LUME_TARGETS.latitude, type: "slider", unit: "°" },
  longitude: { ...live, defaultValue: LUME_DEFAULTS.longitude, description: "East is positive. Points on land have no sea data.", label: "Longitude", max: 180, min: -180, sliderValueKind: "continuous", step: 0.01, target: LUME_TARGETS.longitude, type: "slider", unit: "°" },
} as const satisfies Record<string, ToolcraftControlSchema>;

export const timeControls = {
  day: { ...live, defaultValue: LUME_DEFAULTS.day, description: "Days ahead in the seven-day forecast; 0 is today.", label: "Day", max: 6, min: 0, sliderValueKind: "discrete", step: 1, target: LUME_TARGETS.day, type: "slider", variant: "discrete" },
  hour: { ...live, defaultValue: LUME_DEFAULTS.hour, description: "Local hour of that day.", label: "Hour", max: 23, min: 0, sliderValueKind: "discrete", step: 1, target: LUME_TARGETS.hour, type: "slider", unit: "h", variant: "discrete" },
} as const satisfies Record<string, ToolcraftControlSchema>;

export const glowControls = {
  color: { ...live, defaultValue: LUME_DEFAULTS.glow, label: "Glow color", target: LUME_TARGETS.glow, type: "color" },
  spacing: { ...live, defaultValue: LUME_DEFAULTS.spacing, description: "Distance between points of light; smaller draws more.", label: "Point spacing", max: 32, min: 8, sliderValueKind: "continuous", step: 1, target: LUME_TARGETS.spacing, type: "slider", unit: "px" },
} as const satisfies Record<string, ToolcraftControlSchema>;

export const backgroundControls = {
  include: { ...live, defaultValue: true, label: "Background", target: LUME_TARGETS.includeBackground, type: "switch" },
  color: { ...live, defaultValue: LUME_DEFAULTS.background, label: "Background color", target: LUME_TARGETS.background, type: "color" },
} as const satisfies Record<string, ToolcraftControlSchema>;
