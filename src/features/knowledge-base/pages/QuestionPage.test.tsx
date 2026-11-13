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
import { testNow } from "../../../frame/test-utils";
import { renderPage } from "../../marketplace/pages/renderPage";
import { formatDate, formatDateTime } from "../format";
import { QuestionPage } from "./QuestionPage";

function day(number: number): string {
  return `2026-11-${String(number).padStart(2, "0")}T09:00:00+01:00`;
}

const questionEditedAt = "2026-11-11T08:30:00+01:00";
const answerEditedAt = "2026-11-10T12:00:00+01:00";

const otherQuestions = [2, 3, 4, 5, 6, 7].map((number) =>
  question(`sporsmal-${number}`, {
    title: `Annet spørsmål ${number}`,
    createdAt: day(number),
  }),
);

const questions = [
  question("sporsmal-1", { editedAt: questionEditedAt }),
  ...otherQuestions,
  question("sporsmal-8", {
    title: "Annet tema",
    topicId: "tema-2",
    createdAt: day(8),
  }),
  question("sporsmal-9", {
    title: "Fjernet spørsmål",
    description: "Hemmelig beskrivelse",
    createdAt: day(20),
    moderation: "removed",
  }),
];

const answers = [
  answer("svar-1", "sporsmal-1"),
  answer("svar-2", "sporsmal-1", {
    authorId: people.kari,
    businessId: "bedrift-1",
    text: "Vi bruker Bring.",
    createdAt: "2026-11-10T11:00:00+01:00",
    editedAt: answerEditedAt,
  }),
  answer("svar-3", "sporsmal-1", {
    authorId: people.ola,
    businessId: "bedrift-4",
    text: "Fjernet svar",
    createdAt: "2026-11-10T10:30:00+01:00",
    moderation: "removed",
  }),
];

const state = kbState({ questions, answers });

function open(
  userId: string,
  layout: "desktop" | "mobile" = "desktop",
  questionId = "sporsmal-1",
) {
  return renderPage(<QuestionPage />, {
    path: "kunnskapsbank/sporsmal/:questionId",
    route: `/kunnskapsbank/sporsmal/${questionId}`,
    userId,
    state,
    layout,
  });
}

function questionRegion(): HTMLElement {
  return screen.getByRole("region", { name: "Spørsmålet" });
}

function answerRegion(): HTMLElement {
  return screen.getByRole("region", { name: /^\d+ svar$/ });
}

function answerItem(id: string): HTMLElement {
  const item = document.querySelector<HTMLElement>(`[data-answer-id="${id}"]`);
  if (item === null) {
    throw new Error(`Fant ikke svaret ${id}`);
  }
  return item;
}

describe("QuestionPage for medlemmer", () => {
  it("viser tittelen som overskrift og detaljene om spørsmålet", () => {
    open(people.kari);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Hvordan setter jeg opp frakt i nettbutikken?",
      }),
    ).toBeTruthy();
    const details = within(questionRegion());
    const badge = details.getByText("Besvart");
    expect(badge.getAttribute("data-tone")).toBe("success");
    expect(
      details.getByRole("link", { name: "Nettbutikk" }).getAttribute("href"),
    ).toBe("/kunnskapsbank/tema/tema-1");
    expect(details.getByText("Fjordlys Keramikk")).toBeTruthy();
    expect(details.getByText("Jonas Berg")).toBeTruthy();
    expect(details.getByText(formatDate(day(10)))).toBeTruthy();
    expect(
      details.getByText(`Endret ${formatDateTime(questionEditedAt)}`),
    ).toBeTruthy();
    expect(
      details.getByText(
        "Vi trenger en enkel løsning for frakt til hele landet.",
      ),
    ).toBeTruthy();
  });

  it("viser Åpent og ingen Endret for et spørsmål uten svar og endringer", () => {
    open(people.kari, "desktop", "sporsmal-2");

    const details = within(questionRegion());
    expect(details.getByText("Åpent").getAttribute("data-tone")).toBe(
      "neutral",
    );
    expect(details.queryByText(/^Endret/)).toBe(null);
    expect(
      within(answerRegion()).getByRole("heading", { level: 2 }).textContent,
    ).toBe("0 svar");
  });

  it("viser antall svar og svarene, eldste først, uten fjernede svar", () => {
    open(people.kari);

    const region = within(answerRegion());
    expect(
      region.getByRole("heading", { level: 2, name: "2 svar" }),
    ).toBeTruthy();
    const items = region.getAllByRole("listitem");
    expect(items).toHaveLength(2);

    const first = within(items[0] as HTMLElement);
    expect(first.getByText("Sørlandet Honning")).toBeTruthy();
    expect(first.getByText("Per Hansen")).toBeTruthy();
    expect(first.getByText(formatDate(day(10)))).toBeTruthy();
    expect(first.getByText("Bruk en fraktavtale med Posten.")).toBeTruthy();
    expect(first.queryByText(/^Endret/)).toBe(null);

    const second = within(items[1] as HTMLElement);
    expect(second.getByText("Fjordlys Keramikk")).toBeTruthy();
    expect(second.getByText("Kari Nordmann")).toBeTruthy();
    expect(second.getByText("Vi bruker Bring.")).toBeTruthy();
    expect(
      second.getByText(`Endret ${formatDateTime(answerEditedAt)}`),
    ).toBeTruthy();
    expect(screen.queryByText("Fjernet svar")).toBe(null);
  });

  it("har ingen kommentarfelt eller kommentarknapper", () => {
    open(people.kari);

    expect(screen.queryByText(/kommentar/i)).toBe(null);
    expect(screen.queryByRole("button", { name: /kommentar/i })).toBe(null);
  });

  it("viser Rediger som lenke på eget spørsmål og ingen Rediger på andres svar", () => {
    open(people.jonas);

    expect(
      screen.getByRole("link", { name: "Rediger" }).getAttribute("href"),
    ).toBe("/kunnskapsbank/sporsmal/sporsmal-1/rediger");
    expect(screen.queryByRole("button", { name: "Rediger" })).toBe(null);
  });

  it("viser Rediger bare på egne svar for en som ikke har skrevet spørsmålet", () => {
    open(people.per);

    expect(screen.queryByRole("link", { name: "Rediger" })).toBe(null);
    const buttons = screen.getAllByRole("button", { name: "Rediger" });
    expect(buttons).toHaveLength(1);
    expect(answerItem("svar-1").contains(buttons[0] as HTMLElement)).toBe(true);
  });

  it("lar forfatteren endre svaret på stedet med Lagre", async () => {
    const user = userEvent.setup({ delay: null });
    const { store } = open(people.per);

    await user.click(screen.getByRole("button", { name: "Rediger" }));
    const box = screen.getByRole("textbox", {
      name: "Svaret ditt",
    }) as HTMLTextAreaElement;
    expect(box.value).toBe("Bruk en fraktavtale med Posten.");
    await user.clear(box);
    await user.type(box, "Bruk Bring i stedet.");
    await user.click(screen.getByRole("button", { name: "Lagre" }));

    const edited = store
      .getState()
      .knowledgeBase.answers.find((item) => item.id === "svar-1");
    expect(edited?.text).toBe("Bruk Bring i stedet.");
    expect(edited?.editedAt).toBe(testNow);
    const item = within(answerItem("svar-1"));
    expect(item.getByText("Bruk Bring i stedet.")).toBeTruthy();
    expect(item.getByText(`Endret ${formatDateTime(testNow)}`)).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Svaret ditt" })).toBe(null);
    await waitFor(() =>
      expect(document.activeElement).toBe(answerItem("svar-1")),
    );
  });

  it("viser feil når det endrede svaret er tomt", async () => {
    const user = userEvent.setup({ delay: null });
    open(people.per);

    await user.click(screen.getByRole("button", { name: "Rediger" }));
    await user.clear(screen.getByRole("textbox", { name: "Svaret ditt" }));
    await user.click(screen.getByRole("button", { name: "Lagre" }));

    expect(
      await screen.findByText("Skriv et svar på opptil 4000 tegn"),
    ).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Svaret ditt" })).toBeTruthy();
  });

  it("endrer ingenting med Avbryt", async () => {
    const user = userEvent.setup({ delay: null });
    const { store } = open(people.per);

    await user.click(screen.getByRole("button", { name: "Rediger" }));
    await user.type(
      screen.getByRole("textbox", { name: "Svaret ditt" }),
      " og mer",
    );
    await user.click(screen.getByRole("button", { name: "Avbryt" }));

    expect(screen.queryByRole("textbox", { name: "Svaret ditt" })).toBe(null);
    expect(screen.getByText("Bruk en fraktavtale med Posten.")).toBeTruthy();
    expect(
      store
        .getState()
        .knowledgeBase.answers.find((item) => item.id === "svar-1")?.editedAt,
    ).toBeUndefined();
    await waitFor(() =>
      expect(document.activeElement).toBe(answerItem("svar-1")),
    );
  });

  it("publiserer et svar, tømmer feltet, kunngjør det og flytter fokus til svaret", async () => {
    const user = userEvent.setup({ delay: null });
    const { store } = open(people.ola);

    const box = screen.getByRole("textbox", {
      name: "Skriv et svar",
    }) as HTMLTextAreaElement;
    await user.type(box, "Prøv en pakkeautomat.");
    await user.click(screen.getByRole("button", { name: "Publiser svar" }));

    const created = store.getState().knowledgeBase.answers.at(-1);
    expect(created?.text).toBe("Prøv en pakkeautomat.");
    expect(created?.authorId).toBe(people.ola);
    expect(created?.businessId).toBe("bedrift-4");
    expect(box.value).toBe("");
    expect(await screen.findByText("Svaret er publisert")).toBeTruthy();
    expect(
      within(answerRegion()).getByRole("heading", { level: 2, name: "3 svar" }),
    ).toBeTruthy();
    const item = answerItem(created?.id ?? "");
    expect(within(item).getByText("Kvadraturen Kaffebrenneri")).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(item));
  });

  it("viser feil når svaret er tomt", async () => {
    const user = userEvent.setup({ delay: null });
    const { store } = open(people.ola);

    await user.click(screen.getByRole("button", { name: "Publiser svar" }));

    expect(
      await screen.findByText("Skriv et svar på opptil 4000 tegn"),
    ).toBeTruthy();
    expect(store.getState().knowledgeBase.answers).toHaveLength(3);
  });

  it("lar også den som stilte spørsmålet svare", () => {
    open(people.jonas);

    expect(screen.getByRole("textbox", { name: "Skriv et svar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Publiser svar" })).toBeTruthy();
  });
});

describe("QuestionPage for administratorer", () => {
  it("viser alt, men ingen svarskjema og ingen Rediger", () => {
    open(people.marte);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Hvordan setter jeg opp frakt i nettbutikken?",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Bruk en fraktavtale med Posten.")).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Skriv et svar" })).toBe(null);
    expect(screen.queryByRole("button", { name: "Publiser svar" })).toBe(null);
    expect(screen.queryByRole("link", { name: "Rediger" })).toBe(null);
    expect(screen.queryByRole("button", { name: "Rediger" })).toBe(null);
    expect(
      screen.getByText(
        "Som Varodd-ansatt kan du lese, men ikke skrive i kunnskapsbanken.",
      ),
    ).toBeTruthy();
  });
});

describe("QuestionPage sidepanel", () => {
  it("viser tema, status, antall svar og de fem nyeste andre spørsmålene i temaet på skrivebord", () => {
    open(people.kari);

    const panel = within(
      screen.getByRole("complementary", { name: "Om spørsmålet" }),
    );
    expect(
      panel.getByRole("link", { name: "Nettbutikk" }).getAttribute("href"),
    ).toBe("/kunnskapsbank/tema/tema-1");
    expect(panel.getByText("Besvart")).toBeTruthy();
    expect(panel.getByText("Antall svar").nextElementSibling?.textContent).toBe(
      "2",
    );
    const list = panel.getByRole("list", { name: "Flere spørsmål i temaet" });
    const links = within(list).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Annet spørsmål 7",
      "Annet spørsmål 6",
      "Annet spørsmål 5",
      "Annet spørsmål 4",
      "Annet spørsmål 3",
    ]);
    expect(links[0]?.getAttribute("href")).toBe(
      "/kunnskapsbank/sporsmal/sporsmal-7",
    );
  });

  it("viser innholdet etter svarene og uten sidepanel på mobil", () => {
    open(people.kari, "mobile");

    expect(screen.queryByRole("complementary")).toBe(null);
    const heading = screen.getByRole("heading", {
      level: 3,
      name: "Flere spørsmål i temaet",
    });
    const lastAnswer = answerItem("svar-2");
    expect(
      lastAnswer.compareDocumentPosition(heading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe("QuestionPage for ukjente og fjernede spørsmål", () => {
  it("viser siden finnes ikke for et ukjent spørsmål", () => {
    open(people.kari, "desktop", "sporsmal-99");

    expect(
      screen.getByRole("heading", { level: 1, name: "Siden finnes ikke" }),
    ).toBeTruthy();
  });

  it("viser Spørsmålet er fjernet uten innholdet i spørsmålet", () => {
    open(people.kari, "desktop", "sporsmal-9");

    expect(
      screen.getByRole("heading", { level: 1, name: "Spørsmålet er fjernet" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Varodd har fjernet dette spørsmålet fordi det ikke passet i forumet.",
      ),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Tilbake til forumet" })
        .getAttribute("href"),
    ).toBe("/kunnskapsbank");
    expect(screen.queryByText("Hemmelig beskrivelse")).toBe(null);
    expect(screen.queryByRole("textbox", { name: "Skriv et svar" })).toBe(null);
  });
});

describe("QuestionPage tilgjengelighet", () => {
  it("har ingen tilgjengelighetsfeil på skrivebord", async () => {
    const { container } = open(people.kari);

    expect(await axe(container)).toHaveNoViolations();
  });

  it("har ingen tilgjengelighetsfeil på mobil", async () => {
    const { container } = open(people.kari, "mobile");

    expect(await axe(container)).toHaveNoViolations();
  });

  it("har ingen tilgjengelighetsfeil for administrator", async () => {
    const { container } = open(people.marte);

    expect(await axe(container)).toHaveNoViolations();
  });

  it("har ingen tilgjengelighetsfeil mens et svar redigeres", async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = open(people.per);
    await user.click(screen.getByRole("button", { name: "Rediger" }));

    expect(await axe(container)).toHaveNoViolations();
  });

  it("har ingen tilgjengelighetsfeil for et fjernet spørsmål", async () => {
    const { container } = open(people.kari, "desktop", "sporsmal-9");

    expect(await axe(container)).toHaveNoViolations();
  });
});
