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
import { TopicPage } from "./TopicPage";

const state = kbState({
  questions: [
    question("sporsmal-1", {
      title: "Eldste i nettbutikk",
      createdAt: "2026-11-01T09:00:00+01:00",
    }),
    question("sporsmal-2", {
      title: "Nyeste i nettbutikk",
      createdAt: "2026-11-03T09:00:00+01:00",
    }),
    question("sporsmal-3", {
      title: "Fjernet i nettbutikk",
      createdAt: "2026-11-04T09:00:00+01:00",
      moderation: "removed",
    }),
    question("sporsmal-4", {
      title: "Mellom i nettbutikk",
      createdAt: "2026-11-02T09:00:00+01:00",
    }),
    question("sporsmal-5", {
      title: "Noe teknisk",
      topicId: "tema-2",
      createdAt: "2026-11-05T09:00:00+01:00",
    }),
  ],
  answers: [answer("svar-1", "sporsmal-4")],
});

function open(
  userId: string,
  topicId = "tema-1",
  layout: "desktop" | "mobile" = "desktop",
) {
  return renderPage(<TopicPage />, {
    path: "kunnskapsbank/tema/:topicId",
    route: `/kunnskapsbank/tema/${topicId}`,
    userId,
    state,
    layout,
    extraPages: [
      { path: "kunnskapsbank/sporsmal/ny", element: <p>Skjemaet</p> },
    ],
  });
}

describe("TopicPage", () => {
  it("viser temaets navn som overskrift og beskrivelsen", () => {
    open(people.kari);

    expect(
      screen.getByRole("heading", { level: 1, name: "Nettbutikk" }),
    ).toBeTruthy();
    expect(screen.getByText("Alt om nettbutikken.")).toBeTruthy();
  });

  it("viser de synlige spørsmålene i temaet, nyeste først, som rader", () => {
    open(people.kari);

    const rows = screen.getAllByRole("listitem");
    const titles = rows.map((row) => within(row).getAllByRole("link")[0]);
    expect(titles.map((link) => link?.textContent)).toEqual([
      "Nyeste i nettbutikk",
      "Mellom i nettbutikk",
      "Eldste i nettbutikk",
    ]);
    expect(titles[0]?.getAttribute("href")).toBe(
      "/kunnskapsbank/sporsmal/sporsmal-2",
    );
    expect(within(rows[1] as HTMLElement).getByText("Besvart")).toBeTruthy();
    expect(within(rows[0] as HTMLElement).getByText("Åpent")).toBeTruthy();
    expect(screen.queryByText("Fjernet i nettbutikk")).toBe(null);
    expect(screen.queryByText("Noe teknisk")).toBe(null);
  });

  it("viser Still et spørsmål i dette temaet og går til skjemaet med temaet valgt", async () => {
    const user = userEvent.setup({ delay: null });
    const { router } = open(people.kari, "tema-2");

    await user.click(
      screen.getByRole("button", { name: "Still et spørsmål i dette temaet" }),
    );

    expect(router.state.location.pathname).toBe("/kunnskapsbank/sporsmal/ny");
    expect(router.state.location.search).toBe("?tema=tema-2");
  });

  it("viser ikke Still et spørsmål i dette temaet til administratorer", () => {
    open(people.marte);

    expect(
      screen.queryByRole("button", {
        name: "Still et spørsmål i dette temaet",
      }),
    ).toBe(null);
    expect(screen.getByText("Nyeste i nettbutikk")).toBeTruthy();
  });

  it("viser siden finnes ikke for et ukjent tema", () => {
    open(people.kari, "tema-99");

    expect(
      screen.getByRole("heading", { level: 1, name: "Siden finnes ikke" }),
    ).toBeTruthy();
  });

  it("viser en tom tilstand for et tema uten spørsmål", () => {
    renderPage(<TopicPage />, {
      path: "kunnskapsbank/tema/:topicId",
      route: "/kunnskapsbank/tema/tema-1",
      userId: people.kari,
      state: kbState({}),
    });

    expect(screen.getByText("Ingen spørsmål i dette temaet ennå")).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil på skrivebord, mobil og for administrator", async () => {
    for (const [userId, layout] of [
      [people.kari, "desktop"],
      [people.kari, "mobile"],
      [people.marte, "desktop"],
    ] as const) {
      const { container, unmount } = open(userId, "tema-1", layout);
      expect(await axe(container), `${userId} ${layout}`).toHaveNoViolations();
      unmount();
    }
  });
});
