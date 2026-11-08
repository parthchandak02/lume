import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { expectToolcraftReferenceParity } from "./browser-acceptance-outcome-helpers";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { holdSliderDrag, openLume, outputSelector, reveal, waitForFrame } from "./lume-test-helpers";
import { expect, test } from "./toolcraft-product-test";
import { LUME_TARGETS, SPOT_PRESETS } from "../src/lume/lume-settings";

for (const [target, ratio] of [[LUME_TARGETS.latitude, 0.3], [LUME_TARGETS.longitude, 0.8]] as const) {
  test(`browser: lume control ${target}`, async ({ page }) => {
    const session = await openLume(page);
    const field = await getToolcraftControlFieldByTarget(page, target);
    const before = await field.getByRole("slider").getAttribute("aria-valuenow");
    await expectToolcraftProductObservableToChange(session, session.controlAction(target, () => holdSliderDrag(page, target, ratio)), { requirementId: target, selector: outputSelector });
    await page.mouse.up();
    await waitForFrame(page);
    await expectToolcraftReferenceParity(async () => (await field.getByRole("slider").getAttribute("aria-valuenow")) !== before, true, { requirementId: target, target });
  });
}

test(`browser: lume control ${LUME_TARGETS.spotPreset}`, async ({ page }) => {
  const session = await openLume(page);
  const order = [...SPOT_PRESETS.slice(1), SPOT_PRESETS[0]];
  for (const spot of order) {
    await expectToolcraftProductObservableToChange(
      session,
      session.controlAction(LUME_TARGETS.spotPreset, async (field) => {
        await reveal(field);
        await field.getByRole("button", { exact: true, name: spot.label }).click();
        await waitForFrame(page);
      }),
      { requirementId: LUME_TARGETS.spotPreset, selector: outputSelector },
    );
    await expect((await getToolcraftControlFieldByTarget(page, LUME_TARGETS.latitude)).getByRole("slider")).toHaveAttribute("aria-valuenow", String(spot.latitude));
  }
  await expectToolcraftReferenceParity(
    async () => (await getToolcraftControlFieldByTarget(page, LUME_TARGETS.longitude)).getByRole("slider").getAttribute("aria-valuenow"),
    String(SPOT_PRESETS[0].longitude),
    { requirementId: LUME_TARGETS.spotPreset, target: LUME_TARGETS.spotPreset },
  );
});
