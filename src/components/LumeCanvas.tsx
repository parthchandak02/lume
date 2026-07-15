import * as React from "react";
import { useToolcraftValue } from "@/toolcraft/runtime/react";
import {
  fetchMarineData,
  sstToColor,
  directionToVector,
  headingName,
  type MarineData,
} from "@/data/marine";

interface Point {
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
  angle: number;
  pulsePhase: number;
  baseOpacity: number;
  waveHeight: number;
  sst: number;
  index: number;
}

const POINT_BASE_RADIUS = 6;
const POINT_RADIUS_PER_WAVE = 4;

export function LumeCanvas({
  quietZoneRef,
}: {
  quietZoneRef?: React.MutableRefObject<((data: MarineData, idx: number) => void) | null>;
}): React.JSX.Element {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const pointsRef = React.useRef<Point[]>([]);
  const marineRef = React.useRef<MarineData | null>(null);
  const animRef = React.useRef(0);
  const lastFetchRef = React.useRef(0);
  const bgCanvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const particleCount = (useToolcraftValue("particleCount") as number) ?? 100;
  const glowIntensity = (useToolcraftValue("glowIntensity") as number) ?? 30;
  const animSpeed = (useToolcraftValue("animationSpeed") as number) ?? 1;
  const colorScheme = (useToolcraftValue("colorScheme") as string) ?? "natural";

  // Initialize points
  const initPoints = React.useCallback(
    (data: MarineData, W: number, H: number) => {
      const pts: Point[] = [];
      const { vx, vy } = directionToVector(data.currentDirection, data.currentVelocity);
      for (let i = 0; i < 120; i++) {
        const jitterR = (Math.random() - 0.5) * 0.4;
        const jitterA = (Math.random() - 0.5) * 0.5;
        pts.push({
          x: Math.random() * W,
          y: Math.random() * H,
          radius: POINT_BASE_RADIUS + data.waveHeight * POINT_RADIUS_PER_WAVE + jitterR * 2,
          color: sstToColor(data.sst + (Math.random() - 0.5) * 1.5, colorScheme),
          speed: Math.sqrt(vx * vx + vy * vy) * 0.8 + Math.random() * 0.4,
          angle: Math.atan2(vy, vx) + jitterA,
          pulsePhase: Math.random() * Math.PI * 2,
          baseOpacity: 0.5 + Math.random() * 0.3,
          waveHeight: data.waveHeight,
          sst: data.sst,
          index: i,
        });
      }
      pointsRef.current = pts;
    },
    [colorScheme],
  );

  const fetchData = React.useCallback(async () => {
    const data = await fetchMarineData();
    marineRef.current = data;
    const canvas = canvasRef.current;
    if (canvas) {
      if (pointsRef.current.length === 0) {
        initPoints(data, canvas.width, canvas.height);
      }
    }
    lastFetchRef.current = Date.now();
  }, [initPoints]);

  // Fetch on mount
  React.useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Update points when controls change
  React.useEffect(() => {
    const data = marineRef.current;
    if (!data || pointsRef.current.length === 0) return;
    pointsRef.current.forEach((p) => {
      p.color = sstToColor(data.sst + (Math.random() - 0.5) * 1.5, colorScheme);
      p.radius = POINT_BASE_RADIUS + data.waveHeight * POINT_RADIUS_PER_WAVE;
      const { vx, vy } = directionToVector(data.currentDirection, data.currentVelocity);
      p.speed = Math.sqrt(vx * vx + vy * vy) * 0.8;
      p.angle = Math.atan2(vy, vx);
    });
  }, [colorScheme]);

  // Expose quiet zone trigger
  React.useEffect(() => {
    if (quietZoneRef) {
      quietZoneRef.current = (_data: MarineData, _idx: number) => {
        // handled by the route
      };
    }
    return () => {
      if (quietZoneRef) quietZoneRef.current = null;
    };
  }, [quietZoneRef]);

  // Render loop
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let dpr = 1;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      canvas!.style.width = W + "px";
      canvas!.style.height = H + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);

    function draw(time: number) {
      ctx!.clearRect(0, 0, W, H);

      // Draw background gradient
      const grad = ctx!.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.6);
      grad.addColorStop(0, "#0f1b2d");
      grad.addColorStop(1, "#0a0e17");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, W, H);

      const data = marineRef.current;
      if (!data) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const pts = pointsRef.current;
      const speed = animSpeed * 1.5;

      // Draw trail layer
      pts.forEach((p) => {
        const opacity = p.baseOpacity * 0.15;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
        ctx!.fillStyle = p.color.replace("rgb", "rgba").replace(")", `,${opacity})`);
        ctx!.fill();
      });

      // Draw main points with glow
      pts.forEach((p) => {
        const pulse = 0.5 + 0.5 * Math.sin(time * 0.001 + p.pulsePhase);
        const opacity = p.baseOpacity * (0.6 + 0.4 * pulse);

        ctx!.save();
        ctx!.globalAlpha = opacity;

        // Outer glow
        const grad2 = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius + glowIntensity * 0.3);
        const glowColor = p.color.replace("rgb", "rgba").replace(")", `,${opacity * 0.25})`);
        grad2.addColorStop(0, glowColor);
        grad2.addColorStop(1, "rgba(0,0,0,0)");
        ctx!.fillStyle = grad2;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.radius + glowIntensity * 0.3, 0, Math.PI * 2);
        ctx!.fill();

        // Core
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.fill();

        // Bright center
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.radius * 0.35, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(255,255,255,0.4)";
        ctx!.fill();

        ctx!.restore();

        // Update position
        p.x += Math.cos(p.angle) * p.speed * speed;
        p.y += Math.sin(p.angle) * p.speed * speed;

        // Wrap around edges
        if (p.x < -p.radius * 4) p.x = W + p.radius * 4;
        if (p.x > W + p.radius * 4) p.x = -p.radius * 4;
        if (p.y < -p.radius * 4) p.y = H + p.radius * 4;
        if (p.y > H + p.radius * 4) p.y = -p.radius * 4;
      });

      // Grid lines (subtle)
      ctx!.strokeStyle = "rgba(255,255,255,0.03)";
      ctx!.lineWidth = 1;
      for (let x = 0; x < W; x += 60) {
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, H);
        ctx!.stroke();
      }
      for (let y = 0; y < H; y += 60) {
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        ctx!.lineTo(W, y);
        ctx!.stroke();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [animSpeed, glowIntensity]);

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas || !marineRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find closest point
    const pts = pointsRef.current;
    let closestIdx = -1;
    let closestDist = Infinity;
    pts.forEach((p, i) => {
      const dx = p.x - x;
      const dy = p.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist && dist < p.radius * 3) {
        closestDist = dist;
        closestIdx = i;
      }
    });

    if (closestIdx >= 0 && quietZoneRef?.current) {
      quietZoneRef.current(marineRef.current, closestIdx);
    }
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ touchAction: "manipulation", cursor: "crosshair" }}
      onClick={handleCanvasClick}
    />
  );
}
