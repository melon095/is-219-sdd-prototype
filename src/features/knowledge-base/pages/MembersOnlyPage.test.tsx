import { screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { renderFrame } from "../../../frame/test-utils";
import { MembersOnlyPage } from "./MembersOnlyPage";

describe("MembersOnlyPage", () => {
  it("forklarer at kunnskapsbanken er for E-Waves-medlemmer", () => {
    renderFrame(<MembersOnlyPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Kunnskapsbanken er for E-Waves-medlemmer",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Kunnskapsbanken er et medlemsgode for bedrifter i E-Waves, et nettverk av nettbutikker. Her hjelper bedriftene hverandre med spørsmål og svar.",
      ),
    ).toBeTruthy();
  });

  it("lenker til forsiden", () => {
    renderFrame(<MembersOnlyPage />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute("href")).toBe("/");
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = renderFrame(<MembersOnlyPage />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
