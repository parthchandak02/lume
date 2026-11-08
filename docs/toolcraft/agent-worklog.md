# Toolcraft App Agent Worklog

## Status

Mode: product

Lume is a sea state poster for any stretch of ocean: a field of glowing points whose brightness is the interference of the wind sea and the swell, with wave height, direction and period, swell, sea level, current, sea surface temperature and seven days of waves, from the Open-Meteo Marine forecast. Detailed requests and results belong in `docs/agent-journal/changes`; command attempts live in `.toolcraft/journal/runs`.

Active change: lume-rebuild-0026

## Decision Trail

### Change lume-rebuild-0026 — Rebuild Lume on Toolcraft 0.0.26 with a new design

- Change ID: lume-rebuild-0026
- Request: "Yes do it for those and all others to make it consistent and the sites are too old and not well designed so we want to avoid that in the future make it much better ok?" The user then chose: all seven Toolcraft apps; each keeps its own look; rethink freely; no check-ins.
- Task type: Generated app porting plus substantial product redesign (renderer, data, controls, export).
- User-visible result: Instead of an animated drift of glowing specks off one coast, Lume now draws a still sea state poster: eight surf spots or any point at sea, any hour in the next seven days, a field of light where the two wave trains cross (their direction and period set the pattern, their height its contrast), the figures in light sans type, a temperature-coloured disc, and a seven-day wave chart with swell dashed.
- Source/reference checked: The previous Lume (github.com/parthchandak02/lume, Toolcraft template from July 2026); the Open-Meteo Marine API (all eight spots return data; points on land return empty series); earlier 0.0.26 rebuilds for wiring.
- Reference inputs: None (no motion, video, Figma or screenshot reference).
- Docs/contracts read: AGENTS.md, workflow.md, core/runtime-boundary.md, assembly-workflow.md, core/control-selection.md, core/layout.md, core/performance.md, core/setup-export.md, core/media-upload.md, core/development-files.md, core/app-cover.md, core/slider-ranges.md, decision-contract.md, schema-reference.md, component-rules.md, renderer-technique.md, performance.md, acceptance-testing.md (read for the Sol rebuild in the same session on the same 0.0.26 contract).
- Contract rules applied: runtime-shell-required, canvas-no-app-ui, canvas-surface-preserved, infinity-canvas-scene-bounds (intrinsic poster bounds), output-export-required (image only), controls-section-inventory-required, acceptance-product-observable, persistence-policy-explicit (default local persistence), discrete slider markers for Day and Hour.
- View interaction intent: non-spatial; a flat poster.
- Interaction ownership: panel only; latitude, longitude, day, hour, glow and spacing are global property edits, spots are panel commands.
- Decision: Replace the autonomous particle animation with a still poster built from the full marine forecast; compute brightness as the sum of two cosine wave trains using deep-water wavelength 1.56 T² over a 900 m field; draw points as round-capped zero-length strokes in eight brightness bands with a soft halo; label points on land as a sample sea instead of failing.
- Alternatives rejected: Keeping animation (needs autonomous-animation proof and adds nothing to a still export); canvas arcs per point (rejected by product code health in this file); canvas gradients for glow (rejected by code health; a wider low-alpha halo pass is used).
- State/output mapping: `place.latitude` and `place.longitude` choose the forecast point and trigger a cached load; `place.spot` sets both sliders; `time.day` and `time.hour` choose the hourly index for the field, figures and chart marker; `glow.color` and `glow.spacing` style the field and chart; `appearance.background` sets the runtime background and flips the ink on light colours; `export.includeBackground` removes the runtime fill; `canvas.size.*`, `canvas.renderScale` and `canvas.zoom` set the worker raster backing; the runtime image export calls the same `drawLume` after loading the same data.
- Verification: Unit tests in `src/lume/lume.test.ts` (22 passed: request, parsing, land and offline samples, temperature colours, compass names, wave interference, every control). 15 product browser specs passed with a deterministic Marine stub. Agent screenshots of Ocean Beach, Pipeline and Nazaré with live data inspected. The first-delivery gate result is recorded by its protected receipt.
- Risks: See Risks.

## Decisions

### Renderer

- Decision: Canvas 2D in a worker through one `raster` pipeline pass; export reuses `drawLume`.
- Reason: A few thousand points in eight paths, one chart and some text; one drawing function keeps preview and export identical.
- Evidence: `src/lume/lume-pipeline.ts`, `src/lume/LumeCanvas.tsx`, `src/lume/lume-export.ts`; `browser: lume backing preserves selected render scale`.

### View Interaction

- Decision: Mode `non-spatial`.
- Reason: The poster is flat.
- Evidence: `src/lume/lume-inventory.ts`.

### Interaction Ownership

- Decision: Panel only, nine entries.
- Reason: Every input is a global value or shortcut.
- Evidence: `src/lume/lume-inventory.ts` `interactionOwnership`.

### Timeline

- Decision: No timeline.
- Reason: A still poster; Day and Hour are sliders, not playback, and video was not requested.
- Evidence: No timeline module; `animationIntent: none`.

### Layers

- Decision: No layers.
- Reason: No layer workflow was requested.
- Evidence: No layers module.

### Controls

- Decision: Settings (runtime background), Place (Spots, Latitude, Longitude), Time (Day, Hour), Glow (Glow color, Point spacing), Image Export (runtime).
- Reason: Where, when and how the light looks are three separate choices.
- Evidence: `src/lume/lume-controls.ts`, `appControlSectionInventory`; browser specs click every spot and drag every slider while held.

### Export

- Decision: Image export only (PNG/JPG, 2K/4K/8K) via `imageExportModule()` and `scene.rasterFrameRenderer`.
- Reason: Toolcraft default; SVG and video were not requested.
- Evidence: `browser: lume image export delivers every format and size` decodes every format and size and checks the temperature disc colour and content bounds.

### Performance

- Decision: Workload envelope from runtime state (canvas width/height, render scale, zoom) plus export resolution; derived paths; adapters stub the API.
- Reason: Point spacing has an 8 px floor, so the field stays bounded; cost follows the backing size.
- Evidence: `src/lume/lume-performance-model.ts`; `lume render plan has valid derived paths and fixtures`. First delivery runs no measured performance by contract.

Canonical control values and selected-entity isolation follow runtime representations; render scale has functional `renderScaleCoverage` with backing-pixel proof.

## Evidence

- Source reviewed: previous Lume, Open-Meteo Marine API, earlier 0.0.26 rebuilds.
- Contract applied: product modules under `src/lume`, registered browser scenarios in `e2e/product-lume-*.spec.ts`, cover at `public/toolcraft/cover.png` with `app-cover.json` and `app-cover-state.json`.

## Verification

Protected receipts own initial proof. Development checks: `src/lume/lume.test.ts` 22 passed; 15 product browser specs passed (two Playwright workers on the dev server); screenshots inspected. Cover captured with the app's own Export PNG at 4K.

## Risks

- Risk: The light field is an idealised plane-wave picture of two trains over 900 m, not a simulation of the real surface near the shore.
- Risk: Points on land, and times when the API is down, show a labelled sample sea.
