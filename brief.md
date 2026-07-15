# lume — Creative Brief

## Concept
A living ocean data visualization. Bioluminescent points drift across a deep ocean canvas — each point's size = wave height, color = sea surface temperature, movement = ocean current. Like watching glowing marine organisms move with the tide.

**Narrative Pattern:** Annotation — each point carries data context visible at rest (temperature, wave height)

**Tier 2 Patterns (pick 2):** Quiet Zone (tap reveals detailed marine data) + Hero Number (current SST prominently displayed)

**Metaphor family:** atmosphere (ocean glow / bioluminescent drift)

## Data Source
- API: `https://marine-api.open-meteo.com/v1/marine?latitude=37.77&longitude=-122.42&current=ocean_current_velocity,ocean_current_direction,wave_height,sea_surface_temperature`
- Response format: JSON with `current` object containing `ocean_current_velocity` (km/h), `ocean_current_direction` (degrees), `wave_height` (m), `sea_surface_temperature` (°C)
- Fetch interval: every 60 seconds
- Fallback: embedded real data from SF Buoy — wave_height: 1.06, SST: 15.4, current_velocity: 1.5, current_direction: 30

## Three Dials
- DESIGN_VARIANCE: 5 (semi-random — points follow the same current but have natural size/color variation based on data with slight perturbation for visual richness)
- MOTION_INTENSITY: 5 (gentle — points drift slowly in the current direction, soft pulsing glow)
- VISUAL_DENSITY: 5 (moderate — 80-120 points)

## Visual Style
- Preset: Dark — Abyss (Deep Ocean), adapted for bioluminescence
- Palette:
  ```js
  const PALETTE = {
    bg: '#0a0e17',          // deep ocean blue-black
    layer: '#0f1b2d',       // slightly lighter layer for depth
    cold: '#00bcd4',        // cyan — cold water points (primary)
    neutral: '#4dd0e1',     // bright cyan — mid temp points (glow)
    warm: '#ffab40',        // warm amber — warm water points
    hot: '#ff6d00',         // orange — hottest points
    text: 'rgba(255,255,255,0.5)',
  };
  ```
- Shape language: circular bioluminescent points with glow effect
- Alpha hierarchy: bg=1.0, trail=0.08, field=0.3, active=0.7, label=0.45
- Glow budget: 1 glow color (cyan-teal), blur <= 30px, on ALL points (they are the data)
- Stroke weight: N/A (point-based, no strokes)

## Encoding Contract
| Data Field | Visual Channel | Range | Inverse Function | "Bigger means..." | Legend? |
|---|---|---|---|---|---|
| wave_height (m) | point radius | 4-20px | invertScale(pixel,4,20, 0.5,4.0) | taller waves | yes |
| sea_surface_temp (°C) | point hue | cyan→teal→amber→orange | colorToTemp(hex) maps back to temp range | warmer water | yes |
| ocean_current_velocity (km/h) | point speed (pixels/frame) | 0.3-3.0 | invertScale(pixels,0.3,3.0, 0,5) | faster current | yes |
| ocean_current_direction (°) | point movement angle | 0-360° | map to heading string (N/NE/E/SE...) | heading direction | yes |

## Interaction
- Tap/click any point: opens Quiet Zone with exact marine data for that point (wave height, SST, current velocity, current direction, location, last updated time, source link to Open-Meteo)
- No auto-animation beyond the gentle drift
- Points pulse subtly (opacity oscillation 0.5-0.9, period = 2-4s randomized per point)

## Communication Requirements
**Tier 1 (mandatory):**
1. Persistent Data Stamp — "Open-Meteo Marine · SF Buoy · wave 1.06m · SST 15.4°C · updated Xs ago"
2. Data Process Honesty — shows "live" or "fallback" in stamp
3. One-to-One Sensory Mapping — bigger point = taller wave, warmer color = warmer water, speed = current velocity

**Tier 2 (pick 2):**
4. Hero Number — 48px SST value top-left with "sea surface temp" label below
5. Quiet Zone Detail Panel — tap reveals point's wave height, SST, current speed, current direction, heading name, source link

## Coherence
- shapeLanguage: point-field (bioluminescent dots)
- alphaHierarchy: {bg:1.0, trail:0.08, field:0.3, active:0.7, label:0.45}
- glowBudget: 1 glow color (#00bcd4), blur 30px, on all points
- accent color: exactly 1 main (cyan-teal) + semantic warm (amber/orange for warm temps)
- spacing: 8px grid for DOM chrome
- type scale: one size for chrome (10-11px system-ui)
- motion tokens: --motion-fast:160ms; --motion-base:240ms; --motion-slow:360ms; --ease-out-expo
- AI Slop Score: < 30 — no Inter/Roboto/Open Sans, layered bg, at least fade-in animation

## Render tier
toolcraft — npx @pixel-point/toolcraft create, Vite build, deploy dist/

## Toolcraft scene
- Canvas component: LumeCanvas.tsx — renders 80-120 bioluminescent points on dark ocean background
- Controls: particle count slider (20-200), glow intensity slider, color scheme selector (natural / warm / cool / monochrome), animation speed slider, reset button
- Sections: Display (particle count, glow intensity, animation speed), Color (scheme selector, warm accent), Info (data stamp)
- Default view: 3-second decode — dark canvas with glowing colored dots drifting gently; hero number shows SST; stamp shows source

## Deploy
- Slug: lume
- URL: https://lume.parthchandak.info

## Required Component Structure

### src/index.css
Full-viewport canvas, dark background. No Inter font import. No class="dark" on html. Override Toolcraft dark defaults:
```css
:root {
  --background: #0a0e17;
  --foreground: rgba(255,255,255,0.7);
  --card: #0f1b2d;
  --border: rgba(255,255,255,0.08);
}
```

### src/App.tsx
ToolcraftApp with schema, LumeCanvas, onPanelAction handler for reset.
Chrome: HeroStats (SST + label), DataStamp (source + time), Desc (bottom center), Legend (color/size mappings).

### src/components/LumeCanvas.tsx
Canvas component. Reads Toolcraft control values via useToolcraftValue().
- 80-120 points rendered as circles with shadowBlur glow
- API fetch on mount + every 60s
- Each point: radius from wave_height, color from SST, velocity from current, direction from current heading
- Slight random perturbation per point for visual variety (radius ±15%, position jitter, pulse offset)
- Points drift in current direction, wrap around edges
- Touch guard on click for Quiet Zone
- useRef for per-frame values (no setState in animation loop)

### src/components/QuietZone.tsx
DOM overlay. Shows on tap: exact wave height, SST, current speed + direction for tapped point. Source link to Open-Meteo. Fades after 3s.

### src/components/Chrome.tsx
HeroStats (top-left), DataStamp (bottom-left), Description (bottom-center), Legend (bottom-center above desc).

### src/data/marine.ts
API fetch function with fallback data. Returns { waveHeight, sst, currentVelocity, currentDirection, timestamp }.
