import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { expectToolcraftReferenceParity } from "./browser-acceptance-outcome-helpers";
import { expectToolcraftDiscreteSliderMarkers } from "./performance-control-layout-helpers";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { holdSliderDrag, openLume, outputSelector, waitForFrame } from "./lume-test-helpers";
import { test } from "./toolcraft-product-test";
import { LUME_DEFAULTS, LUME_TARGETS } from "../src/lume/lume-settings";

for (const [target, ratio, start] of [[LUME_TARGETS.day, 0.7, LUME_DEFAULTS.day], [LUME_TARGETS.hour, 0.85, LUME_DEFAULTS.hour]] as const) {
  test(`browser: lume control ${target}`, async ({ page }) => {
    const session = await openLume(page);
    const field = await getToolcraftControlFieldByTarget(page, target);
    await expectToolcraftProductObservableToChange(session, session.controlAction(target, () => holdSliderDrag(page, target, ratio)), { requirementId: target, selector: outputSelector });
    await page.mouse.up();
    await waitForFrame(page);
    await expectToolcraftDiscreteSliderMarkers(page, target, target);
    await expectToolcraftReferenceParity(async () => (await field.getByRole("slider").getAttribute("aria-valuenow")) !== String(start), true, { requirementId: target, target });
  });
}
