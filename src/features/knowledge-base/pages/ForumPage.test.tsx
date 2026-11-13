import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import {
  answer,
  kbState,
  people,
  question,
} from "../../../domain/knowledge-base/testState";
import { renderPage } from "../../marketplace/pages/renderPage";
import { formatDate } from "../format";
import { ForumPage } from "./ForumPage";

function day(number: number): string {
  return `2026-11-${String(number).padStart(2, "0")}T09:00:00+01:00`;
}

const manyQuestions = Array.from({ length: 12 }, (_, index) => {
  const number = index + 1;
  return question(`sporsmal-${number}`, {
    title: `Spørsmål ${number}`,
    createdAt: day(number),
  });
});

const questions = [
  ...manyQuestions.map((item) => {
    if (item.id === "sporsmal-12") {
      return {
        ...item,
        topicId: "tema-2",
        authorId: people.per,
        businessId: "bedrift-2",
      };
    }
    if (item.id === "sporsmal-10") {
      return { ...item, moderation: "flagged" as const };
    }
    return item;
  }),
  question("sporsmal-13", {
    title: "Fjernet spørsmål",
    createdAt: day(13),
    moderation: "removed",
  }),
];

const answers = [
  answer("svar-1", "sporsmal-12"),
  answer("svar-2", "sporsmal-12", { moderation: "removed" }),
];

const state = kbState({ questions, answers });

function open(
  userId: string,
  layout: "desktop" | "mobile" = "desktop",
  route = "/kunnskapsbank",
) {
  return renderPage(<ForumPage />, {
    path: "kunnskapsbank",
    route,
    userId,
    state,
    layout,
  });
}

function rowOf(title: string): HTMLElement {
  const link = screen.getByRole("link", { name: title });
  return link.closest("li") as HTMLElement;
}

describe("ForumPage", () => {
  it("har overskriften Kunnskapsbank", () => {
    open(people.kari);

    expect(
      screen.getByRole("heading", { level: 1, name: "Kunnskapsbank" }),
    ).toBeTruthy();
  });

  it("viser temaene med navn, beskrivelse og antall synlige spørsmål", () => {
    open(people.kari);

    const nettbutikk = screen.getByRole("link", { name: "Nettbutikk" });
    expect(nettbutikk.getAttribute("href")).toBe("/kunnskapsbank/tema/tema-1");
    const first = nettbutikk.closest("li") as HTMLElement;
    expect(within(first).getByText("Alt om nettbutikken.")).toBeTruthy();
    expect(within(first).getByText("11 spørsmål")).toBeTruthy();

    const teknisk = screen.getByRole("link", { name: "Teknisk hjelp" });
    expect(teknisk.getAttribute("href")).toBe("/kunnskapsbank/tema/tema-2");
    const second = teknisk.closest("li") as HTMLElement;
    expect(within(second).getByText("Når noe ikke virker.")).toBeTruthy();
    expect(within(second).getByText("1 spørsmål")).toBeTruthy();
  });

  it("viser de ti nyeste synlige spørsmålene, nyeste først", () => {
    open(people.kari);

    const list = screen.getByRole("list", { name: "Nyeste spørsmål" });
    const titles = within(list)
      .getAllByRole("listitem")
      .map((item) => within(item).getAllByRole("link")[0]?.textContent);
    expect(titles).toEqual([
      "Spørsmål 12",
      "Spørsmål 11",
      "Spørsmål 10",
      "Spørsmål 9",
      "Spørsmål 8",
      "Spørsmål 7",
      "Spørsmål 6",
      "Spørsmål 5",
      "Spørsmål 4",
      "Spørsmål 3",
    ]);
    expect(screen.queryByRole("link", { name: "Fjernet spørsmål" })).toBe(null);
  });

  it("viser tittel, tema, bedrift, status, antall svar og dato i hver rad", () => {
    open(people.kari);

    const answered = rowOf("Spørsmål 12");
    expect(
      within(answered)
        .getByRole("link", { name: "Spørsmål 12" })
        .getAttribute("href"),
    ).toBe("/kunnskapsbank/sporsmal/sporsmal-12");
    expect(within(answered).getByText("Teknisk hjelp")).toBeTruthy();
    expect(within(answered).getByText("Sørlandet Honning")).toBeTruthy();
    const badge = within(answered).getByText("Besvart");
    expect(badge.getAttribute("data-tone")).toBe("success");
    expect(within(answered).getByText("1 svar")).toBeTruthy();
    expect(within(answered).getByText(formatDate(day(12)))).toBeTruthy();

    const unanswered = rowOf("Spørsmål 11");
    expect(within(unanswered).getByText("Fjordlys Keramikk")).toBeTruthy();
    expect(within(unanswered).getByText("Nettbutikk")).toBeTruthy();
    const openBadge = within(unanswered).getByText("Åpent");
    expect(openBadge.getAttribute("data-tone")).toBe("neutral");
    expect(within(unanswered).getByText("0 svar")).toBeTruthy();
  });

  it("viser Flagget bare på et flagget spørsmål", () => {
    open(people.kari);

    expect(within(rowOf("Spørsmål 10")).getByText("Flagget")).toBeTruthy();
    expect(within(rowOf("Spørsmål 11")).queryByText("Flagget")).toBe(null);
  });

  it("viser Still et spørsmål til medlemmer og går til skjemaet", async () => {
    const user = userEvent.setup();
    const { router } = open(people.kari);

    await user.click(screen.getByRole("button", { name: "Still et spørsmål" }));

    expect(router.state.location.pathname).toBe("/kunnskapsbank/sporsmal/ny");
  });

  it("viser ikke Still et spørsmål til administratorer", () => {
    open(people.marte);

    expect(screen.queryByRole("button", { name: "Still et spørsmål" })).toBe(
      null,
    );
    expect(screen.getByRole("link", { name: "Spørsmål 12" })).toBeTruthy();
  });

  it("viser en tom tilstand når det ikke finnes spørsmål", () => {
    renderPage(<ForumPage />, {
      path: "kunnskapsbank",
      route: "/kunnskapsbank",
      userId: people.kari,
      state: kbState({}),
    });

    expect(screen.getByText("Ingen spørsmål ennå")).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Nyeste spørsmål" })).toBe(null);
  });

  it("viser temaene til venstre som en overskrift på skrivebord", () => {
    open(people.kari);

    expect(
      screen.getByRole("heading", { level: 2, name: "Tema" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Tema" })).toBe(null);
    expect(
      screen.getByRole("heading", { level: 2, name: "Nyeste spørsmål" }),
    ).toBeTruthy();
  });

  it("viser temaene i en utvidbar del Tema over listen på mobil", async () => {
    const user = userEvent.setup();
    open(people.kari, "mobile");

    const trigger = screen.getByRole("button", { name: "Tema" });
    expect(trigger.closest("h2")).toBeTruthy();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await user.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const link = screen.getByRole("link", { name: "Nettbutikk" });
    const list = screen.getByRole("list", { name: "Nyeste spørsmål" });
    expect(
      link.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

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
});
