import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { axeTags } from "./helpers";
import { eachMobileTab, groups, openVisit, startAs } from "./routes";

async function expectNoViolations(page: Page, where: string) {
  const result = await new AxeBuilder({ page }).withTags(axeTags).analyze();
  expect(result.violations, where).toEqual([]);
}

async function expectPageBasics(page: Page, where: string) {
  expect(await page.locator("h1").count(), `${where}: antall h1`).toBe(1);
  await expect(page, where).toHaveTitle(/ – Varodd$/);
}

test.describe("Alle sider følger WCAG 2.1 AA", () => {
  for (const group of groups) {
    test(`${group.name} (${group.user})`, async ({ page }) => {
      await startAs(page, group);
      for (const visit of group.visits) {
        await openVisit(page, visit);
        await expectPageBasics(page, visit.path);
        await expectNoViolations(page, visit.path);
        await eachMobileTab(page, async (label) => {
          await expectNoViolations(page, `${visit.path} (fanen ${label})`);
        });
      }
    });
  }
});
