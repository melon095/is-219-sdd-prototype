import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import {
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
