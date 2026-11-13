import { screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { features } from "../../app/features";
import { renderFrame } from "../test-utils";
import { Header } from "./Header";

function mainNavigation() {
  return screen.getByRole("navigation", { name: "Hovedmeny" });
}

describe("Header på skrivebord", () => {
  it("viser Varodd som lenke til forsiden", () => {
    renderFrame(<Header />);

    const brand = screen.getByRole("link", { name: "Varodd" });
    expect(brand.getAttribute("href")).toBe("/");
  });

  it("har Hjem og én knapp per funksjon i registerets rekkefølge", () => {
    renderFrame(<Header />);

    const names = within(mainNavigation())
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(names).toEqual([
      "Hjem",
      ...features.map((feature) => feature.label),
    ]);
  });

  it("markerer gjeldende side med aria-current", () => {
    const { unmount } = renderFrame(<Header />, { route: "/" });
    const nav = within(mainNavigation());
    expect(
      nav.getByRole("link", { name: "Hjem" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      nav.getByRole("link", { name: "Oppdrag" }).getAttribute("aria-current"),
    ).toBe(null);
    unmount();

    renderFrame(<Header />, { route: "/oppdrag/ny" });
    const onFeature = within(mainNavigation());
    expect(
      onFeature
        .getByRole("link", { name: "Oppdrag" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      onFeature
        .getByRole("link", { name: "Hjem" })
        .getAttribute("aria-current"),
    ).toBe(null);
  });

  it("har brukerbytte og Tilbakestill demo i linjen", () => {
    renderFrame(<Header />);

    expect(screen.getByRole("button", { name: /Bytt bruker/ })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Tilbakestill demo" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Meny" })).toBe(null);
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = renderFrame(<Header />);

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("Header på mobil", () => {
  it("viser bare Varodd og Meny i linjen", () => {
    renderFrame(<Header />, { layout: "mobile" });

    expect(screen.getByRole("link", { name: "Varodd" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Meny" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Hjem" })).toBe(null);
    expect(screen.queryByRole("link", { name: "Oppdrag" })).toBe(null);
    expect(screen.queryByRole("button", { name: /Bytt bruker/ })).toBe(null);
    expect(screen.queryByRole("button", { name: "Tilbakestill demo" })).toBe(
      null,
    );
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = renderFrame(<Header />, { layout: "mobile" });

    expect(await axe(container)).toHaveNoViolations();
  });
});
