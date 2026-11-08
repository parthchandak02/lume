import type { ToolcraftControlSectionInventoryEntry, ToolcraftProductReadiness } from "../app/acceptance/types";
import { LUME_TARGETS } from "./lume-settings";

export const lumeSectionInventory = [
  {
    entity: "Output background", entityId: "background",
    finiteSelectors: [{ reason: "Shows or hides the background fill and PNG alpha; the color stays editable either way.", role: "parameter", target: LUME_TARGETS.includeBackground }],
    groupingReason: "One output background; runtime relocates this source pair into Settings.",
    id: "runtime.setup", targets: [LUME_TARGETS.includeBackground, LUME_TARGETS.background], title: "Settings",
  },
  {
    entity: "Place at sea", entityId: "place", finiteSelectors: [],
    groupingReason: "Spots, latitude and longitude choose where the sea is read; spots only set the two sliders.",
    id: "place", targets: [LUME_TARGETS.spotPreset, LUME_TARGETS.latitude, LUME_TARGETS.longitude], title: "Place",
  },
  {
    entity: "Forecast moment", entityId: "time",
    finiteSelectors: [
      { reason: "Chooses which forecast day is drawn; every other control stays relevant.", role: "parameter", target: LUME_TARGETS.day },
      { reason: "Chooses which local hour is drawn; every other control stays relevant.", role: "parameter", target: LUME_TARGETS.hour },
    ],
    groupingReason: "Day and hour together choose one moment in the seven-day forecast.",
    id: "time", targets: [LUME_TARGETS.day, LUME_TARGETS.hour], title: "Time",
  },
  {
    entity: "Points of light", entityId: "glow", finiteSelectors: [],
    groupingReason: "Glow colour and point spacing style the same field of light.",
    id: "glow", targets: [LUME_TARGETS.glow, LUME_TARGETS.spacing], title: "Glow",
  },
  {
    entity: "Raster image output", entityId: "image-export",
    finiteSelectors: [
      { reason: "Selects PNG alpha support or opaque JPEG encoding.", role: "parameter", target: "export.image.format" },
      { reason: "Selects the output long-edge pixel size.", role: "parameter", target: "export.image.resolution" },
    ],
    groupingReason: "Runtime-owned image format and resolution govern one exported artifact.",
    id: "runtime.image-export", targets: ["export.image.format", "export.image.resolution"], title: "Image Export",
  },
] as const satisfies readonly ToolcraftControlSectionInventoryEntry[];

const edit = (id: string, target: string, detail: string) => ({
  alternative: { reason: "Persistent value controls on the poster would cover it.", surface: "canvas" as const },
  capability: "property-edit" as const, evidence: { detail, source: "usability-analysis" as const }, id,
  reason: "A global setting of the whole poster with no spatial handle.", selectionScope: { mode: "global" as const }, surface: "panel" as const, target,
});

export const lumeReadiness: ToolcraftProductReadiness = {
  exportIntent: { image: { mode: "toolcraft-default" }, svg: { mode: "not-requested" }, video: { mode: "not-requested" } },
  interactionOwnership: [
    edit("latitude-property", LUME_TARGETS.latitude, "Latitude is one number for the whole poster."),
    edit("longitude-property", LUME_TARGETS.longitude, "Longitude is one number for the whole poster."),
    edit("day-property", LUME_TARGETS.day, "The forecast day applies to the whole poster."),
    edit("hour-property", LUME_TARGETS.hour, "The forecast hour applies to the whole poster."),
    edit("glow-property", LUME_TARGETS.glow, "The glow colour applies to every point and the chart."),
    edit("spacing-property", LUME_TARGETS.spacing, "Point spacing applies to the whole field."),
    edit("background-color-property", LUME_TARGETS.background, "Runtime places the background color in Settings."),
    edit("background-include-property", LUME_TARGETS.includeBackground, "Runtime places the Background switch in Settings."),
    {
      alternative: { reason: "A shortcut command has no position on the poster.", surface: "canvas" },
      capability: "command", evidence: { detail: "Spot buttons set latitude and longitude.", source: "usability-analysis" },
      id: "spot-command", reason: "Shortcuts sit beside the sliders they set.", surface: "panel", target: LUME_TARGETS.spotPreset,
    },
  ],
  mode: "product",
  productName: "Lume",
  productSummary: "A sea state poster for any stretch of ocean from the Open-Meteo Marine forecast: a field of glowing points where the wind sea and swell interfere, wave height and direction, swell, sea level, current and sea temperature, and seven days of waves.",
  requestedBehavior: "Rebuild Lume on the current Toolcraft with a much better design: choose a surf spot or any point at sea and a moment in the next seven days, see the sea state as a glowing poster, and export it as an image.",
  viewInteraction: { mode: "non-spatial", reason: "The output is a two-dimensional poster, not a three-dimensional scene." },
};
