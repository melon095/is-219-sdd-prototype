import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  answer,
  kbState,
  people,
  question,
} from "../../../domain/knowledge-base/testState";
import { testNow } from "../../../frame/test-utils";
import { renderPage } from "../../marketplace/pages/renderPage";
import { QuestionFormPage } from "./QuestionFormPage";

const state = kbState({
  questions: [
    question("sporsmal-1"),
    question("sporsmal-2", { moderation: "removed" }),
  ],
});

const questionPage = {
  path: "kunnskapsbank/sporsmal/:questionId",
  element: <p>Spørsmålssiden</p>,
};

function openNew(userId: string, route = "/kunnskapsbank/sporsmal/ny") {
  return renderPage(<QuestionFormPage />, {
    path: "kunnskapsbank/sporsmal/ny",
    route,
    userId,
    state,
    extraPages: [questionPage],
  });
}

function openEdit(userId: string, questionId = "sporsmal-1") {
  return renderPage(<QuestionFormPage />, {
    path: "kunnskapsbank/sporsmal/:questionId/rediger",
    route: `/kunnskapsbank/sporsmal/${questionId}/rediger`,
    userId,
    state,
    extraPages: [questionPage],
  });
}

function titleField() {
  return screen.getByRole("textbox", { name: "Tittel" }) as HTMLInputElement;
}

function descriptionField() {
  return screen.getByRole("textbox", {
    name: "Beskriv spørsmålet",
  }) as HTMLTextAreaElement;
}

describe("QuestionFormPage for nye spørsmål", () => {
  it("har tema, tittel med tegnteller og beskrivelse", async () => {
    const user = userEvent.setup({ delay: null });
    openNew(people.jonas);

    expect(
      screen.getByRole("heading", { level: 1, name: "Still et spørsmål" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /Tema/ })).toBeTruthy();
    expect(titleField()).toBeTruthy();
    expect(descriptionField()).toBeTruthy();
    expect(screen.getByText("0 av 120 tegn")).toBeTruthy();

    await user.type(titleField(), "Hei du");
    expect(screen.getByText("6 av 120 tegn")).toBeTruthy();
  });

  it("forhåndsvelger temaet fra adressen", () => {
    openNew(people.jonas, "/kunnskapsbank/sporsmal/ny?tema=tema-2");

    expect(screen.getByRole("button", { name: /Tema/ }).textContent).toContain(
      "Teknisk hjelp",
    );
  });

  it("lar medlemmet velge tema fra listen", async () => {
    const user = userEvent.setup({ delay: null });
    openNew(people.jonas);

    await user.click(screen.getByRole("button", { name: /Tema/ }));
    await user.click(await screen.findByRole("option", { name: "Nettbutikk" }));

    expect(screen.getByRole("button", { name: /Tema/ }).textContent).toContain(
      "Nettbutikk",
    );
  });

  it("viser feil fra kommandoen på feltene", async () => {
    const user = userEvent.setup({ delay: null });
    openNew(people.jonas);

    await user.click(
      screen.getByRole("button", { name: "Publiser spørsmålet" }),
    );

    expect(await screen.findByText("Velg et tema")).toBeTruthy();
    expect(screen.getByText("Skriv en tittel på opptil 120 tegn")).toBeTruthy();
    expect(
      screen.getByText("Beskriv spørsmålet med opptil 4000 tegn"),
    ).toBeTruthy();
    expect(titleField().getAttribute("aria-invalid")).toBe("true");
    expect(descriptionField().getAttribute("aria-invalid")).toBe("true");
  });

  it("publiserer, går til spørsmålssiden og kunngjør at spørsmålet er publisert", async () => {
    const user = userEvent.setup({ delay: null });
    const { router, store } = openNew(
      people.jonas,
      "/kunnskapsbank/sporsmal/ny?tema=tema-1",
    );

    await user.type(titleField(), "Hvordan pakker vi glass?");
    await user.type(descriptionField(), "Vi trenger gode tips til emballasje.");
    await user.click(
      screen.getByRole("button", { name: "Publiser spørsmålet" }),
    );

    const created = store.getState().knowledgeBase.questions.at(-1);
    expect(created?.title).toBe("Hvordan pakker vi glass?");
    expect(created?.topicId).toBe("tema-1");
    expect(created?.authorId).toBe(people.jonas);
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        `/kunnskapsbank/sporsmal/${created?.id}`,
      ),
    );
    expect(await screen.findByText("Spørsmålet er publisert")).toBeTruthy();
  });

  it("viser at administratorer kan lese, men ikke skrive, og ingen skjema", () => {
    openNew(people.marte);

    expect(
      screen.getByRole("heading", { level: 1, name: "Still et spørsmål" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Som Varodd-ansatt kan du lese, men ikke skrive i kunnskapsbanken.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Tittel" })).toBe(null);
    expect(screen.queryByRole("button", { name: "Publiser spørsmålet" })).toBe(
      null,
    );
  });
});

describe("QuestionFormPage for å redigere", () => {
  it("fyller ut skjemaet for forfatteren", () => {
    openEdit(people.jonas);

    expect(
      screen.getByRole("heading", { level: 1, name: "Rediger spørsmål" }),
    ).toBeTruthy();
    expect(titleField().value).toBe(
      "Hvordan setter jeg opp frakt i nettbutikken?",
    );
    expect(descriptionField().value).toBe(
      "Vi trenger en enkel løsning for frakt til hele landet.",
    );
    expect(screen.getByRole("button", { name: /Tema/ }).textContent).toContain(
      "Nettbutikk",
    );
  });

  it("lagrer med editQuestion, går til spørsmålssiden og kunngjør endringen", async () => {
    const user = userEvent.setup({ delay: null });
    const { router, store } = openEdit(people.jonas);

    await user.clear(titleField());
    await user.type(titleField(), "Hvordan sender vi til Sverige?");
    await user.click(screen.getByRole("button", { name: "Lagre endringer" }));

    const edited = store
      .getState()
      .knowledgeBase.questions.find((item) => item.id === "sporsmal-1");
    expect(edited?.title).toBe("Hvordan sender vi til Sverige?");
    expect(edited?.editedAt).toBe(testNow);
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        "/kunnskapsbank/sporsmal/sporsmal-1",
      ),
    );
    expect(await screen.findByText("Endringene er lagret")).toBeTruthy();
  });

  it("viser feil fra kommandoen på feltene", async () => {
    const user = userEvent.setup({ delay: null });
    openEdit(people.jonas);

    await user.clear(titleField());
    await user.click(screen.getByRole("button", { name: "Lagre endringer" }));

    expect(
      await screen.findByText("Skriv en tittel på opptil 120 tegn"),
    ).toBeTruthy();
  });

  it("viser ingen tilgang for andre enn forfatteren", () => {
    for (const userId of [people.per, people.marte]) {
      const { unmount } = openEdit(userId);
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Du har ikke tilgang til denne siden",
        }),
        userId,
      ).toBeTruthy();
      expect(screen.queryByRole("textbox", { name: "Tittel" })).toBe(null);
      unmount();
    }
  });

  it("viser ingen tilgang for forfatteren av et fjernet spørsmål", () => {
    openEdit(people.jonas, "sporsmal-2");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Du har ikke tilgang til denne siden",
      }),
    ).toBeTruthy();
  });

  it("viser siden finnes ikke for et ukjent spørsmål", () => {
    openEdit(people.jonas, "sporsmal-99");

    expect(
      screen.getByRole("heading", { level: 1, name: "Siden finnes ikke" }),
    ).toBeTruthy();
  });
});

describe("QuestionFormPage tilgjengelighet", () => {
  it("har ingen tilgjengelighetsfeil i et tomt skjema", async () => {
    const { container } = openNew(people.jonas);

    expect(await axe(container)).toHaveNoViolations();
  });

  it("har ingen tilgjengelighetsfeil med feilmeldinger", async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = openNew(people.jonas);
    await user.click(
      screen.getByRole("button", { name: "Publiser spørsmålet" }),
    );
    await screen.findByText("Velg et tema");

    expect(await axe(container)).toHaveNoViolations();
  });

  it("har ingen tilgjengelighetsfeil for administrator", async () => {
    const { container } = openNew(people.marte);

    expect(await axe(container)).toHaveNoViolations();
  });

  it("har ingen tilgjengelighetsfeil ved redigering", async () => {
    const { container } = openEdit(people.jonas);

    expect(await axe(container)).toHaveNoViolations();
  });
});

const longAnswer = `${"x".repeat(160)} resten av svaret`;

const similarState = kbState({
  questions: [
    question("sporsmal-1", { createdAt: "2026-11-10T09:00:00+01:00" }),
    question("sporsmal-2", {
      title: "Betalingsmåter i nettbutikken",
      description: "Vipps, kort og faktura.",
      authorId: people.per,
      businessId: "bedrift-2",
      createdAt: "2026-11-11T09:00:00+01:00",
    }),
    question("sporsmal-3", {
      title: "Frakt med Bring",
      description: "Pakker til hele landet.",
      authorId: people.ola,
      businessId: "bedrift-4",
      createdAt: "2026-11-12T09:00:00+01:00",
    }),
    question("sporsmal-4", {
      title: "Fjernet frakt til hele landet",
      description: "Frakt og pakker til hele landet.",
      createdAt: "2026-11-13T09:00:00+01:00",
      moderation: "removed",
    }),
  ],
  answers: [
    answer("svar-1", "sporsmal-1", {
      text: "Skjult svar",
      createdAt: "2026-11-10T10:00:00+01:00",
      moderation: "removed",
    }),
    answer("svar-2", "sporsmal-1", {
      text: longAnswer,
      createdAt: "2026-11-10T11:00:00+01:00",
    }),
    answer("svar-3", "sporsmal-3", {
      text: "Kort svar.",
      createdAt: "2026-11-12T10:00:00+01:00",
    }),
  ],
});

const panelTitle = "Har noen spurt om dette før?";

function openSimilar(
  userId: string,
  layout: "desktop" | "mobile" = "desktop",
  route = "/kunnskapsbank/sporsmal/ny",
) {
  return renderPage(<QuestionFormPage />, {
    path: "kunnskapsbank/sporsmal/ny",
    route,
    userId,
    state: similarState,
    layout,
    extraPages: [questionPage],
  });
}

function liveRegion(): HTMLElement {
  const region = document.querySelector<HTMLElement>('[aria-live="polite"]');
  if (region === null) {
    throw new Error("Fant ikke området som kunngjør endringer");
  }
  return region;
}

function write(field: HTMLElement, value: string) {
  fireEvent.change(field, { target: { value } });
}

function settle() {
  act(() => {
    vi.advanceTimersByTime(300);
  });
}

describe("QuestionFormPage lignende spørsmål", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("viser panelet først 300 ms etter at skrivingen stopper", () => {
    vi.useFakeTimers();
    openSimilar(people.jonas);

    write(titleField(), "Frakt til hele landet");
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(screen.queryByText(panelTitle)).toBe(null);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText(panelTitle)).toBeTruthy();
  });

  it("lister opptil tre like spørsmål med tittel, status, bedrift og starten av første synlige svar", () => {
    vi.useFakeTimers();
    openSimilar(people.jonas);

    write(titleField(), "Frakt til hele landet");
    write(descriptionField(), "Keramikk");
    settle();

    const panel = within(
      screen.getByRole("complementary", { name: panelTitle }),
    );
    const items = panel.getAllByRole("listitem");
    expect(items).toHaveLength(2);

    const first = within(items[0] as HTMLElement);
    expect(
      first.getByRole("link", { name: "Frakt med Bring" }).getAttribute("href"),
    ).toBe("/kunnskapsbank/sporsmal/sporsmal-3");
    expect(first.getByText("Besvart")).toBeTruthy();
    expect(first.getByText("Kvadraturen Kaffebrenneri")).toBeTruthy();
    expect(first.getByText("Kort svar.")).toBeTruthy();

    const second = within(items[1] as HTMLElement);
    expect(
      second.getByRole("link", {
        name: "Hvordan setter jeg opp frakt i nettbutikken?",
      }),
    ).toBeTruthy();
    expect(second.getByText("Fjordlys Keramikk")).toBeTruthy();
    expect(second.getByText(`${"x".repeat(160)}…`)).toBeTruthy();
    expect(second.queryByText(/Skjult svar/)).toBe(null);

    expect(
      panel.getByText("Du kan fortsatt publisere spørsmålet ditt."),
    ).toBeTruthy();
    expect(screen.queryByText("Fjernet frakt til hele landet")).toBe(null);
  });

  it("viser Åpent for et like spørsmål uten svar", () => {
    vi.useFakeTimers();
    openSimilar(people.jonas);

    write(titleField(), "Betalingsmåter nettbutikken");
    write(descriptionField(), "Vipps");
    settle();

    const panel = within(
      screen.getByRole("complementary", { name: panelTitle }),
    );
    expect(panel.getByText("Åpent")).toBeTruthy();
    expect(panel.getByText("Sørlandet Honning")).toBeTruthy();
  });

  it("kunngjør endringer i antall treff", () => {
    vi.useFakeTimers();
    openSimilar(people.jonas);

    write(titleField(), "Frakt til hele landet");
    settle();
    expect(liveRegion().textContent).toBe("Vi fant 2 lignende spørsmål");

    write(titleField(), "Frakt med Bring");
    write(descriptionField(), "Pakker");
    settle();
    expect(liveRegion().textContent).toBe("Vi fant 1 lignende spørsmål");

    write(titleField(), "");
    write(descriptionField(), "");
    settle();
    expect(screen.queryByText(panelTitle)).toBe(null);
    expect(liveRegion().textContent).toBe("Vi fant ingen lignende spørsmål");
  });

  it("har ikke panelet når ingenting passer", () => {
    vi.useFakeTimers();
    openSimilar(people.jonas);

    write(titleField(), "Helt andre ting");
    settle();

    expect(screen.queryByText(panelTitle)).toBe(null);
    expect(screen.queryByRole("complementary")).toBe(null);
  });

  it("har ikke panelet når et spørsmål redigeres", () => {
    vi.useFakeTimers();
    renderPage(<QuestionFormPage />, {
      path: "kunnskapsbank/sporsmal/:questionId/rediger",
      route: "/kunnskapsbank/sporsmal/sporsmal-1/rediger",
      userId: people.jonas,
      state: similarState,
      extraPages: [questionPage],
    });

    write(titleField(), "Frakt til hele landet");
    write(descriptionField(), "Keramikk");
    settle();

    expect(screen.queryByText(panelTitle)).toBe(null);
  });

  it("lar medlemmet publisere mens panelet vises", async () => {
    const user = userEvent.setup({ delay: null });
    const { router, store } = openSimilar(
      people.jonas,
      "desktop",
      "/kunnskapsbank/sporsmal/ny?tema=tema-1",
    );

    await user.type(titleField(), "Frakt til hele landet");
    await user.type(descriptionField(), "Keramikk");
    await screen.findByText(panelTitle);
    await user.click(
      screen.getByRole("button", { name: "Publiser spørsmålet" }),
    );

    const created = store.getState().knowledgeBase.questions.at(-1);
    expect(created?.title).toBe("Frakt til hele landet");
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        `/kunnskapsbank/sporsmal/${created?.id}`,
      ),
    );
  });

  it("viser panelet ved siden av skjemaet på skrivebord", () => {
    vi.useFakeTimers();
    openSimilar(people.jonas, "desktop");

    write(titleField(), "Frakt til hele landet");
    write(descriptionField(), "Keramikk");
    settle();

    const panel = screen.getByRole("complementary", { name: panelTitle });
    const form = descriptionField().closest("form") as HTMLElement;
    expect(form.contains(panel)).toBe(false);
    expect(
      form.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("viser panelet mellom Tittel og Beskriv spørsmålet på mobil", () => {
    vi.useFakeTimers();
    openSimilar(people.jonas, "mobile");

    write(titleField(), "Frakt til hele landet");
    write(descriptionField(), "Keramikk");
    settle();

    expect(screen.queryByRole("complementary")).toBe(null);
    const heading = screen.getByRole("heading", { level: 2, name: panelTitle });
    expect(
      titleField().compareDocumentPosition(heading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      heading.compareDocumentPosition(descriptionField()) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil med panelet på skrivebord og mobil", async () => {
    for (const layout of ["desktop", "mobile"] as const) {
      const user = userEvent.setup({ delay: null });
      const { container, unmount } = openSimilar(people.jonas, layout);

      await user.type(titleField(), "Frakt til hele landet");
      await user.type(descriptionField(), "Keramikk");
      await screen.findByText(panelTitle);

      expect(await axe(container), layout).toHaveNoViolations();
      unmount();
    }
  });
});
