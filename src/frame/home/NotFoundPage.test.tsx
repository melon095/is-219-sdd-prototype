import { screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { renderFrame } from "../test-utils";
import { NotFoundPage } from "./NotFoundPage";

describe("NotFoundPage", () => {
  it("viser Siden finnes ikke og en lenke til forsiden", () => {
    renderFrame(<NotFoundPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Siden finnes ikke" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Gå til forsiden" })
        .getAttribute("href"),
    ).toBe("/");
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = renderFrame(<NotFoundPage />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
