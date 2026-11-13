import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { answerQuestion, askQuestion, axeTags, switchUser } from "./helpers";

type SeedQuestion = { id: string; title: string };

type SeedAnswer = {
  id: string;
  questionId: string;
  authorId: string;
  text: string;
};

type SeedChatbotQuestion = {
  id: string;
  text: string;
  answer?: {
    text: string;
    sourceQuestionIds: string[];
    sourceAnswerIds: string[];
  };
};

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
      chatbotQuestions: SeedChatbotQuestion[];
    };
  }
).knowledgeBase;

const trustNotice =
  "Svaret er laget av en chatbot og kan ta feil. Sjekk kildene før du stoler på det.";

const noAnswer = "Vi fant ikke noe svar på dette i forumet.";

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) {
    throw new Error(`Fant ikke ${what} i seed-data.json`);
  }
  return value;
}

function titleOf(questionId: string): string {
  return required(
    knowledgeBase.questions.find((item) => item.id === questionId),
    `spørsmålet ${questionId}`,
  ).title;
}

const firstAnswered = required(
  knowledgeBase.chatbotQuestions.find((item) => item.answer !== undefined),
  "et chatbot-spørsmål med svar",
);

const sourceAnswer = required(
  required(firstAnswered.answer, "svaret")
    .sourceAnswerIds.map((id) =>
      required(
        knowledgeBase.answers.find((item) => item.id === id),
        `kildesvaret ${id}`,
      ),
    )
    .find((item) => item.authorId !== "person-3"),
  "et kildesvar som ikke er skrevet av Per",
);

function snippetOf(text: string): string {
  return (text.split("\n")[0] ?? text).slice(0, 50);
}

function entryOf(page: Page, chatbotId: string) {
  return page.locator(`[data-chatbot-id="${chatbotId}"]`).last();
}

async function openChatbot(page: Page, person: string) {
  await page.goto("/");
  await switchUser(page, person);
  await page.goto("/#/kunnskapsbank/chatbot");
  await expect(
    page.getByRole("heading", { level: 1, name: "Spør chatboten" }),
  ).toBeVisible();
}

async function ask(page: Page, text: string) {
  await page.getByRole("button", { name: text, exact: true }).click();
}

async function flagAsPer(page: Page) {
  await page.goto(`/#/kunnskapsbank/sporsmal/${sourceAnswer.questionId}`);
  const target = page.locator(`[data-answer-id="${sourceAnswer.id}"]`);
  await expect(target).toBeVisible();
  await target.getByRole("button", { name: "Flagg" }).click();
  const dialog = page.getByRole("dialog", { name: "Flagg innlegget" });
  await dialog.getByText("Utdatert", { exact: true }).click();
  await dialog.getByRole("button", { name: "Send" }).click();
  await expect(dialog).toBeHidden();
  await expect(target.getByText("Du har flagget dette")).toBeVisible();
}

test.describe("Spør chatboten", () => {
  test("Kari velger hvert ferdige spørsmål og får svar med kilder eller beskjed om at svaret mangler", async ({
    page,
  }) => {
    expect(knowledgeBase.chatbotQuestions).toHaveLength(7);
    await openChatbot(page, "Kari Nordmann");
    await expect(page.getByRole("textbox")).toHaveCount(0);

    for (const item of knowledgeBase.chatbotQuestions) {
      await ask(page, item.text);
      const entry = entryOf(page, item.id);
      await expect(entry).toBeVisible();
      await expect(entry).toContainText(item.text);
      if (item.answer === undefined) {
        await expect(entry.getByText(noAnswer)).toBeVisible();
        await expect(entry.getByText(trustNotice)).toHaveCount(0);
        await expect(
          entry.getByRole("link", { name: "Still spørsmålet i forumet" }),
        ).toBeVisible();
      } else {
        await expect(entry.getByText(item.answer.text)).toBeVisible();
        await expect(entry.getByText(trustNotice)).toBeVisible();
        await expect(entry.getByText("Kilder:")).toBeVisible();
        for (const id of item.answer.sourceQuestionIds) {
          await expect(
            entry.getByRole("link", { name: titleOf(id), exact: true }),
          ).toBeVisible();
        }
        await expect(entry.getByText(noAnswer)).toHaveCount(0);
      }
    }

    const unanswered = required(
      knowledgeBase.chatbotQuestions.find((item) => item.answer === undefined),
      "et chatbot-spørsmål uten svar",
    );
    await entryOf(page, unanswered.id)
      .getByRole("link", { name: "Still spørsmålet i forumet" })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Still et spørsmål" }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Tittel" })).toHaveValue(
      unanswered.text,
    );
  });

  test("et flagget kildesvar gir ingen svar, og svaret kommer tilbake når flagget er fjernet", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Per Hansen");
    await flagAsPer(page);

    await switchUser(page, "Kari Nordmann");
    await page.goto("/#/kunnskapsbank/chatbot");
    await ask(page, firstAnswered.text);
    const flagged = entryOf(page, firstAnswered.id);
    await expect(flagged.getByText(noAnswer)).toBeVisible();
    await expect(flagged.getByText(trustNotice)).toHaveCount(0);

    await switchUser(page, "Marte Vik");
    await page.goto("/#/kunnskapsbank/vurdering");
    const review = page
      .locator("[data-review-id]")
      .filter({ hasText: snippetOf(sourceAnswer.text) });
    await expect(review).toBeVisible();
    await review.getByRole("button", { name: "Behold" }).click();
    await expect(review).toHaveCount(0);

    await switchUser(page, "Kari Nordmann");
    await page.goto("/#/kunnskapsbank/chatbot");
    await ask(page, firstAnswered.text);
    const restored = entryOf(page, firstAnswered.id);
    await expect(
      restored.getByText(required(firstAnswered.answer, "svaret").text),
    ).toBeVisible();
    await expect(restored.getByText(trustNotice)).toBeVisible();
  });

  test("spørsmål og svar som postes under demoen blir aldri brukt som kilder", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Jonas Berg");
    await askQuestion(page, {
      title: firstAnswered.text,
      description:
        "Vi vil ha hjelp til å lage produkttekster med KI, og lurer på hva dere gjør.",
      topic: "Kunstig intelligens",
    });
    const newQuestionId = page.url().split("/").pop() ?? "";
    expect(newQuestionId).not.toBe("");
    await switchUser(page, "Per Hansen");
    await answerQuestion(page, "Jeg ber Claude skrive i samme stil som før.");

    await switchUser(page, "Kari Nordmann");
    await page.goto("/#/kunnskapsbank/chatbot");
    await expect(
      page.getByRole("heading", { level: 1, name: "Spør chatboten" }),
    ).toBeVisible();
    for (const item of knowledgeBase.chatbotQuestions) {
      await ask(page, item.text);
      await expect(entryOf(page, item.id)).toBeVisible();
    }

    const log = page.getByRole("log");
    await expect(log.locator(`a[href$="/${newQuestionId}"]`)).toHaveCount(0);
    await expect(log.getByText(trustNotice)).toHaveCount(
      knowledgeBase.chatbotQuestions.filter((item) => item.answer !== undefined)
        .length,
    );
    const answered = required(firstAnswered.answer, "svaret");
    await expect(
      entryOf(page, firstAnswered.id).getByRole("list").getByRole("link"),
    ).toHaveCount(answered.sourceQuestionIds.length);
  });

  test("chatbot-siden har ingen tilgjengelighetsfeil med et svar og en beskjed om at svaret mangler", async ({
    page,
  }) => {
    await openChatbot(page, "Kari Nordmann");
    const unanswered = required(
      knowledgeBase.chatbotQuestions.find((item) => item.answer === undefined),
      "et chatbot-spørsmål uten svar",
    );
    await ask(page, firstAnswered.text);
    await ask(page, unanswered.text);
    await expect(
      entryOf(page, unanswered.id).getByText(noAnswer),
    ).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(results.violations).toEqual([]);
  });
});
