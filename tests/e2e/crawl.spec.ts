import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { axeTags, switchUser } from "./helpers";

const suggestionNote =
  "Vi har lagt inn noen ferdigheter vi tror du trenger, ut fra det vi fant på nettsiden til bedriften din. De er merket «Forslag». Fjern dem som ikke passer, og legg til andre om du vil.";

const switchName =
  "Vi vil gjerne få forslag fra en simulert gjennomgang av nettsiden vår";

function crawlSection(page: Page) {
  return page.getByRole("region", {
    name: "Simulert gjennomgang av nettsider",
  });
}

async function runCrawl(page: Page) {
  await page.goto("/#/admin");
  const section = crawlSection(page);
  const items = section.getByRole("listitem");
  const before = await items.count();
  await section
    .getByRole("button", { name: "Kjør simulert gjennomgang" })
    .click();
  await expect(items).toHaveCount(before + 1);
  return items.first();
}

test.describe("Simulert gjennomgang og forslag til ferdigheter", () => {
  test("admin kjører gjennomgangen, og eiere med valget på får markerte forslag", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Marte Vik");
    const latest = await runCrawl(page);
    await expect(latest).toContainText("Gjennomgått:");
    await expect(latest).toContainText("Fjordlys Keramikk");
    await expect(latest).toContainText("Hoppet over:");
    await expect(latest).toContainText("Sørlandet Honning");

    await switchUser(page, "Kari Nordmann");
    await page.goto("/#/oppdrag/ny");
    await expect(
      page.getByRole("heading", { level: 1, name: "Nytt oppdrag" }),
    ).toBeVisible();
    const suggested = page.getByRole("row", { name: /\(Forslag\)$/ });
    await expect(suggested.first()).toBeVisible();
    expect(await suggested.count()).toBeGreaterThanOrEqual(3);
    await expect(page.getByText(suggestionNote)).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Nødvendige ferdigheter" }),
    ).toHaveAccessibleDescription(`${suggestionNote} Simulert`);
  });

  test("en eier uten valget på får ingen forslag", async ({ page }) => {
    await page.goto("/");
    await switchUser(page, "Marte Vik");
    await runCrawl(page);

    await switchUser(page, "Per Hansen");
    await page.goto("/#/oppdrag/ny");
    await expect(
      page.getByRole("heading", { level: 1, name: "Nytt oppdrag" }),
    ).toBeVisible();
    await expect(page.getByRole("grid", { name: /^Valgte/ })).toHaveCount(0);
    await expect(page.getByText("Forslag", { exact: true })).toHaveCount(0);
  });

  test("et eksisterende oppdrag beholder ferdighetene etter en ny gjennomgang", async ({
    page,
  }) => {
    await page.goto("/#/oppdrag/oppdrag-4");
    const skills = page.locator(".skill-tags").first().getByRole("listitem");
    await expect(skills.first()).toBeVisible();
    const before = await skills.allInnerTexts();

    await switchUser(page, "Marte Vik");
    await runCrawl(page);

    await page.goto("/#/oppdrag/oppdrag-4");
    await expect(
      page.locator(".skill-tags").first().getByRole("listitem"),
    ).toHaveText(before);
  });

  test("eieren slår av valget, og bedriften hoppes over ved neste gjennomgang", async ({
    page,
  }) => {
    await page.goto("/#/bedrift");
    await expect(
      page.getByRole("heading", { level: 1, name: "Min bedrift" }),
    ).toBeVisible();
    const toggle = page.getByRole("switch", { name: switchName });
    await expect(toggle).toBeChecked();
    await page.getByText(switchName).click();
    await expect(toggle).not.toBeChecked();

    await switchUser(page, "Marte Vik");
    const latest = await runCrawl(page);
    await expect(latest).toContainText(/Hoppet over:[\s\S]*Fjordlys Keramikk/);
    await expect(latest).toContainText(/Hoppet over:[\s\S]*Sørlandet Honning/);
  });

  test("Min bedrift har ingen tilgjengelighetsfeil", async ({ page }) => {
    await page.goto("/#/bedrift");
    await expect(
      page.getByRole("heading", { level: 1, name: "Min bedrift" }),
    ).toBeVisible();
    await expect(page.getByRole("switch", { name: switchName })).toBeVisible();
    const result = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(result.violations).toEqual([]);
  });
});
