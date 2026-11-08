import { expect, type Locator, type Page } from "@playwright/test";

import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { createToolcraftBrowserProofSession } from "./browser-proof-session";

export const outputSelector = '[data-testid="lume-output"]';

export async function waitForFrame(page: Page): Promise<void> {
  await expect(page.locator(outputSelector)).toHaveAttribute("data-frame-ready", "true", { timeout: 15_000 });
}

/** Deterministic sea state per place: wave direction and size depend on the coordinates. */
export function stubMarineJson(latitude: number, longitude: number) {
  const time = Array.from({ length: 168 }, (_, i) => `2026-06-${String(21 + Math.floor(i / 24)).padStart(2, "0")}T${String(i % 24).padStart(2, "0")}:00`);
  const series = (base: number, amp: number, period: number) => time.map((_, i) => Math.round((base + amp * Math.sin(i / period + latitude / 7)) * 100) / 100);
  const turn = (longitude * 3 + 360) % 360;
  return {
    hourly: {
      ocean_current_direction: series(turn, 20, 30),
      ocean_current_velocity: series(1, 0.4, 10),
      sea_level_height_msl: series(0, 0.7, 1.98),
      sea_surface_temperature: series(18, 0.5, 24),
      swell_wave_direction: series((turn + 40) % 360, 15, 50),
      swell_wave_height: series(1.2 + Math.abs(latitude) / 60, 0.5, 30),
      swell_wave_period: series(11, 2, 40),
      time,
      wave_direction: series(turn, 25, 20),
      wave_height: series(1.6 + Math.abs(latitude) / 50, 0.7, 25),
      wave_period: series(9, 2, 30),
    },
    timezone: "UTC",
  };
}

export async function stubMarine(page: Page): Promise<void> {
  await page.route("https://marine-api.open-meteo.com/**", async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({ headers: { "access-control-allow-origin": "*" }, json: stubMarineJson(Number(url.searchParams.get("latitude")), Number(url.searchParams.get("longitude"))) });
  });
}

export async function openLume(page: Page) {
  await stubMarine(page);
  await page.goto("/");
  // A cold dev server may optimize dependencies and reload the page once; wait for a finished frame first
  await page.waitForLoadState("networkidle");
  await expect(page.locator(outputSelector)).toHaveAttribute("data-frame-ready", "true", { timeout: 30_000 });
  await expect(page.locator(outputSelector)).toHaveAttribute("data-sea-source", "live");
  const session = await createToolcraftBrowserProofSession(page);
  await waitForFrame(page);
  return session;
}

export async function reveal(field: Locator): Promise<void> {
  await field.evaluate((element) => element.scrollIntoView({ block: "center" }));
}

export async function fieldValue(page: Page, target: string, value: string): Promise<void> {
  const field = await getToolcraftControlFieldByTarget(page, target);
  await reveal(field);
  const input = field.getByRole("textbox");
  await input.fill(value);
  await input.press("Enter");
}

export async function selectValue(page: Page, target: string, label: string): Promise<void> {
  const field = await getToolcraftControlFieldByTarget(page, target);
  await reveal(field);
  await field.getByRole("combobox").click();
  await page.getByRole("option", { exact: true, name: label }).click();
}

export async function setSlider(page: Page, target: string, value: number): Promise<void> {
  const field = await getToolcraftControlFieldByTarget(page, target);
  await reveal(field);
  await field.getByRole("button", { name: /^Edit .* value$/ }).click();
  const input = field.getByRole("textbox");
  await expect(input).toBeFocused();
  await input.fill(String(value));
  await input.press("Enter");
  await expect(field.getByRole("button", { name: /^Edit .* value$/ })).toContainText(String(value));
}

/** Press a slider thumb and drag it toward `ratio` of the track while the pointer stays down. */
export async function holdSliderDrag(page: Page, target: string, ratio: number): Promise<void> {
  const field = await getToolcraftControlFieldByTarget(page, target);
  await reveal(field);
  const slider = field.getByRole("slider");
  const thumb = await slider.boundingBox();
  const track = await field.locator('[data-slot="slider"]').first().boundingBox();
  expect(thumb).not.toBeNull();
  expect(track).not.toBeNull();
  await page.mouse.move(thumb!.x + thumb!.width / 2, thumb!.y + thumb!.height / 2);
  await page.mouse.down();
  await page.mouse.move(track!.x + track!.width * ratio, track!.y + track!.height / 2, { steps: 8 });
}

export async function downloadImage(page: Page) {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /^Export (PNG|JPG)$/ }).click();
  return download;
}

export async function fitScene(page: Page): Promise<void> {
  await page.getByRole("switch", { exact: true, name: "Infinity canvas" }).uncheck();
  await fieldValue(page, "canvas.size.width", "960");
  await page.getByRole("button", { exact: true, name: "Center canvas" }).click();
  await waitForFrame(page);
}
