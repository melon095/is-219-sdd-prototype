import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

function isMobile(page: Page): boolean {
  const size = page.viewportSize();
  return size !== null && size.width < 768;
}

async function openControls(page: Page) {
  if (isMobile(page)) {
    await page.getByRole("button", { name: "Meny" }).click();
    await expect(page.getByRole("dialog", { name: "Meny" })).toBeVisible();
  }
}

async function closeControls(page: Page) {
  if (isMobile(page)) {
    await page.getByRole("button", { name: "Lukk meny" }).click();
    await expect(page.getByRole("dialog", { name: "Meny" })).toBeHidden();
  }
}

async function switchUser(page: Page, name: string) {
  await openControls(page);
  await page.getByRole("button", { name: /Bytt bruker/ }).click();
  await page.getByRole("option", { name }).click();
  await closeControls(page);
}

async function pressFeatureLink(page: Page, name: string) {
  await openControls(page);
  const scope = isMobile(page)
    ? page.getByRole("dialog", { name: "Meny" })
    : page.getByRole("banner");
  await scope.getByRole("link", { name, exact: true }).click();
}

async function resetDemo(page: Page) {
  await openControls(page);
  await page.getByRole("button", { name: "Tilbakestill demo" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Tilbakestill", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  if (isMobile(page)) {
    await expect(page.getByRole("dialog", { name: "Meny" })).toBeHidden();
  }
}

async function changeStoredPersonName(page: Page, id: string, name: string) {
  await page.evaluate(
    ({ id: personId, name: newName }) => {
      const key = "varodd-prototype:state";
      const stored = JSON.parse(window.localStorage.getItem(key) ?? "null");
      const person = stored.state.frame.people.find(
        (candidate: { id: string }) => candidate.id === personId,
      );
      person.name = newName;
      window.localStorage.setItem(key, JSON.stringify(stored));
    },
    { id, name },
  );
}

test.describe("Den delte rammen", () => {
  test("bytte bruker endrer hilsenen på forsiden", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Hei, Kari!" }),
    ).toBeVisible();

    await switchUser(page, "Mats Johansen");
    await expect(
      page.getByRole("heading", { level: 1, name: "Hei, Mats!" }),
    ).toBeVisible();

    await switchUser(page, "Marte Vik");
    await expect(
      page.getByRole("heading", { level: 1, name: "Hei, Marte!" }),
    ).toBeVisible();
  });

  test("hver knapp i toppen åpner siden med h1 i fokus", async ({ page }) => {
    await page.goto("/");

    await pressFeatureLink(page, "Oppdrag");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveText("Oppdrag");
    await expect(heading).toBeFocused();
    await expect(page).toHaveURL(/#\/oppdrag$/);
    if (isMobile(page)) {
      await expect(page.getByRole("dialog", { name: "Meny" })).toBeHidden();
    }

    await pressFeatureLink(page, "Hjem");
    await expect(heading).toHaveText(/^Hei, /);
    await expect(heading).toBeFocused();
    await expect(page).toHaveURL(/#\/$/);
    if (isMobile(page)) {
      await expect(page.getByRole("dialog", { name: "Meny" })).toBeHidden();
    }
  });

  test("funksjonskort og aktivitet ligger ved siden av hverandre på skrivebord og under hverandre på mobil", async ({
    page,
  }) => {
    await page.goto("/");
    const cards = page
      .getByRole("heading", { level: 2, name: "Få hjelp med små oppdrag" })
      .locator("xpath=..");
    const feed = page.getByRole("region", { name: "Siste aktivitet" });
    await expect(cards).toBeVisible();
    await expect(feed).toBeVisible();
    const cardsBox = await cards.boundingBox();
    const feedBox = await feed.boundingBox();
    if (cardsBox === null || feedBox === null) {
      throw new Error("Fant ikke plasseringen til kortene eller aktiviteten");
    }

    if (isMobile(page)) {
      expect(feedBox.y).toBeGreaterThan(cardsBox.y + cardsBox.height);
      expect(Math.abs(feedBox.x - cardsBox.x)).toBeLessThan(16);
    } else {
      expect(feedBox.x).toBeGreaterThan(cardsBox.x + cardsBox.width);
      expect(Math.abs(feedBox.y - cardsBox.y)).toBeLessThan(16);
    }
  });

  test("Varodd ligger på samme linje som knappene i toppen på skrivebord", async ({
    page,
  }) => {
    test.skip(isMobile(page), "Gjelder bare skrivebordsoppsettet");
    await page.goto("/");
    const banner = page.getByRole("banner");
    const brand = await banner
      .getByRole("link", { name: "Varodd", exact: true })
      .boundingBox();
    const home = await banner
      .getByRole("link", { name: "Hjem", exact: true })
      .boundingBox();
    const reset = await banner
      .getByRole("button", { name: "Tilbakestill demo" })
      .boundingBox();
    if (brand === null || home === null || reset === null) {
      throw new Error("Fant ikke plasseringen til elementene i toppen");
    }
    const centre = (box: { y: number; height: number }) =>
      box.y + box.height / 2;

    expect(Math.abs(centre(brand) - centre(home))).toBeLessThanOrEqual(4);
    expect(Math.abs(centre(brand) - centre(reset))).toBeLessThanOrEqual(4);
  });

  test("Tilbakestill demo gjenoppretter seed-dataene og beholder valgt bruker", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Mats Johansen");
    await changeStoredPersonName(page, "person-8", "Endret Person");
    await page.reload();
    await expect(
      page.getByRole("heading", { level: 1, name: "Hei, Endret!" }),
    ).toBeVisible();

    await resetDemo(page);

    await expect(
      page.getByRole("heading", { level: 1, name: "Hei, Mats!" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/#\/$/);
    const storedName = await page.evaluate(() => {
      const stored = JSON.parse(
        window.localStorage.getItem("varodd-prototype:state") ?? "null",
      );
      return stored.state.frame.people.find(
        (candidate: { id: string }) => candidate.id === "person-8",
      ).name;
    });
    expect(storedName).toBe("Mats Johansen");
  });

  test("en ny nettleserkontekst ser ikke endringene fra den første", async ({
    page,
    browser,
    baseURL,
  }) => {
    await page.goto("/");
    await changeStoredPersonName(page, "person-1", "Endret Eier");
    await page.reload();
    await expect(
      page.getByRole("heading", { level: 1, name: "Hei, Endret!" }),
    ).toBeVisible();

    const other = await browser.newContext({
      baseURL,
      viewport: page.viewportSize(),
    });
    const otherPage = await other.newPage();
    await otherPage.goto("/");
    await expect(
      otherPage.getByRole("heading", { level: 1, name: "Hei, Kari!" }),
    ).toBeVisible();
    await other.close();
  });

  test("en side som ikke finnes viser Siden finnes ikke", async ({ page }) => {
    await page.goto("/#/finnes-ikke");

    await expect(
      page.getByRole("heading", { level: 1, name: "Siden finnes ikke" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Gå til forsiden" }),
    ).toBeVisible();
  });

  test("brukerbytteren har ingen tilgjengelighetsfeil mens den er åpen", async ({
    page,
  }) => {
    await page.goto("/");
    await openControls(page);
    await page.getByRole("button", { name: /Bytt bruker/ }).click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(page.locator(".react-aria-Popover")).not.toHaveAttribute(
      "data-entering",
    );

    const open = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(open.violations).toEqual([]);
  });

  test("det valgte alternativet i brukerbytteren leses opp uten avkrysningsmerket", async ({
    page,
  }) => {
    await page.goto("/");
    await openControls(page);
    await page.getByRole("button", { name: /Bytt bruker/ }).click();
    await expect(page.getByRole("listbox")).toBeVisible();

    const selected = page.locator('[role="option"][aria-selected="true"]');
    await expect(selected).toHaveCount(1);
    await expect(selected).toHaveAccessibleName(/Kari Nordmann/);
    await expect(selected).not.toHaveAccessibleName(/✓/);
    await expect(
      page.getByRole("option", { name: /Kari Nordmann/, selected: true }),
    ).toHaveCount(1);
  });

  test("forsiden og siden som ikke finnes har ingen tilgjengelighetsfeil", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const home = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(home.violations).toEqual([]);

    await page.goto("/#/finnes-ikke");
    await expect(
      page.getByRole("heading", { level: 1, name: "Siden finnes ikke" }),
    ).toBeVisible();
    const notFound = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(notFound.violations).toEqual([]);
  });
});
