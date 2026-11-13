import { screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { features } from "../../app/features";
import { createTestStore, renderFrame, testSeedState } from "../test-utils";
import { HomePage } from "./HomePage";

const seed = testSeedState();

describe("HomePage", () => {
  it("hilser personen med fornavn i h1", () => {
    renderFrame(<HomePage />, {
      store: createTestStore({ userId: "person-1" }),
    });

    expect(
      screen.getByRole("heading", { level: 1, name: "Hei, Kari!" }),
    ).toBeTruthy();
  });

  it("viser ett kort per funksjon med tittel, tekst og én handling", () => {
    const person = seed.frame.people.find(
      (candidate) => candidate.id === "person-1",
    );
    if (person === undefined) {
      throw new Error("Mangler person-1 i seed-dataene");
    }
    renderFrame(<HomePage />, {
      store: createTestStore({ userId: "person-1" }),
    });

    const cards = features
      .map((feature) => feature.homeCard(person, seed))
      .filter((card) => card !== null);
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(screen.getByRole("heading", { name: card.title })).toBeTruthy();
      expect(screen.getByText(card.text)).toBeTruthy();
      const action = screen.getByRole("link", { name: card.actionLabel });
      expect(action.getAttribute("href")).toBe(card.route);
    }
  });

  it("viser aktivitetsstrømmen", () => {
    renderFrame(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Siste aktivitet" }),
    ).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = renderFrame(<HomePage />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
