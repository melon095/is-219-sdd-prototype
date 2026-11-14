import { act, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { kbState, review } from "../../../domain/knowledge-base/testState";
import { createTestStore, renderFrame } from "../../../frame/test-utils";
import { KnowledgeBaseLayout } from "./KnowledgeBaseLayout";

const reviews = [
  review("vurdering-1", "answer", "svar-1", ["flagg-1"]),
  review("vurdering-2", "answer", "svar-2", ["flagg-2"]),
  review("vurdering-3", "answer", "svar-3", ["flagg-3"], {
    outcome: "cleared",
    reviewedBy: "person-15",
    reviewedAt: "2026-11-12T09:00:00+01:00",
  }),
];

function open(userId: string, withReviews = true) {
  const store = createTestStore({
    state: kbState(withReviews ? { reviews } : {}),
    userId,
  });
  return renderFrame(<div hidden />, {
    store,
    route: "/kunnskapsbank",
    pages: [
      {
        element: <KnowledgeBaseLayout />,
        children: [
          { path: "kunnskapsbank", element: <p>Innhold i kunnskapsbanken</p> },
        ],
      },
    ],
  });
}

function linkTexts(): (string | null)[] {
  return screen.getAllByRole("link").map((link) => link.textContent);
}

describe("KnowledgeBaseLayout", () => {
  it("viser forklaringen og ikke innholdet til en som ikke er medlem", () => {
    open("person-4");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Kunnskapsbanken er for E-Waves-medlemmer",
      }),
    ).toBeTruthy();
    expect(screen.queryByText("Innhold i kunnskapsbanken")).toBe(null);
    expect(screen.queryByRole("navigation")).toBe(null);
  });

  it("viser Forum og Spør chatboten og innholdet til et medlem", () => {
    open("person-1");

    const navigation = screen.getByRole("navigation", {
      name: "I Kunnskapsbank",
    });
    const links = within(navigation).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Forum",
      "Spør chatboten",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/kunnskapsbank",
      "/kunnskapsbank/chatbot",
    ]);
    expect(screen.getByText("Innhold i kunnskapsbanken")).toBeTruthy();
    expect(
      screen.queryByRole("heading", {
        name: "Kunnskapsbanken er for E-Waves-medlemmer",
      }),
    ).toBe(null);
  });

  it("viser Til vurdering med antall åpne vurderinger til en administrator", () => {
    open("person-15");

    const link = screen.getByRole("link", { name: "Til vurdering 2" });
    expect(link.getAttribute("href")).toBe("/kunnskapsbank/vurdering");
    expect(link.textContent).toBe("Til vurdering 2");
    expect(linkTexts()).toEqual(["Forum", "Spør chatboten", "Til vurdering 2"]);
    expect(screen.getByText("Innhold i kunnskapsbanken")).toBeTruthy();
  });

  it("viser 0 når ingen vurderinger er åpne", () => {
    open("person-15", false);

    expect(screen.getByRole("link", { name: "Til vurdering 0" })).toBeTruthy();
  });

  it("viser ikke Til vurdering til et medlem", () => {
    open("person-1");

    expect(screen.queryByRole("link", { name: /Til vurdering/ })).toBe(null);
  });

  it("sjekker tilgangen på nytt når brukeren byttes", () => {
    const { store } = open("person-1");
    expect(screen.getByText("Innhold i kunnskapsbanken")).toBeTruthy();

    act(() => store.selectUser("person-4"));
    expect(screen.queryByText("Innhold i kunnskapsbanken")).toBe(null);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Kunnskapsbanken er for E-Waves-medlemmer",
      }),
    ).toBeTruthy();

    act(() => store.selectUser("person-15"));
    expect(screen.getByText("Innhold i kunnskapsbanken")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Til vurdering 2" })).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil for medlem, administrator og andre", async () => {
    for (const userId of ["person-1", "person-15", "person-4"]) {
      const { container, unmount } = open(userId);
      expect(await axe(container), userId).toHaveNoViolations();
      unmount();
    }
  });
});
