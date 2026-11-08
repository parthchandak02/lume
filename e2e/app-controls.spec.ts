import { openLume } from "./lume-test-helpers";
import { expect, test } from "./toolcraft-product-test";

test("browser: lume opens in the Toolcraft shell", async ({ page }) => {
  await openLume(page);
  await expect(page.getByRole("button", { exact: true, name: "Export PNG" })).toBeVisible();
  await expect(page.getByRole("button", { exact: true, name: "Pipeline" })).toBeVisible();
  await expect(page.getByRole("application", { name: "Canvas viewport" })).toBeVisible();
});
