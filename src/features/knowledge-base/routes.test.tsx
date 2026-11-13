import { screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { seedState } from "../../domain/knowledge-base/testState";
import { createTestStore, renderFrame } from "../../frame/test-utils";
import { knowledgeBaseFeature } from "./feature";

function open(userId: string, route = "/kunnskapsbank") {
  const store = createTestStore({ state: seedState(), userId });
  return renderFrame(<div hidden />, {
    store,
    route,
    pages: knowledgeBaseFeature.routes,
  });
}

describe("rutene til kunnskapsbanken", () => {
  it("viser forumet til Kari", () => {
    open("person-1");

    expect(
      screen.getByRole("heading", { level: 1, name: "Kunnskapsbank" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("navigation", { name: "I Kunnskapsbank" }),
    ).toBeTruthy();
  });

  it("viser forklaringen for medlemmer til Anne", () => {
    open("person-4");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Kunnskapsbanken er for E-Waves-medlemmer",
      }),
    ).toBeTruthy();
    expect(screen.queryByRole("navigation")).toBe(null);
  });

  it("har en plassholder for chatboten og vurderingen", () => {
    open("person-15", "/kunnskapsbank/chatbot");
    expect(
      screen.getByRole("heading", { level: 1, name: "Spør chatboten" }),
    ).toBeTruthy();
  });

  it("viser vurderingssiden til administratoren", () => {
    open("person-15", "/kunnskapsbank/vurdering");
    expect(
      screen.getByRole("heading", { level: 1, name: "Til vurdering" }),
    ).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil for Kari og Anne", async () => {
    for (const userId of ["person-1", "person-4"]) {
      const { container, unmount } = open(userId);
      expect(await axe(container), userId).toHaveNoViolations();
      unmount();
    }
  });
});
