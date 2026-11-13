import { act, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import {
  createTestStore,
  renderFrame,
  testSeedState,
} from "../../../frame/test-utils";
import { FeatureSubNav } from "./FeatureSubNav";

function open(userId: string, route = "/oppdrag") {
  const store = createTestStore({ state: testSeedState(), userId });
  return renderFrame(<FeatureSubNav />, { store, route });
}

function linkTexts(): (string | null)[] {
  return screen.getAllByRole("link").map((link) => link.textContent);
}

describe("FeatureSubNav", () => {
  it("viser Min profil til en som søker arbeid", () => {
    open("person-8");

    expect(
      screen.getByRole("link", { name: "Min profil" }).getAttribute("href"),
    ).toBe("/profil");
    expect(linkTexts()).toEqual(["Min profil"]);
  });

  it("viser Min bedrift til en eier", () => {
    open("person-1");

    expect(
      screen.getByRole("link", { name: "Min bedrift" }).getAttribute("href"),
    ).toBe("/bedrift");
    expect(linkTexts()).toEqual(["Min bedrift"]);
  });

  it("viser Varodd-verktøy til en administrator", () => {
    open("person-15");

    expect(
      screen.getByRole("link", { name: "Varodd-verktøy" }).getAttribute("href"),
    ).toBe("/admin");
    expect(linkTexts()).toEqual(["Varodd-verktøy"]);
  });

  it("viser en lenke per rolle når personen har flere", () => {
    const state = testSeedState();
    const store = createTestStore({
      state: {
        ...state,
        frame: {
          ...state.frame,
          people: state.frame.people.map((person) =>
            person.id === "person-1"
              ? { ...person, seeksWork: true, isVaroddAdmin: true }
              : person,
          ),
        },
      },
      userId: "person-1",
    });
    renderFrame(<FeatureSubNav />, { store });

    expect(linkTexts()).toEqual([
      "Min profil",
      "Min bedrift",
      "Varodd-verktøy",
    ]);
  });

  it("viser ingen lenker og ingen tom navigasjon til en ansatt uten andre roller", () => {
    open("person-2");

    expect(screen.queryByRole("link")).toBe(null);
    expect(screen.queryByRole("navigation")).toBe(null);
  });

  it("markerer lenken til gjeldende side med aria-current", () => {
    open("person-15", "/admin");

    expect(
      screen
        .getByRole("link", { name: "Varodd-verktøy" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  it("markerer ikke lenker til andre sider", () => {
    open("person-15", "/oppdrag");

    expect(
      screen
        .getByRole("link", { name: "Varodd-verktøy" })
        .getAttribute("aria-current"),
    ).toBe(null);
  });

  it("endrer lenkene når valgt bruker byttes", () => {
    const { store } = open("person-8");
    expect(linkTexts()).toEqual(["Min profil"]);

    act(() => store.selectUser("person-15"));
    expect(linkTexts()).toEqual(["Varodd-verktøy"]);

    act(() => store.selectUser("person-2"));
    expect(screen.queryByRole("navigation")).toBe(null);
  });

  it("er en navigasjon med navn", () => {
    open("person-1");

    const navigation = screen.getByRole("navigation", { name: "I Oppdrag" });
    expect(within(navigation).getAllByRole("link")).toHaveLength(1);
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = open("person-1");

    expect(await axe(container)).toHaveNoViolations();
  });
});
