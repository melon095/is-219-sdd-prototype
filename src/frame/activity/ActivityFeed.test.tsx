import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import type { ActivityEntry, DemoState } from "../../domain/frame/types";
import {
  createTestStore,
  renderFrame,
  testNow,
  testSeedState,
} from "../test-utils";
import { ActivityFeed } from "./ActivityFeed";

function minutesBefore(minutes: number): string {
  return new Date(Date.parse(testNow) - minutes * 60_000).toISOString();
}

function entry(
  id: string,
  minutes: number,
  text: string,
  personIds: string[],
  route = "/oppdrag/oppdrag-1",
): ActivityEntry {
  return {
    id,
    at: minutesBefore(minutes),
    featureId: "marketplace",
    actor: "system",
    text,
    target: { route },
    audience: { personIds, groups: [] },
  };
}

function stateWith(activity: ActivityEntry[]): DemoState {
  const seed = testSeedState();
  return { ...seed, frame: { ...seed.frame, activity } };
}

function renderFeed(state: DemoState, userId: string) {
  return renderFrame(<ActivityFeed now={testNow} />, {
    store: createTestStore({ state, userId }),
  });
}

describe("ActivityFeed", () => {
  const fixture = [
    entry("a-1", 1440, "Eldre hendelse for Kari", ["person-1"]),
    entry("a-2", 5, "Nytt oppdrag fra Kari", ["person-1", "person-8"]),
    entry("a-3", 60, "Ny melding mellom Kari og Mats", [
      "person-1",
      "person-8",
    ]),
  ];

  it("viser bare oppføringer personen har lov til å se", () => {
    renderFeed(stateWith(fixture), "person-9");

    expect(screen.queryByRole("link")).toBe(null);
    expect(screen.getByText("Ingenting har skjedd ennå")).toBeTruthy();
  });

  it("viser alt for en administrator", () => {
    renderFeed(stateWith(fixture), "person-15");

    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("viser nyeste først", () => {
    renderFeed(stateWith(fixture), "person-1");

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      expect.stringContaining("Nytt oppdrag fra Kari"),
      expect.stringContaining("Ny melding mellom Kari og Mats"),
      expect.stringContaining("Eldre hendelse for Kari"),
    ]);
  });

  it("viser hver oppføring som lenke med tekst, funksjon og relativ tid", () => {
    renderFeed(stateWith(fixture), "person-1");

    const link = screen.getAllByRole("link")[0] as HTMLElement;
    expect(link.getAttribute("href")).toBe("/oppdrag/oppdrag-1");
    expect(link.textContent).toContain("Nytt oppdrag fra Kari");
    expect(link.textContent).toContain("Oppdrag");
    const time = link.querySelector("time");
    expect(time?.getAttribute("datetime")).toBe(minutesBefore(5));
    expect(time?.textContent).toBe("for 5 minutter siden");
  });

  it("viser 20 om gangen og flere med Vis flere", async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 45 }, (_, index) =>
      entry(`m-${index}`, index + 1, `Hendelse ${index + 1}`, ["person-1"]),
    );
    renderFeed(stateWith(many), "person-1");

    expect(screen.getAllByRole("link")).toHaveLength(20);
    await user.click(screen.getByRole("button", { name: "Vis flere" }));
    expect(screen.getAllByRole("link")).toHaveLength(40);
    await user.click(screen.getByRole("button", { name: "Vis flere" }));
    expect(screen.getAllByRole("link")).toHaveLength(45);
    expect(screen.queryByRole("button", { name: "Vis flere" })).toBe(null);
  });

  it("viser ikke Vis flere når alt allerede vises", () => {
    renderFeed(stateWith(fixture), "person-1");

    expect(screen.queryByRole("button", { name: "Vis flere" })).toBe(null);
  });

  it("viser en tom tilstand når det ikke har skjedd noe", () => {
    renderFeed(stateWith([]), "person-1");

    const empty = screen.getByText("Ingenting har skjedd ennå");
    expect(empty).toBeTruthy();
    expect(
      within(empty.closest("div") as HTMLElement).queryByRole("link"),
    ).toBe(null);
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = renderFeed(stateWith(fixture), "person-1");

    expect(await axe(container)).toHaveNoViolations();
  });
});
