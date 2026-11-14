import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { axeTags, isMobile, switchUser } from "./helpers";

test.use({ storageState: { cookies: [], origins: [] } });

const origin = "http://localhost:4173";

const paragraphs = [
  "Denne nettsiden er ikke laget av Varodd, og den har ingen tilknytning til Varodd. Den er en prototype, laget som et studentprosjekt.",
  "Alle personer, bedrifter, oppdrag, spørsmål og svar her er oppdiktet. De viser ikke til noen ekte personer eller bedrifter.",
  "Det du endrer, lagres bare i din egen nettleser. Ingenting blir sendt noe sted.",
];

function notice(page: Page) {
  return page.getByRole("dialog", { name: "Dette er en prototype" });
}

function confirmButton(page: Page) {
  return notice(page).getByRole("button", { name: "Jeg forstår" });
}

async function openFirstVisit(page: Page, path = "/") {
  await page.clock.install();
  await page.goto(path);
  await expect(notice(page)).toBeVisible();
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 100);
}

async function confirmNotice(page: Page) {
  await page.clock.runFor(5000);
  await expect(confirmButton(page)).toBeEnabled();
  await confirmButton(page).click();
  await expect(notice(page)).toBeHidden();
  await page.clock.resume();
}

async function resetDemo(page: Page) {
  if (isMobile(page)) {
    await page.getByRole("button", { name: "Meny" }).click();
    await expect(page.getByRole("dialog", { name: "Meny" })).toBeVisible();
  }
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

async function focusIsInsideNotice(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.activeElement?.closest('[role="dialog"]') != null,
  );
}

test.describe("Prototypemerknaden for en førstegangsbesøkende", () => {
  test("viser dialogen med de tre avsnittene", async ({ page }) => {
    await openFirstVisit(page);

    for (const text of paragraphs) {
      await expect(notice(page).getByText(text, { exact: true })).toBeVisible();
    }
  });

  test("Escape, klikk utenfor og Tab slipper ikke forbi dialogen", async ({
    page,
  }) => {
    await openFirstVisit(page);

    await page.keyboard.press("Escape");
    await expect(notice(page)).toBeVisible();

    await page.mouse.click(2, 2);
    await page.clock.runFor(100);
    await expect(notice(page)).toBeVisible();

    for (let presses = 0; presses < 10; presses += 1) {
      await page.keyboard.press("Tab");
    }
    await page.clock.runFor(100);
    await expect(notice(page)).toBeVisible();
    expect(await focusIsInsideNotice(page)).toBe(true);
    await page.evaluate(() => {
      document.querySelector<HTMLElement>("a")?.focus();
    });
    await page.clock.runFor(100);
    expect(await focusIsInsideNotice(page)).toBe(true);
  });

  test("knappen er deaktivert i fem sekunder og lukker dialogen etterpå", async ({
    page,
  }) => {
    await openFirstVisit(page);
    await expect(confirmButton(page)).toBeDisabled();
    await expect(notice(page).getByText(/^Du kan gå videre om /)).toBeVisible();

    await page.clock.runFor(3000);
    await expect(confirmButton(page)).toBeDisabled();

    await page.clock.runFor(2000);
    await expect(confirmButton(page)).toBeEnabled();
    await expect(notice(page).getByRole("status")).toHaveText(
      "Nå kan du gå videre.",
    );
    await expect(notice(page).getByText(/^Du kan gå videre om /)).toHaveCount(
      0,
    );

    await page.keyboard.press("Escape");
    await expect(notice(page)).toBeVisible();

    await confirmButton(page).click();
    await expect(notice(page)).toBeHidden();
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveText(/^Hei, /);
    await expect(heading).toBeFocused();
  });

  test("har ingen tilgjengelighetsfeil mens dialogen er åpen", async ({
    page,
  }) => {
    await openFirstVisit(page);
    await page.clock.resume();
    await expect(page.locator(".react-aria-Modal")).not.toHaveAttribute(
      "data-entering",
    );
    await expect(page.locator(".react-aria-ModalOverlay")).not.toHaveAttribute(
      "data-entering",
    );

    const result = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(result.violations).toEqual([]);
  });

  test.describe("ved 320 px bredde", () => {
    test.use({ viewport: { width: 320, height: 568 } });

    test("teksten og knappen kan nås uten å scrolle sidelengs", async ({
      page,
    }) => {
      await openFirstVisit(page);

      await notice(page)
        .getByText(paragraphs[0] ?? "")
        .scrollIntoViewIfNeeded();
      await expect(
        notice(page).getByText(paragraphs[0] ?? "", { exact: true }),
      ).toBeInViewport();
      await confirmButton(page).scrollIntoViewIfNeeded();
      await expect(confirmButton(page)).toBeInViewport();
      const width = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      expect(width).toBeLessThanOrEqual(320);
    });
  });
});

test.describe("Prototypemerknaden for en som kommer tilbake", () => {
  test("vises ikke etter at den er bekreftet, i en ny fane eller etter en omlasting", async ({
    page,
    context,
  }) => {
    await openFirstVisit(page);
    await confirmNotice(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(notice(page)).toHaveCount(0);

    const second = await context.newPage();
    await second.goto("/");
    await expect(second.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(notice(second)).toHaveCount(0);
  });

  test("vises ikke etter Tilbakestill demo eller bytte av bruker", async ({
    page,
  }) => {
    await openFirstVisit(page);
    await confirmNotice(page);

    await resetDemo(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(notice(page)).toHaveCount(0);

    await switchUser(page, "Mats Johansen");
    await expect(
      page.getByRole("heading", { level: 1, name: "Hei, Mats!" }),
    ).toBeVisible();
    await expect(notice(page)).toHaveCount(0);
  });

  test("en ny nettleserkontekst viser dialogen igjen", async ({
    page,
    browser,
    baseURL,
  }) => {
    await openFirstVisit(page);
    await confirmNotice(page);

    const other = await browser.newContext({
      baseURL,
      viewport: page.viewportSize(),
    });
    const otherPage = await other.newPage();
    await otherPage.goto("/");
    await expect(notice(otherPage)).toBeVisible();
    await other.close();
  });

  test("bare bekreftelsen lagres, og ingenting sendes ut av siden", async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on("request", (request) => {
      requests.push(request.url());
    });
    await openFirstVisit(page);
    await confirmNotice(page);

    const stored = await page.evaluate(() =>
      window.localStorage.getItem("varodd-prototype:notice"),
    );
    expect(stored).toBe("true");
    const outside = requests.filter((url) => {
      const parsed = new URL(url);
      const isWeb = parsed.protocol === "http:" || parsed.protocol === "https:";
      return isWeb && parsed.origin !== origin;
    });
    expect(outside).toEqual([]);
  });
});

test.describe("Prototypemerknaden på en direkte lenke", () => {
  const links = [
    "/#/kunnskapsbank/sporsmal/sporsmal-1",
    "/#/oppdrag",
    "/#/oppdrag/oppdrag-4",
  ];

  for (const link of links) {
    test(`vises over ${link} og lar besøkende bli på siden`, async ({
      page,
    }) => {
      await openFirstVisit(page, link);
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
      const title = (await heading.textContent()) ?? "";
      expect(title).not.toBe("");

      await page.clock.runFor(5000);
      await expect(confirmButton(page)).toBeEnabled();
      await confirmButton(page).click();
      await expect(notice(page)).toBeHidden();

      await expect(page).toHaveURL(new RegExp(`${link.slice(1)}$`));
      await expect(heading).toHaveText(title);
      await expect(heading).toBeFocused();
    });
  }
});
