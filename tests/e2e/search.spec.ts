import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { axeTags, isMobile, pressFeatureLink, switchUser } from "./helpers";

type SeedQuestion = { id: string; title: string };

type SeedExample = {
  id: string;
  title: string;
  description: string;
  matchesQuestionId: string;
};

const seed = JSON.parse(
  readFileSync(
    new URL("../../src/seed/seed-data.json", import.meta.url),
    "utf8",
  ),
) as {
  knowledgeBase: {
    questions: SeedQuestion[];
    nearDuplicateExamples: SeedExample[];
  };
};

const examples = seed.knowledgeBase.nearDuplicateExamples;

const panelTitle = "Har noen spurt om dette før?";

function titleOf(questionId: string): string {
  const found = seed.knowledgeBase.questions.find(
    (item) => item.id === questionId,
  );
  if (found === undefined) {
    throw new Error(`Fant ikke spørsmålet ${questionId}`);
  }
  return found.title;
}

function answersRegion(page: Page) {
  return page.getByRole("region", { name: /^\d+ svar$/ });
}

function searchField(page: Page) {
  return page.getByRole("searchbox", { name: "Søk i forumet" });
}

async function search(page: Page, query: string) {
  await searchField(page).fill(query);
  await searchField(page).press("Enter");
  await expect(
    page.getByRole("heading", { level: 2, name: /treff for/ }),
  ).toBeVisible();
}

async function fillQuestion(page: Page, example: SeedExample) {
  await page.getByRole("textbox", { name: "Tittel" }).fill(example.title);
  await page
    .getByRole("textbox", { name: "Beskriv spørsmålet" })
    .fill(example.description);
}

test.describe("Søk i kunnskapsbanken", () => {
  test("Ola finner et spørsmål på et ord som bare står i et svar", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Ola Dahl");
    await pressFeatureLink(page, "Kunnskapsbank");
    await expect(
      page.getByRole("heading", { level: 1, name: "Kunnskapsbank" }),
    ).toBeVisible();

    await search(page, "Mailchimp");
    await expect(page).toHaveURL(/#\/kunnskapsbank\?sok=Mailchimp$/);
    await expect(
      page.getByRole("heading", { level: 2, name: "1 treff for «Mailchimp»" }),
    ).toBeVisible();

    const title = "Hvordan setter vi opp et nyhetsbrev som folk faktisk leser?";
    await page.getByRole("link", { name: title }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: title }),
    ).toBeVisible();
    await expect(answersRegion(page).getByText(/Mailchimp/)).toBeVisible();
  });

  test("et søk uten treff viser en tom tilstand, og å tømme feltet gir temaene tilbake", async ({
    page,
  }) => {
    await page.goto("/#/kunnskapsbank");
    await search(page, "qwertyuiop");
    await expect(
      page.getByText(
        "Vi fant ingen spørsmål som passer. Prøv andre ord, eller still spørsmålet selv.",
      ),
    ).toBeVisible();

    await page.getByRole("button", { name: "Tøm søket" }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: "Nyeste spørsmål" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/#\/kunnskapsbank$/);
  });

  test("et tema viser spørsmålene sine med Åpent eller Besvart", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Ola Dahl");
    await page.goto("/#/kunnskapsbank");
    if (isMobile(page)) {
      await page.getByRole("button", { name: "Tema" }).click();
    }
    await page.getByRole("link", { name: "Markedsføring" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "Markedsføring" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/#\/kunnskapsbank\/tema\/tema-4$/);
    const rows = page.locator('li:has(a[href*="/kunnskapsbank/sporsmal/"])');
    await expect(rows).toHaveCount(3);
    for (const row of await rows.all()) {
      await expect(row).toContainText(/Åpent|Besvart/);
    }
    await expect(
      page.getByRole("button", { name: "Still et spørsmål i dette temaet" }),
    ).toBeVisible();
  });

  test("Still et spørsmål viser hvert av de tre ferdige nesten-like spørsmålene, og det siste kan publiseres", async ({
    page,
  }) => {
    expect(examples).toHaveLength(3);
    await page.goto("/");
    await switchUser(page, "Ola Dahl");
    await page.goto("/#/kunnskapsbank");
    await page.getByRole("button", { name: "Still et spørsmål" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Still et spørsmål" }),
    ).toBeVisible();

    for (const example of examples) {
      await fillQuestion(page, example);
      await expect(page.getByText(panelTitle)).toBeVisible();
      await expect(
        page.getByRole("link", {
          name: titleOf(example.matchesQuestionId),
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByText("Du kan fortsatt publisere spørsmålet ditt."),
      ).toBeVisible();
    }

    const last = examples[examples.length - 1] as SeedExample;
    await page.getByRole("button", { name: /Tema/ }).click();
    await page.getByRole("option", { name: "Nettbutikk" }).click();
    await page.getByRole("button", { name: "Publiser spørsmålet" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: last.title }),
    ).toBeVisible();
    await expect(page).toHaveURL(/#\/kunnskapsbank\/sporsmal\/.+$/);
  });

  test("fra forsiden kommer Ola til et seedet svar gjennom menyen, søkefeltet og en lenke", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Ola Dahl");
    await pressFeatureLink(page, "Kunnskapsbank");
    await search(page, "reklamasjoner");

    const title = "Hvordan setter vi opp frakt til hele landet i nettbutikken?";
    await page.getByRole("link", { name: title }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: title }),
    ).toBeVisible();
    await expect(answersRegion(page).getByText(/reklamasjoner/)).toBeVisible();
  });

  test("søkeresultater, et tema og skjemaet med lignende spørsmål har ingen tilgjengelighetsfeil", async ({
    page,
  }) => {
    await page.goto("/#/kunnskapsbank?sok=bobleplast");
    await expect(
      page.getByRole("heading", { level: 2, name: /treff for/ }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(results.violations).toEqual([]);

    await page.goto("/#/kunnskapsbank/tema/tema-1");
    await expect(
      page.getByRole("heading", { level: 1, name: "Nettbutikk" }),
    ).toBeVisible();
    const topic = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(topic.violations).toEqual([]);

    await page.goto("/#/kunnskapsbank/sporsmal/ny");
    await expect(
      page.getByRole("heading", { level: 1, name: "Still et spørsmål" }),
    ).toBeVisible();
    await fillQuestion(page, examples[0] as SeedExample);
    await expect(page.getByText(panelTitle)).toBeVisible();
    const form = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(form.violations).toEqual([]);
  });
});
