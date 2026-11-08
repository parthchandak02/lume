import { expectToolcraftReferenceParity } from "./browser-acceptance-outcome-helpers";
import { expectToolcraftBackgroundOutputSemantics } from "./browser-background-output-evidence";
import { expectToolcraftInfinityCanvasBackgroundEvidence, observeInfinityCanvasBackground } from "./browser-infinity-canvas-evidence";
import { inspectToolcraftImageDownload } from "./image-artifact-inspection";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { downloadImage, fieldValue, openLume, outputSelector, selectValue } from "./lume-test-helpers";
import { expect, test } from "./toolcraft-product-test";

test("browser: lume background color changes output", async ({ page }) => {
  const session = await openLume(page);
    await expectToolcraftProductObservableToChange(session, session.controlAction("appearance.background", () => fieldValue(page, "appearance.background", "#F4F1EA")), {
    requirementId: "appearance.background",
    selector: outputSelector,
  });
  await expectToolcraftReferenceParity(() => page.getByRole("textbox", { name: "Background color hex" }).inputValue(), "#F4F1EA", {
    requirementId: "appearance.background",
    target: "appearance.background",
  });
});
