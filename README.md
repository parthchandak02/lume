# lume

A living ocean data visualization. Bioluminescent points drift across a deep ocean canvas — each point's size = wave height, color = sea surface temperature, movement = ocean current.

**Visual Style:** Dark — Abyss (deep ocean, bioluminescent cyan-teal, warm amber accents)

**Data Source:** Open-Meteo Marine API (SF Buoy — ocean current velocity, direction, wave height, sea surface temperature)

**How it works:**
- API fetch every 60s from the Open-Meteo Marine API at SF Buoy coordinates (37.77, -122.42)
- Wave height controls point radius (taller waves = larger points)
- Sea surface temperature controls point color (cold = cyan, moderate = teal, warm = amber)
- Ocean current velocity and direction control point drift speed and angle
- Each point has slight random perturbation for natural visual variety
- Tap a point to see its exact marine data in the quiet zone overlay

**Toolcraft controls panel:**
- Particle count slider (20-200)
- Glow intensity slider (5-60)
- Drift speed multiplier (0.1-3.0)
- Color palette selector (natural / warm / cool / monochrome)

**GitHub:** https://github.com/parthchandak02/lume

**Live:** https://lume.parthchandak.info (provisioning) | https://lume-6mm.pages.dev

**Tech:** Pixel Point Toolcraft + Vite. Canvas 2D with bioluminescent glow rendering. Hosted on Cloudflare Pages.
