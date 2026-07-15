import { defineToolcraft } from "@/toolcraft/runtime";

export const appSchema = defineToolcraft({
  canvas: {
    enabled: true,
  },
  panels: {
    controls: {
      sections: [
        {
          title: "Display",
          controls: {
            particleCount: {
              type: "slider",
              target: "particleCount",
              label: "Particles",
              defaultValue: 100,
              min: 20,
              max: 200,
              step: 10,
            },
            glowIntensity: {
              type: "slider",
              target: "glowIntensity",
              label: "Glow",
              defaultValue: 30,
              min: 5,
              max: 60,
              step: 5,
            },
            animationSpeed: {
              type: "slider",
              target: "animationSpeed",
              label: "Drift Speed",
              defaultValue: 1,
              min: 0.1,
              max: 3,
              step: 0.1,
            },
          },
        },
        {
          title: "Color",
          controls: {
            colorScheme: {
              type: "segmented",
              target: "colorScheme",
              label: "Palette",
              defaultValue: "natural",
              options: [
                { value: "natural", label: "Natural" },
                { value: "warm", label: "Warm" },
                { value: "cool", label: "Cool" },
                { value: "mono", label: "Mono" },
              ],
            },
          },
        },
        {
          title: "Info",
          controls: {
            dataStamp: {
              type: "text",
              target: "dataStamp",
              label: "Source",
              defaultValue: "Open-Meteo Marine -- SF Buoy -- loading...",
            },
          },
        },
      ],
      title: "Controls",
    },
  },
  toolbar: {
    history: false,
    radar: false,
    zoom: false,
  },
});
