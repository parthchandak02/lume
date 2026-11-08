import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { expectToolcraftReferenceParity } from "./browser-acceptance-outcome-helpers";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { fieldValue, holdSliderDrag, openLume, outputSelector, waitForFrame } from "./lume-test-helpers";
import { test } from "./toolcraft-product-test";
import { LUME_TARGETS } from "../src/lume/lume-settings";

test(`browser: lume control ${LUME_TARGETS.glow}`, async ({ page }) => {
  const session = await openLume(page);
  await expectToolcraftProductObservableToChange(session, session.controlAction(LUME_TARGETS.glow, () => fieldValue(page, LUME_TARGETS.glow, "#F2A65A")), {
    requirementId: LUME_TARGETS.glow,
    selector: outputSelector,
  });
  await expectToolcraftReferenceParity(async () => (await getToolcraftControlFieldByTarget(page, LUME_TARGETS.glow)).getByRole("textbox").inputValue(), "#F2A65A", {
    requirementId: LUME_TARGETS.glow,
    target: LUME_TARGETS.glow,
  });
});

test(`browser: lume control ${LUME_TARGETS.spacing}`, async ({ page }) => {
  const session = await openLume(page);
  const field = await getToolcraftControlFieldByTarget(page, LUME_TARGETS.spacing);
  const before = await field.getByRole("slider").getAttribute("aria-valuenow");
  await expectToolcraftProductObservableToChange(session, session.controlAction(LUME_TARGETS.spacing, () => holdSliderDrag(page, LUME_TARGETS.spacing, 0.6)), { requirementId: LUME_TARGETS.spacing, selector: outputSelector });
  await page.mouse.up();
  await waitForFrame(page);
  await expectToolcraftReferenceParity(async () => (await field.getByRole("slider").getAttribute("aria-valuenow")) !== before, true, { requirementId: LUME_TARGETS.spacing, target: LUME_TARGETS.spacing });
});
