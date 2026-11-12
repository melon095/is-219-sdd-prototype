import { screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { renderFrame } from "../test-utils";
import { NoAccessPage } from "./NoAccessPage";

describe("NoAccessPage", () => {
  it("forklarer vennlig og lenker til forsiden", () => {
    renderFrame(<NoAccessPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Du har ikke tilgang til denne siden",
      }),
    ).toBeTruthy();
    expect(screen.getByText(/Prøv å bytte bruker/)).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Gå til forsiden" })
        .getAttribute("href"),
    ).toBe("/");
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = renderFrame(<NoAccessPage />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
