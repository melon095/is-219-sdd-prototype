import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import {
  answer,
  kbState,
  people,
  question,
} from "../../../domain/knowledge-base/testState";
import type { ChatbotQuestion } from "../../../domain/knowledge-base/types";
import { renderPage } from "../../marketplace/pages/renderPage";
import { ChatbotPage } from "./ChatbotPage";

const answeredText = "Hvordan sender jeg keramikk trygt?";
const answerText = "Pakk keramikk i bobleplast og en solid eske.";
const closestText = "Hvordan lager jeg et abonnement på kaffe?";
const lonelyText = "Hvordan søker vi om støtte?";

const prepared: ChatbotQuestion[] = [
  {
    id: "chatbot-1",
    text: answeredText,
    answer: {
      text: answerText,
      sourceQuestionIds: ["sporsmal-1", "sporsmal-2"],
      sourceAnswerIds: ["svar-1"],
    },
  },
  { id: "chatbot-2", text: closestText },
  { id: "chatbot-3", text: lonelyText },
];

const state = kbState({
  questions: [
    question("sporsmal-1", {
      title: "Frakt av keramikk",
      description: "Hvordan sender vi keramikk?",
      createdAt: "2026-11-01T09:00:00+01:00",
    }),
    question("sporsmal-2", {
      title: "Pakking av glass",
      description: "Tips til emballasje.",
      createdAt: "2026-11-02T09:00:00+01:00",
    }),
    question("sporsmal-3", {
      title: "Kaffeabonnement i nettbutikken",
      description: "Vi vil ha abonnement på kaffe.",
      createdAt: "2026-11-03T09:00:00+01:00",
    }),
    question("sporsmal-4", {
      title: "Abonnement for kaffekunder",
      description: "Hvordan lager vi abonnement?",
      createdAt: "2026-11-04T09:00:00+01:00",
    }),
  ],
  answers: [answer("svar-1", "sporsmal-1", { text: "Bruk bobleplast." })],
  chatbotQuestions: prepared,
});

const flaggedState = kbState({
  ...state.knowledgeBase,
  questions: state.knowledgeBase.questions.map((item) =>
    item.id === "sporsmal-2" ? { ...item, moderation: "flagged" } : item,
  ),
});

function open(
  userId: string,
  layout: "desktop" | "mobile" = "desktop",
  pageState = state,
) {
  return renderPage(<ChatbotPage />, {
    path: "kunnskapsbank/chatbot",
    route: "/kunnskapsbank/chatbot",
    userId,
    state: pageState,
    layout,
  });
}

async function pick(
  user: ReturnType<typeof userEvent.setup>,
  text: string,
): Promise<void> {
  await user.click(screen.getByRole("button", { name: text }));
}

describe("ChatbotPage", () => {
  it("har overskriften, Simulert og forklaringen", () => {
    open(people.kari);

    expect(
      screen.getByRole("heading", { level: 1, name: "Spør chatboten" }),
    ).toBeTruthy();
    expect(screen.getAllByText("Simulert").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "I den ekte tjenesten kan du skrive spørsmålet ditt med egne ord. I denne prototypen velger du blant noen ferdige spørsmål.",
      ),
    ).toBeTruthy();
  });

  it("viser en knapp for hvert ferdige spørsmål og ingen tekstfelt", () => {
    open(people.kari);

    for (const item of prepared) {
      expect(screen.getByRole("button", { name: item.text })).toBeTruthy();
    }
    expect(screen.queryByRole("textbox")).toBe(null);
    expect(screen.queryByRole("searchbox")).toBe(null);
    expect(screen.queryByRole("combobox")).toBe(null);
  });

  it("har en samtale med role log som er tom til et spørsmål er valgt", () => {
    open(people.kari);

    const log = screen.getByRole("log");
    expect(within(log).queryAllByRole("listitem")).toHaveLength(0);
  });

  it("legger spørsmålet og svaret i samtalen og flytter fokus til svaret", async () => {
    const user = userEvent.setup({ delay: null });
    open(people.kari);

    await pick(user, answeredText);

    const log = screen.getByRole("log");
    expect(within(log).getByText(answeredText)).toBeTruthy();
    expect(within(log).getByText(answerText)).toBeTruthy();
    await waitFor(() => {
      const active = document.activeElement;
      expect(active).not.toBe(document.body);
      expect(log.contains(active)).toBe(true);
      expect(active?.textContent).toContain(answerText);
    });
  });

  it("viser kilder som lenker og varselet om at svaret kan ta feil", async () => {
    const user = userEvent.setup({ delay: null });
    open(people.kari);

    await pick(user, answeredText);

    const log = within(screen.getByRole("log"));
    expect(log.getByText("Kilder:")).toBeTruthy();
    expect(
      log.getByRole("link", { name: "Frakt av keramikk" }).getAttribute("href"),
    ).toBe("/kunnskapsbank/sporsmal/sporsmal-1");
    expect(
      log.getByRole("link", { name: "Pakking av glass" }).getAttribute("href"),
    ).toBe("/kunnskapsbank/sporsmal/sporsmal-2");
    expect(
      log.getByText(
        "Svaret er laget av en chatbot og kan ta feil. Sjekk kildene før du stoler på det.",
      ),
    ).toBeTruthy();
    expect(log.queryByText("Vi fant ikke noe svar på dette i forumet.")).toBe(
      null,
    );
  });

  it("viser at svaret ikke finnes, de nærmeste spørsmålene og tilbudet om å stille spørsmålet", async () => {
    const user = userEvent.setup({ delay: null });
    open(people.kari);

    await pick(user, closestText);

    const log = within(screen.getByRole("log"));
    expect(
      log.getByText("Vi fant ikke noe svar på dette i forumet."),
    ).toBeTruthy();
    expect(log.getByText("Disse spørsmålene ligner kanskje:")).toBeTruthy();
    expect(
      log
        .getByRole("link", { name: "Kaffeabonnement i nettbutikken" })
        .getAttribute("href"),
    ).toBe("/kunnskapsbank/sporsmal/sporsmal-3");
    expect(
      log
        .getByRole("link", { name: "Abonnement for kaffekunder" })
        .getAttribute("href"),
    ).toBe("/kunnskapsbank/sporsmal/sporsmal-4");
    expect(
      log
        .getByRole("link", { name: "Still spørsmålet i forumet" })
        .getAttribute("href"),
    ).toBe("/kunnskapsbank/sporsmal/ny?fra=chatbot-2");
    expect(log.queryByText("Kilder:")).toBe(null);
    expect(log.queryByText(/kan ta feil/)).toBe(null);
  });

  it("viser ikke listen over lignende spørsmål når ingen passer", async () => {
    const user = userEvent.setup({ delay: null });
    open(people.kari);

    await pick(user, lonelyText);

    const log = within(screen.getByRole("log"));
    expect(
      log.getByText("Vi fant ikke noe svar på dette i forumet."),
    ).toBeTruthy();
    expect(log.queryByText("Disse spørsmålene ligner kanskje:")).toBe(null);
    expect(
      log
        .getByRole("link", { name: "Still spørsmålet i forumet" })
        .getAttribute("href"),
    ).toBe("/kunnskapsbank/sporsmal/ny?fra=chatbot-3");
  });

  it("viser ikke tilbudet om å stille spørsmålet til administratorer", async () => {
    const user = userEvent.setup({ delay: null });
    open(people.marte);

    await pick(user, closestText);

    const log = within(screen.getByRole("log"));
    expect(
      log.getByText("Vi fant ikke noe svar på dette i forumet."),
    ).toBeTruthy();
    expect(log.getByText("Disse spørsmålene ligner kanskje:")).toBeTruthy();
    expect(
      log.queryByRole("link", { name: "Still spørsmålet i forumet" }),
    ).toBe(null);
  });

  it("gir ingen svar når et kildespørsmål er flagget", async () => {
    const user = userEvent.setup({ delay: null });
    open(people.kari, "desktop", flaggedState);

    await pick(user, answeredText);

    const log = within(screen.getByRole("log"));
    expect(
      log.getByText("Vi fant ikke noe svar på dette i forumet."),
    ).toBeTruthy();
    expect(log.queryByText(answerText)).toBe(null);
    expect(log.queryByText("Kilder:")).toBe(null);
  });

  it("legger flere valg i samtalen i den rekkefølgen de er valgt", async () => {
    const user = userEvent.setup({ delay: null });
    open(people.kari);

    await pick(user, closestText);
    await pick(user, answeredText);

    const entries = screen
      .getByRole("log")
      .querySelectorAll<HTMLElement>(".chat-entry");
    expect(entries).toHaveLength(2);
    expect(entries[0]?.textContent).toContain(closestText);
    expect(entries[1]?.textContent).toContain(answeredText);
  });

  it("viser listen til venstre og samtalen til høyre på skrivebord", () => {
    open(people.kari, "desktop");

    const button = screen.getByRole("button", { name: answeredText });
    const log = screen.getByRole("log");
    expect(
      button.compareDocumentPosition(log) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("viser samtalen først og listen under på mobil", () => {
    open(people.kari, "mobile");

    const button = screen.getByRole("button", { name: answeredText });
    const log = screen.getByRole("log");
    expect(
      log.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil med begge typer svar i samtalen", async () => {
    for (const layout of ["desktop", "mobile"] as const) {
      const user = userEvent.setup({ delay: null });
      const { container, unmount } = open(people.kari, layout);

      await pick(user, answeredText);
      await pick(user, closestText);
      await pick(user, lonelyText);

      expect(await axe(container), layout).toHaveNoViolations();
      unmount();
    }
  });

  it("har ingen tilgjengelighetsfeil før noe er valgt og for administrator", async () => {
    const first = open(people.kari);
    expect(await axe(first.container)).toHaveNoViolations();
    first.unmount();

    const user = userEvent.setup({ delay: null });
    const second = open(people.marte);
    await pick(user, closestText);
    expect(await axe(second.container)).toHaveNoViolations();
  });
});
