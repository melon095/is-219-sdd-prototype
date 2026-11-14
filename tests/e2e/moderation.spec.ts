import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";
import {
  answerItem,
  answerQuestion,
  answersRegion,
  askQuestion,
  axeTags,
  feed,
  type NewQuestion,
  questionRegion,
  switchUser,
} from "./helpers";

type SeedQuestion = { id: string; title: string; authorId: string };

type SeedAnswer = {
  id: string;
  questionId: string;
  authorId: string;
  text: string;
  moderation: string;
};

type SeedFlag = { targetKind: string; targetId: string };

type SeedReview = { targetKind: string; targetId: string; outcome?: string };

type SeedChatbotQuestion = { answer?: { sourceAnswerIds: string[] } };

const knowledgeBase = (
  JSON.parse(
    readFileSync(
      new URL("../../src/seed/seed-data.json", import.meta.url),
      "utf8",
    ),
  ) as {
    knowledgeBase: {
      questions: SeedQuestion[];
      answers: SeedAnswer[];
      flags: SeedFlag[];
      reviews: SeedReview[];
      chatbotQuestions: SeedChatbotQuestion[];
    };
  }
).knowledgeBase;

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) {
    throw new Error(`Fant ikke ${what} i seed-data.json`);
  }
  return value;
}

const chatbotSources = new Set(
  knowledgeBase.chatbotQuestions.flatMap(
    (item) => item.answer?.sourceAnswerIds ?? [],
  ),
);

const flaggedAnswers = new Set(
  knowledgeBase.flags
    .filter((item) => item.targetKind === "answer")
    .map((item) => item.targetId),
);

const olaTarget = required(
  knowledgeBase.answers.find(
    (item) =>
      item.authorId === "person-5" &&
      item.moderation !== "removed" &&
      !chatbotSources.has(item.id) &&
      !flaggedAnswers.has(item.id),
  ),
  "et svar fra Ola som ikke er flagget og ikke en chatbot-kilde",
);

const perAnswer = required(
  knowledgeBase.answers.find(
    (item) => item.authorId === "person-3" && item.moderation !== "removed",
  ),
  "et svar fra Per",
);

const perQuestion = required(
  knowledgeBase.questions.find((item) => item.authorId === "person-3"),
  "et spørsmål fra Per",
);

const openSeedReview = required(
  knowledgeBase.reviews.find(
    (item) => item.outcome === undefined && item.targetKind === "answer",
  ),
  "en åpen vurdering av et svar",
);

const openSeedReviewQuestionId = required(
  knowledgeBase.answers.find((item) => item.id === openSeedReview.targetId),
  "svaret i den åpne vurderingen",
).questionId;

function snippetOf(text: string): string {
  return (text.split("\n")[0] ?? text).slice(0, 50);
}

function answerById(page: Page, id: string) {
  return page.locator(`[data-answer-id="${id}"]`);
}

async function flagItem(
  page: Page,
  scope: Locator,
  reason: string,
  note?: string,
) {
  await scope.getByRole("button", { name: "Flagg" }).click();
  const dialog = page.getByRole("dialog", { name: "Flagg innlegget" });
  await dialog.getByText(reason, { exact: true }).click();
  if (note !== undefined) {
    await dialog
      .getByRole("textbox", { name: "Fortell kort hva som er galt" })
      .fill(note);
  }
  await dialog.getByRole("button", { name: "Send" }).click();
  await expect(dialog).toBeHidden();
  await expect(scope.getByText("Du har flagget dette")).toBeVisible();
}

async function removeItem(page: Page, scope: Locator) {
  await scope.getByRole("button", { name: "Fjern" }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByRole("button", { name: "Fjern" }).click();
  await expect(dialog).toBeHidden();
}

async function postQuestionAs(
  page: Page,
  person: string,
  question: NewQuestion,
) {
  await page.goto("/");
  await switchUser(page, person);
  await askQuestion(page, question);
}

test.describe("Vurdering av innhold", () => {
  test("Per flagger et svar fra Ola, ser advarselen, og Marte ser det i Til vurdering", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Per Hansen");
    await page.goto(`/#/kunnskapsbank/sporsmal/${olaTarget.questionId}`);
    const target = answerById(page, olaTarget.id);
    await expect(target).toBeVisible();

    await flagItem(page, target, "Utdatert");
    await expect(target).toContainText(
      "Dette innlegget er flagget (Utdatert) og blir vurdert av Varodd.",
    );
    await expect(target.getByRole("button", { name: "Flagg" })).toHaveCount(0);

    await page.goto(`/#/kunnskapsbank/sporsmal/${perAnswer.questionId}`);
    await expect(answerById(page, perAnswer.id)).toBeVisible();
    await expect(
      answerById(page, perAnswer.id).getByRole("button", { name: "Flagg" }),
    ).toHaveCount(0);
    await page.goto(`/#/kunnskapsbank/sporsmal/${perQuestion.id}`);
    await expect(
      page.getByRole("heading", { level: 1, name: perQuestion.title }),
    ).toBeVisible();
    await expect(
      questionRegion(page).getByRole("button", { name: "Flagg" }),
    ).toHaveCount(0);

    await switchUser(page, "Marte Vik");
    await page.goto("/#/kunnskapsbank/vurdering");
    await expect(
      page.getByRole("heading", { level: 1, name: "Til vurdering" }),
    ).toBeVisible();
    const review = page
      .locator("[data-review-id]")
      .filter({ hasText: snippetOf(olaTarget.text) });
    await expect(review).toBeVisible();
    await expect(review.getByText("Per Hansen")).toBeVisible();
    await expect(review.getByText("Utdatert")).toBeVisible();
  });

  test("et flagget svar kan beholdes og flagges igjen, og et fjernet svar holder spørsmålet åpent", async ({
    page,
  }) => {
    const title = "Hvordan pakker vi skjøre varer trygt?";
    const answer = "Bruk bobleplast og en stiv eske rundt hver vare.";
    await postQuestionAs(page, "Jonas Berg", {
      title,
      description:
        "Vi mister for mange kopper i posten og trenger bedre pakking.",
      topic: "Drift og regnskap",
    });
    await switchUser(page, "Ola Dahl");
    await answerQuestion(page, answer);
    await expect(
      questionRegion(page).getByText("Besvart", { exact: true }),
    ).toBeVisible();

    await switchUser(page, "Per Hansen");
    await flagItem(page, answerItem(page, answer), "Utdatert");
    await expect(
      questionRegion(page).getByText("Åpent", { exact: true }),
    ).toBeVisible();

    await switchUser(page, "Marte Vik");
    await answerItem(page, answer)
      .getByRole("button", { name: "Behold" })
      .click();
    await expect(
      questionRegion(page).getByText("Besvart", { exact: true }),
    ).toBeVisible();
    await expect(answerItem(page, answer)).not.toContainText("er flagget");

    await switchUser(page, "Per Hansen");
    await flagItem(page, answerItem(page, answer), "Utdatert");
    await expect(
      questionRegion(page).getByText("Åpent", { exact: true }),
    ).toBeVisible();

    await switchUser(page, "Marte Vik");
    await removeItem(page, answerItem(page, answer));
    await expect(answerItem(page, answer)).toHaveCount(0);
    await expect(answersRegion(page)).toContainText("0 svar");
    await expect(
      questionRegion(page).getByText("Åpent", { exact: true }),
    ).toBeVisible();

    for (const name of ["Ola Dahl", "Per Hansen"]) {
      await switchUser(page, name);
      await page.goto("/#/");
      await expect(
        feed(page)
          .getByRole("link")
          .filter({
            hasText: `Varodd har vurdert et flagget innlegg i «${title}»: det er beholdt`,
          }),
      ).toBeVisible();
      await expect(
        feed(page)
          .getByRole("link")
          .filter({
            hasText: `Varodd har vurdert et flagget innlegg i «${title}»: det er fjernet`,
          }),
      ).toBeVisible();
    }
  });

  test("et flagget svar gjør ikke spørsmålet åpent når et annet svar teller, og advarselen blir stående etter en endring", async ({
    page,
  }) => {
    const olaAnswer = "Vi bruker en pakkeautomat og sparer mye tid.";
    const kariAnswer = "Vi sender alt med Bring og er fornøyd.";
    await postQuestionAs(page, "Jonas Berg", {
      title: "Hvordan leverer vi pakker til kundene raskest mulig?",
      description:
        "Kundene våre vil ha varene raskt og vi leter etter en god løsning.",
      topic: "Nettbutikk",
    });
    await switchUser(page, "Ola Dahl");
    await answerQuestion(page, olaAnswer);
    await switchUser(page, "Kari Nordmann");
    await answerQuestion(page, kariAnswer);

    await switchUser(page, "Per Hansen");
    await flagItem(page, answerItem(page, olaAnswer), "Feil");
    await expect(
      questionRegion(page).getByText("Besvart", { exact: true }),
    ).toBeVisible();

    await switchUser(page, "Ola Dahl");
    await answerItem(page, olaAnswer)
      .getByRole("button", { name: "Rediger" })
      .click();
    const edited = "Vi bruker en pakkeautomat og en ekstra hentepunkt.";
    await page.getByRole("textbox", { name: "Svaret ditt" }).fill(edited);
    await page.getByRole("button", { name: "Lagre" }).click();

    await expect(answerItem(page, edited)).toContainText("Endret");
    await expect(answerItem(page, edited)).toContainText(
      "Dette innlegget er flagget (Feil) og blir vurdert av Varodd.",
    );
    await expect(
      questionRegion(page).getByText("Besvart", { exact: true }),
    ).toBeVisible();
  });

  test("Marte fjerner et flagget spørsmål, og hele tråden forsvinner fra forum og søk", async ({
    page,
  }) => {
    const word = "zeppelinforsendelse";
    const title = `Hvordan sender vi ${word} trygt?`;
    await postQuestionAs(page, "Jonas Berg", {
      title,
      description: `Vi vurderer ${word} for store ordrer og lurer på prisene.`,
      topic: "Nettbutikk",
    });
    const questionUrl = page.url();
    await switchUser(page, "Ola Dahl");
    await answerQuestion(page, `Ingen erfaring med ${word}, beklager.`);

    await switchUser(page, "Per Hansen");
    await flagItem(page, questionRegion(page), "Spam");

    await switchUser(page, "Marte Vik");
    await removeItem(page, questionRegion(page));
    await expect(
      page.getByRole("heading", { level: 1, name: "Spørsmålet er fjernet" }),
    ).toBeVisible();
    await expect(page.getByText(word)).toHaveCount(0);

    await page.goto("/#/kunnskapsbank");
    await expect(
      page.getByRole("heading", { level: 1, name: "Kunnskapsbank" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: title })).toHaveCount(0);

    await page.goto(`/#/kunnskapsbank?sok=${word}`);
    await expect(
      page.getByRole("heading", { level: 2, name: `0 treff for «${word}»` }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: title })).toHaveCount(0);

    await page.goto(questionUrl);
    await expect(
      page.getByRole("heading", { level: 1, name: "Spørsmålet er fjernet" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Varodd har fjernet dette spørsmålet fordi det ikke passet i forumet.",
      ),
    ).toBeVisible();
  });

  test("Til vurdering og et spørsmål med et flagget svar har ingen tilgjengelighetsfeil", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Marte Vik");
    await page.goto("/#/kunnskapsbank/vurdering");
    await expect(
      page.getByRole("heading", { level: 1, name: "Til vurdering" }),
    ).toBeVisible();
    await expect(page.locator("[data-review-id]").first()).toBeVisible();
    const review = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(review.violations).toEqual([]);

    await page.goto(`/#/kunnskapsbank/sporsmal/${openSeedReviewQuestionId}`);
    await expect(
      page.getByText(/Dette innlegget er flagget/).first(),
    ).toBeVisible();
    const asAdmin = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(asAdmin.violations).toEqual([]);

    await switchUser(page, "Per Hansen");
    await expect(
      page.getByText(/Dette innlegget er flagget/).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Flagg" }).first(),
    ).toBeVisible();
    const asMember = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(asMember.violations).toEqual([]);
  });
});
