import { expect, test } from "@playwright/test";

test("forsiden viser overskriften på under 2 sekunder", async ({ page }) => {
  const started = Date.now();
  await page.goto("/", { waitUntil: "commit" });
  await page.getByRole("heading", { level: 1 }).waitFor({ state: "visible" });
  const elapsed = Date.now() - started;

  expect(elapsed).toBeLessThan(2000);
});
