import { act, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createTestStore, renderFrame } from "../test-utils";
import { RequireAccess } from "./RequireAccess";

function onlyKari(person: { id: string }) {
  return person.id === "person-1";
}

describe("RequireAccess", () => {
  it("viser innholdet når personen har tilgang", () => {
    renderFrame(
      <RequireAccess allowed={onlyKari}>
        <p>Hemmelig innhold</p>
      </RequireAccess>,
      { store: createTestStore({ userId: "person-1" }) },
    );

    expect(screen.getByText("Hemmelig innhold")).toBeTruthy();
  });

  it("viser siden om manglende tilgang når personen ikke har tilgang", () => {
    renderFrame(
      <RequireAccess allowed={onlyKari}>
        <p>Hemmelig innhold</p>
      </RequireAccess>,
      { store: createTestStore({ userId: "person-8" }) },
    );

    expect(screen.queryByText("Hemmelig innhold")).toBe(null);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Du har ikke tilgang til denne siden",
      }),
    ).toBeTruthy();
  });

  it("sjekker på nytt når valgt bruker byttes", () => {
    const { store } = renderFrame(
      <RequireAccess allowed={onlyKari}>
        <p>Hemmelig innhold</p>
      </RequireAccess>,
      { store: createTestStore({ userId: "person-1" }) },
    );
    expect(screen.getByText("Hemmelig innhold")).toBeTruthy();

    act(() => store.selectUser("person-8"));
    expect(screen.queryByText("Hemmelig innhold")).toBe(null);
    expect(
      screen.getByText("Du har ikke tilgang til denne siden"),
    ).toBeTruthy();

    act(() => store.selectUser("person-1"));
    expect(screen.getByText("Hemmelig innhold")).toBeTruthy();
  });
});
