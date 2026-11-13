import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import type { DemoState } from "../../../domain/frame/types";
import {
  people,
  review,
  withKnowledgeBase,
} from "../../../domain/knowledge-base/testState";
import { testNow } from "../../../frame/test-utils";
import { renderPage } from "../../marketplace/pages/renderPage";
import { formatDateTime } from "../format";
import { flagTimes, moderationState } from "../testFixtures";
import { ReviewPage } from "./ReviewPage";

function day(number: number, hour = 9): string {
  return `2026-11-${String(number).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00+01:00`;
}

function withHistory(count: number): DemoState {
  const base = moderationState();
  const closed = Array.from({ length: count }, (_, index) =>
    review(`vurdering-${10 + index}`, "answer", "svar-1", ["flagg-2"], {
      openedAt: day(index + 1, 8),
      outcome: index % 2 === 0 ? "cleared" : "removed",
      reviewedBy: people.marte,
      reviewedAt: day(index + 1),
    }),
  );
  return withKnowledgeBase(base, {
    reviews: [...base.knowledgeBase.reviews, ...closed],
  });
}

function withoutOpenReviews(): DemoState {
  const base = moderationState();
  return withKnowledgeBase(base, {
    reviews: base.knowledgeBase.reviews.map((item) => ({
      ...item,
      outcome: "cleared" as const,
      reviewedBy: people.marte,
      reviewedAt: day(13),
    })),
  });
}

function open(userId = people.marte, state = withHistory(1)) {
  return renderPage(<ReviewPage />, {
    path: "kunnskapsbank/vurdering",
    route: "/kunnskapsbank/vurdering",
    userId,
    state,
  });
}

function reviewItem(id: string): HTMLElement {
  const item = document.querySelector<HTMLElement>(`[data-review-id="${id}"]`);
  if (item === null) {
    throw new Error(`Fant ikke vurderingen ${id}`);
  }
  return item;
}

function openIds(): string[] {
  return [...document.querySelectorAll<HTMLElement>("[data-review-id]")].map(
    (item) => item.getAttribute("data-review-id") ?? "",
  );
}

function pastRegion(): HTMLElement {
  return screen.getByRole("region", { name: "Tidligere vurderinger" });
}

describe("ReviewPage tilgang", () => {
  it("er bare for administratorer", () => {
    for (const userId of [people.kari, people.anne]) {
      const { unmount } = open(userId);
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Du har ikke tilgang til denne siden",
        }),
        userId,
      ).toBeTruthy();
      expect(screen.queryByText("Venter på vurdering"), userId).toBe(null);
      unmount();
    }
  });
});

describe("ReviewPage åpne vurderinger", () => {
  it("lister åpne vurderinger med eldste først", () => {
    open();

    expect(
      screen.getByRole("heading", { level: 1, name: "Til vurdering" }),
    ).toBeTruthy();
    expect(openIds()).toEqual(["vurdering-2", "vurdering-1", "vurdering-3"]);
  });

  it("viser et flagget svar med type, spørsmålstittel, tekst, forfatter og alle flagg", () => {
    open();

    const item = within(reviewItem("vurdering-2"));
    expect(item.getByText("Svar")).toBeTruthy();
    expect(
      item
        .getByRole("link", {
          name: "Hvordan setter jeg opp frakt i nettbutikken?",
        })
        .getAttribute("href"),
    ).toBe("/kunnskapsbank/sporsmal/sporsmal-1");
    expect(item.getByText("Bruk en fast pris for hele landet.")).toBeTruthy();
    expect(item.getByText("Ola Dahl")).toBeTruthy();
    expect(item.getByText("Kvadraturen Kaffebrenneri")).toBeTruthy();
    const flags = within(
      item.getByRole("list", { name: "Hvem som har flagget" }),
    ).getAllByRole("listitem");
    expect(flags).toHaveLength(2);
    expect(
      within(flags[0] as HTMLElement).getByText("Kari Nordmann"),
    ).toBeTruthy();
    expect(within(flags[0] as HTMLElement).getByText("Utdatert")).toBeTruthy();
    expect(
      within(flags[0] as HTMLElement).getByText(
        formatDateTime(flagTimes.answerOutdated),
      ),
    ).toBeTruthy();
    expect(
      within(flags[1] as HTMLElement).getByText("Jonas Berg"),
    ).toBeTruthy();
    expect(within(flags[1] as HTMLElement).getByText("Feil")).toBeTruthy();
    expect(
      within(flags[1] as HTMLElement).getByText("Prisen er feil."),
    ).toBeTruthy();
    expect(
      within(flags[1] as HTMLElement).getByText(
        formatDateTime(flagTimes.answerIncorrect),
      ),
    ).toBeTruthy();
  });

  it("viser et flagget spørsmål med beskrivelsen og flagget", () => {
    open();

    const item = within(reviewItem("vurdering-1"));
    expect(item.getByText("Spørsmål")).toBeTruthy();
    expect(
      item.getByRole("link", {
        name: "Hvordan setter jeg opp frakt i nettbutikken?",
      }),
    ).toBeTruthy();
    expect(
      item.getByText("Vi trenger en enkel løsning for frakt til hele landet."),
    ).toBeTruthy();
    expect(item.getByText("Jonas Berg")).toBeTruthy();
    expect(item.getByText("Fjordlys Keramikk")).toBeTruthy();
    expect(item.getByText("Per Hansen")).toBeTruthy();
    expect(item.getByText("Spam")).toBeTruthy();
    expect(item.getByText("Dette er reklame.")).toBeTruthy();
  });

  it("beholder innlegget med Behold, kunngjør det og flytter fokus til neste vurdering", async () => {
    const user = userEvent.setup({ delay: null });
    const { store } = open();

    await user.click(
      within(reviewItem("vurdering-2")).getByRole("button", { name: "Behold" }),
    );

    const stored = store.getState().knowledgeBase;
    expect(
      stored.reviews.find((item) => item.id === "vurdering-2"),
    ).toMatchObject({
      outcome: "cleared",
      reviewedBy: people.marte,
      reviewedAt: testNow,
    });
    expect(
      stored.answers.find((item) => item.id === "svar-2")?.moderation,
    ).toBe("cleared");
    expect(await screen.findByText("Innlegget er beholdt")).toBeTruthy();
    expect(openIds()).toEqual(["vurdering-1", "vurdering-3"]);
    await waitFor(() =>
      expect(document.activeElement).toBe(reviewItem("vurdering-1")),
    );
  });

  it("ber om bekreftelse før et svar fjernes og flytter fokus til forrige vurdering når det var den siste", async () => {
    const user = userEvent.setup({ delay: null });
    const { store } = open();

    await user.click(
      within(reviewItem("vurdering-3")).getByRole("button", { name: "Fjern" }),
    );
    const cancelDialog = await screen.findByRole("alertdialog");
    await user.click(
      within(cancelDialog).getByRole("button", { name: "Avbryt" }),
    );
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBe(null));
    expect(openIds()).toHaveLength(3);

    await user.click(
      within(reviewItem("vurdering-3")).getByRole("button", { name: "Fjern" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Fjern" }));

    const stored = store.getState().knowledgeBase;
    expect(
      stored.answers.find((item) => item.id === "svar-4")?.moderation,
    ).toBe("removed");
    expect(
      stored.reviews.find((item) => item.id === "vurdering-3")?.outcome,
    ).toBe("removed");
    expect(await screen.findByText("Innlegget er fjernet")).toBeTruthy();
    expect(openIds()).toEqual(["vurdering-2", "vurdering-1"]);
    await waitFor(() =>
      expect(document.activeElement).toBe(reviewItem("vurdering-1")),
    );
  });

  it("sier at hele tråden fjernes for et spørsmål, og lukker også vurderingene av svarene i tråden", async () => {
    const user = userEvent.setup({ delay: null });
    const { store } = open();

    await user.click(
      within(reviewItem("vurdering-1")).getByRole("button", { name: "Fjern" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByText("Hele tråden blir fjernet, med alle svarene."),
    ).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "Fjern" }));

    expect(
      store
        .getState()
        .knowledgeBase.questions.find((item) => item.id === "sporsmal-1")
        ?.moderation,
    ).toBe("removed");
    expect(await screen.findByText("Innlegget er fjernet")).toBeTruthy();
    expect(openIds()).toEqual(["vurdering-3"]);
    await waitFor(() =>
      expect(document.activeElement).toBe(reviewItem("vurdering-3")),
    );
  });

  it("flytter fokus til overskriften og viser tom tilstand når den siste vurderingen er gjort", async () => {
    const user = userEvent.setup({ delay: null });
    open();

    for (const id of ["vurdering-2", "vurdering-1", "vurdering-3"]) {
      await user.click(
        within(reviewItem(id)).getByRole("button", { name: "Behold" }),
      );
    }

    expect(
      await screen.findByText("Ingenting venter på vurdering."),
    ).toBeTruthy();
    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Venter på vurdering",
    });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it("viser tom tilstand når ingenting venter", () => {
    open(people.marte, withoutOpenReviews());

    expect(screen.getByText("Ingenting venter på vurdering.")).toBeTruthy();
    expect(openIds()).toEqual([]);
  });
});

describe("ReviewPage tidligere vurderinger", () => {
  it("viser de ti nyeste avsluttede vurderingene med utfall, administrator og tid, nyeste først", () => {
    open(people.marte, withHistory(11));

    const items = within(pastRegion()).getAllByRole("listitem");
    expect(items).toHaveLength(10);
    const newest = within(items[0] as HTMLElement);
    expect(newest.getByText("Beholdt")).toBeTruthy();
    expect(newest.getByText("Marte Vik")).toBeTruthy();
    expect(newest.getByText(formatDateTime(day(11)))).toBeTruthy();
    expect(
      newest.getByRole("link", {
        name: "Hvordan setter jeg opp frakt i nettbutikken?",
      }),
    ).toBeTruthy();
    const second = within(items[1] as HTMLElement);
    expect(second.getByText("Fjernet")).toBeTruthy();
    expect(second.getByText(formatDateTime(day(10)))).toBeTruthy();
    const last = within(items[9] as HTMLElement);
    expect(last.getByText(formatDateTime(day(2)))).toBeTruthy();
    expect(within(pastRegion()).queryByText(formatDateTime(day(1)))).toBe(null);
  });

  it("legger en ny avgjørelse øverst blant de tidligere vurderingene", async () => {
    const user = userEvent.setup({ delay: null });
    open();

    await user.click(
      within(reviewItem("vurdering-2")).getByRole("button", { name: "Behold" }),
    );

    const first = within(
      within(pastRegion()).getAllByRole("listitem")[0] as HTMLElement,
    );
    expect(first.getByText("Beholdt")).toBeTruthy();
    expect(first.getByText(formatDateTime(testNow))).toBeTruthy();
  });

  it("utelater avsnittet når ingen vurderinger er avsluttet", () => {
    open(people.marte, moderationState());

    expect(
      screen.queryByRole("heading", { name: "Tidligere vurderinger" }),
    ).toBe(null);
  });
});

describe("ReviewPage tilgjengelighet", () => {
  it("har ingen tilgjengelighetsfeil med og uten åpne vurderinger", async () => {
    const full = open(people.marte, withHistory(3));
    expect(await axe(full.container)).toHaveNoViolations();
    full.unmount();

    const empty = open(people.marte, withoutOpenReviews());
    expect(await axe(empty.container)).toHaveNoViolations();
  });
});
