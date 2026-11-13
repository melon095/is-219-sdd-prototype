import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { axeTags, pressFeatureLink, switchUser } from "./helpers";

const seededOpenTitle = "Hva gjør vi med varer som ikke selger?";

type NewQuestion = { title: string; description: string; topic: string };

function questionRegion(page: Page) {
  return page.getByRole("region", { name: "Spørsmålet", exact: true });
}

function answersRegion(page: Page) {
  return page.getByRole("region", { name: /^\d+ svar$/ });
}

function answerItem(page: Page, text: string) {
  return answersRegion(page).getByRole("listitem").filter({ hasText: text });
}

function feed(page: Page) {
  return page.getByRole("region", { name: "Siste aktivitet" });
}

async function askQuestion(page: Page, question: NewQuestion) {
  await page.goto("/#/kunnskapsbank/sporsmal/ny");
  await expect(
    page.getByRole("heading", { level: 1, name: "Still et spørsmål" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Tema/ }).click();
  await page.getByRole("option", { name: question.topic }).click();
  await page.getByRole("textbox", { name: "Tittel" }).fill(question.title);
  await page
    .getByRole("textbox", { name: "Beskriv spørsmålet" })
    .fill(question.description);
  await page.getByRole("button", { name: "Publiser spørsmålet" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: question.title }),
  ).toBeVisible();
}

async function answerQuestion(page: Page, text: string) {
  await page.getByRole("textbox", { name: "Skriv et svar" }).fill(text);
  await page.getByRole("button", { name: "Publiser svar" }).click();
  await expect(answerItem(page, text)).toBeVisible();
}

const jonasQuestion: NewQuestion = {
  title: "Hvordan sender vi pakker til utlandet?",
  description:
    "Vi har fått bestillinger fra Tyskland og vet ikke hva som lønner seg.",
  topic: "Nettbutikk",
};

test.describe("Kunnskapsbanken", () => {
  test("Kari, Anne og Marte ser hver sin side når de åpner Kunnskapsbank", async ({
    page,
  }) => {
    await page.goto("/");
    await pressFeatureLink(page, "Kunnskapsbank");

    await expect(
      page.getByRole("heading", { level: 1, name: "Kunnskapsbank" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/#\/kunnskapsbank$/);
    await expect(
      page.getByRole("link", { name: seededOpenTitle }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Still et spørsmål" }),
    ).toBeVisible();
    const subnav = page.getByRole("navigation", { name: "I Kunnskapsbank" });
    await expect(subnav.getByRole("link", { name: "Forum" })).toBeVisible();
    await expect(
      subnav.getByRole("link", { name: "Spør chatboten" }),
    ).toBeVisible();
    await expect(
      subnav.getByRole("link", { name: /^Til vurdering/ }),
    ).toHaveCount(0);

    await switchUser(page, "Anne Lie");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Kunnskapsbanken er for E-Waves-medlemmer",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("main").locator('a[href*="/kunnskapsbank/sporsmal"]'),
    ).toHaveCount(0);
    await expect(page.getByRole("link", { name: seededOpenTitle })).toHaveCount(
      0,
    );

    await switchUser(page, "Marte Vik");
    await expect(
      page.getByRole("heading", { level: 1, name: "Kunnskapsbank" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: seededOpenTitle }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "I Kunnskapsbank" })
        .getByRole("link", { name: /^Til vurdering/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Still et spørsmål" }),
    ).toHaveCount(0);
  });

  test("Jonas stiller et spørsmål, Per svarer, og Jonas får beskjed og følger lenken", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Jonas Berg");
    await askQuestion(page, jonasQuestion);
    await expect(
      questionRegion(page).getByText("Fjordlys Keramikk"),
    ).toBeVisible();
    await expect(
      questionRegion(page).getByText("Åpent", { exact: true }),
    ).toBeVisible();

    await switchUser(page, "Per Hansen");
    const answer = "Bruk Posten Norgespakke, den er billigst til Tyskland.";
    await answerQuestion(page, answer);
    await expect(
      questionRegion(page).getByText("Besvart", { exact: true }),
    ).toBeVisible();
    await expect(answerItem(page, answer)).toContainText("Sørlandet Honning");

    await switchUser(page, "Jonas Berg");
    await page.goto("/#/");
    const entry = feed(page)
      .getByRole("link")
      .filter({
        hasText: `Sørlandet Honning svarte på «${jonasQuestion.title}»`,
      });
    await expect(entry).toBeVisible();
    await entry.click();
    await expect(
      page.getByRole("heading", { level: 1, name: jonasQuestion.title }),
    ).toBeVisible();
    await expect(page).toHaveURL(/#\/kunnskapsbank\/sporsmal\/.+$/);
  });

  test("Kari svarer på samme spørsmål, begge svar vises, og hun kan endre sitt", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Jonas Berg");
    await askQuestion(page, jonasQuestion);

    await switchUser(page, "Per Hansen");
    const perAnswer = "Bruk Posten Norgespakke, den er billigst til Tyskland.";
    await answerQuestion(page, perAnswer);

    await switchUser(page, "Kari Nordmann");
    const kariAnswer = "Vi bruker Bring og er fornøyd med prisen.";
    await answerQuestion(page, kariAnswer);

    await expect(page.getByRole("region", { name: "2 svar" })).toBeVisible();
    await expect(answerItem(page, perAnswer)).toBeVisible();
    await expect(answerItem(page, kariAnswer)).toContainText(
      "Fjordlys Keramikk",
    );
    await expect(page.getByText(/kommentar/i)).toHaveCount(0);

    await answerItem(page, kariAnswer)
      .getByRole("button", { name: "Rediger" })
      .click();
    const edited = "Vi bruker Bring, og de er raske til Tyskland.";
    await page.getByRole("textbox", { name: "Svaret ditt" }).fill(edited);
    await page.getByRole("button", { name: "Lagre" }).click();

    await expect(answerItem(page, edited)).toBeVisible();
    await expect(answerItem(page, edited)).toContainText("Endret");
    await expect(answerItem(page, perAnswer)).not.toContainText("Endret");
  });

  test("Anne og Mats Johansen ser ingen aktivitet fra kunnskapsbanken", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Jonas Berg");
    await askQuestion(page, jonasQuestion);

    await switchUser(page, "Kari Nordmann");
    await page.goto("/#/");
    await expect(
      feed(page)
        .getByRole("link")
        .filter({ hasText: `Nytt spørsmål: «${jonasQuestion.title}»` }),
    ).toBeVisible();

    for (const { name, greeting } of [
      { name: "Anne Lie", greeting: "Hei, Anne!" },
      { name: "Mats Johansen", greeting: "Hei, Mats!" },
    ]) {
      await switchUser(page, name);
      await expect(
        page.getByRole("heading", { level: 1, name: greeting }),
      ).toBeVisible();
      await expect(feed(page)).toBeVisible();
      await expect(
        feed(page).locator('a[href*="/kunnskapsbank/"]'),
      ).toHaveCount(0);
    }
  });

  test("Silje Moen er medlem gjennom Kvadraturen Kaffebrenneri og svarer for den bedriften", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Silje Moen");
    await pressFeatureLink(page, "Kunnskapsbank");

    await expect(
      page.getByRole("heading", { level: 1, name: "Kunnskapsbank" }),
    ).toBeVisible();
    await page.getByRole("link", { name: seededOpenTitle }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: seededOpenTitle }),
    ).toBeVisible();

    const answer = "Prøv en rabattpakke med tre varer til en fast pris.";
    await answerQuestion(page, answer);
    await expect(answerItem(page, answer)).toContainText(
      "Kvadraturen Kaffebrenneri",
    );
    await expect(
      questionRegion(page).getByText("Besvart", { exact: true }),
    ).toBeVisible();
  });

  test("forumet, spørsmålsskjemaet og et spørsmål har ingen tilgjengelighetsfeil", async ({
    page,
  }) => {
    await page.goto("/#/kunnskapsbank");
    await expect(
      page.getByRole("heading", { level: 1, name: "Kunnskapsbank" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: seededOpenTitle }),
    ).toBeVisible();
    const forum = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(forum.violations).toEqual([]);

    await page.goto("/#/kunnskapsbank/sporsmal/ny");
    await expect(
      page.getByRole("heading", { level: 1, name: "Still et spørsmål" }),
    ).toBeVisible();
    const form = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(form.violations).toEqual([]);

    await page.goto("/#/kunnskapsbank/sporsmal/sporsmal-1");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Hvordan setter vi opp frakt til hele landet i nettbutikken?",
      }),
    ).toBeVisible();
    await expect(answersRegion(page)).toBeVisible();
    const thread = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(thread.violations).toEqual([]);
  });
});
