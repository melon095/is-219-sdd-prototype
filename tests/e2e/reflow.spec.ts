import { expect, type Page, test } from "@playwright/test";
import {
  eachMobileTab,
  type Group,
  groups,
  openVisit,
  startAs,
} from "./routes";

async function contentWidth(page: Page): Promise<number> {
  return page.evaluate(() => {
    const tables = Array.from(
      document.querySelectorAll<HTMLElement>(".wide-table"),
    );
    const previous = tables.map((table) => table.style.display);
    for (const table of tables) {
      table.style.display = "none";
    }
    const width = document.documentElement.scrollWidth;
    tables.forEach((table, index) => {
      table.style.display = previous[index] ?? "";
    });
    return width;
  });
}

async function expectReflow(page: Page, group: Group, limit: number) {
  await startAs(page, group);
  for (const visit of group.visits) {
    await openVisit(page, visit);
    expect(await contentWidth(page), visit.path).toBeLessThanOrEqual(limit);
    await eachMobileTab(page, async (label) => {
      expect(
        await contentWidth(page),
        `${visit.path} (fanen ${label})`,
      ).toBeLessThanOrEqual(limit);
    });
  }
}

test.describe("Innholdet flyter om ved 320 px bredde", () => {
  test.use({ viewport: { width: 320, height: 800 } });

  for (const group of groups) {
    test(`${group.name} (${group.user})`, async ({ page }) => {
      await expectReflow(page, group, 320);
    });
  }
});

test.describe("Innholdet flyter om ved 200 % zoom på et 1280 px bredt vindu", () => {
  test.use({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });

  for (const group of groups) {
    test(`${group.name} (${group.user})`, async ({ page }) => {
      await expectReflow(page, group, 640);
    });
  }
});
