import * as React from "react";
import { ToolcraftApp } from "@/toolcraft/runtime/react";
import { appSchema } from "../app/app-schema";
import { LumeCanvas } from "../components/LumeCanvas";
import { headingName, fetchMarineData, sstToColor, type MarineData } from "@/data/marine";

export function AppHome(): React.JSX.Element {
  const quietZoneRef = React.useRef<((data: MarineData, idx: number) => void) | null>(null);
  const [qzVisible, setQzVisible] = React.useState(false);
  const [qzData, setQzData] = React.useState<{
    waveHeight: string;
    sst: string;
    currentVelocity: string;
    heading: string;
  } | null>(null);
  const qzTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hero and stamp state
  const [heroValue, setHeroValue] = React.useState("--");
  const [stampText, setStampText] = React.useState(
    "Open-Meteo Marine -- SF Buoy -- loading...",
  );

  const showQuietZone = React.useCallback((data: MarineData, idx: number) => {
    setQzData({
      waveHeight: data.waveHeight.toFixed(2) + " m",
      sst: data.sst.toFixed(1) + "\u00b0C",
      currentVelocity: data.currentVelocity.toFixed(1) + " km/h",
      heading: data.currentDirection.toFixed(0) + "\u00b0 " + headingName(data.currentDirection),
    });
    setQzVisible(true);
    if (qzTimerRef.current) clearTimeout(qzTimerRef.current);
    qzTimerRef.current = setTimeout(() => setQzVisible(false), 3000);
  }, []);

  React.useEffect(() => {
    quietZoneRef.current = showQuietZone;
    return () => {
      quietZoneRef.current = null;
    };
  }, [showQuietZone]);

  // Fetch initial data for chrome
  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      const data = await fetchMarineData();
      if (cancelled) return;
      const ago = "0s";
      setHeroValue(data.sst.toFixed(1) + "\u00b0");
      setStampText(
        `Open-Meteo Marine -- SF Buoy -- wave ${data.waveHeight.toFixed(2)}m -- SST ${data.sst.toFixed(1)}\u00b0C -- updated ${ago} -- ` +
          (data.isFallback ? "fallback" : "live"),
      );
    }
    load();
    const interval = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <ToolcraftApp
        schema={appSchema}
        canvasContent={<LumeCanvas quietZoneRef={quietZoneRef} />}
        renderDefaultCanvasMedia={false}
      />

      {/* Chrome overlays (fixed positioned, on top of everything) */}
      <div id="hero-stats">
        <div className="hero-value">{heroValue}</div>
        <div className="hero-label">sea surface temperature</div>
      </div>

      <div id="data-stamp">{stampText}</div>

      <div id="desc">
        Ocean current data from the SF Buoy drives a field of bioluminescent points.
        Wave height controls point size, sea surface temperature controls color.
        Tap a point for exact data.
      </div>

      <div id="legend">
        <span style={{ color: "#00bcd4" }}>cold</span>
        <span style={{ margin: "0 8px", opacity: 0.3 }}>|</span>
        <span style={{ color: "#4dd0e1" }}>moderate</span>
        <span style={{ margin: "0 8px", opacity: 0.3 }}>|</span>
        <span style={{ color: "#ffab40" }}>warm</span>
        <span style={{ margin: "0 8px", opacity: 0.3 }}>|</span>
        size = wave height
      </div>

      <div id="quiet-zone" className={qzVisible ? "visible" : ""}>
        {qzData && (
          <div className="qz-card">
            <div className="qz-title">Ocean Data</div>
            <div className="qz-row">
              <span className="qz-label">Wave Height</span>
              <span className="qz-value">{qzData.waveHeight}</span>
            </div>
            <div className="qz-row">
              <span className="qz-label">SST</span>
              <span className="qz-value">{qzData.sst}</span>
            </div>
            <div className="qz-row">
              <span className="qz-label">Current</span>
              <span className="qz-value">{qzData.currentVelocity}</span>
            </div>
            <div className="qz-row">
              <span className="qz-label">Heading</span>
              <span className="qz-value">{qzData.heading}</span>
            </div>
            <a
              className="qz-link"
              href="https://open-meteo.com/en/docs/marine-weather-api"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Open-Meteo &rarr;
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
