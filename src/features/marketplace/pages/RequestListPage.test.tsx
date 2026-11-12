import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { RequestListPage } from "./RequestListPage";
import { renderPage } from "./renderPage";

function open(userId: string, layout: "desktop" | "mobile" = "desktop") {
  return renderPage(<RequestListPage />, {
    path: "oppdrag",
    route: "/oppdrag",
    userId,
    layout,
  });
}

const ownTitles = [
  "Innhold og sosiale medier til julesalget",
  "Oppdatere nettsiden med nye produkter",
];

describe("RequestListPage for eiere", () => {
  it("viser bare oppdragene til egen bedrift", () => {
    open("person-1");

    expect(
      screen.getByRole("heading", { level: 1, name: "Oppdrag" }),
    ).toBeTruthy();
    for (const title of ownTitles) {
      expect(screen.getByRole("link", { name: title })).toBeTruthy();
    }
    expect(
      screen.queryByRole("link", { name: "Regnskap og bilag før årsslutt" }),
    ).toBe(null);
  });

  it("viser tittel, bedrift, status, ønsket start, varighet og ferdigheter i en tabell på skrivebord", () => {
    open("person-1");

    const table = screen.getByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual([
      "Oppdrag",
      "Bedrift",
      "Status",
      "Ønsket start",
      "Varighet",
      "Ferdigheter",
    ]);
    const row = within(table)
      .getAllByRole("row")
      .find((item) =>
        within(item).queryByText("Innhold og sosiale medier til julesalget"),
      ) as HTMLElement;
    expect(within(row).getByText("Fjordlys Keramikk")).toBeTruthy();
    expect(within(row).getByText("Kortliste klar")).toBeTruthy();
    expect(within(row).getByText("10. desember 2026")).toBeTruthy();
    expect(within(row).getByText("8 uker")).toBeTruthy();
    expect(within(row).getByText("Sosiale medier")).toBeTruthy();
    expect(within(row).getByText("Innholdsproduksjon")).toBeTruthy();
    expect(
      within(row)
        .getByRole("link", { name: "Innhold og sosiale medier til julesalget" })
        .getAttribute("href"),
    ).toBe("/oppdrag/oppdrag-4");
  });

  it("har en Nytt oppdrag-knapp som går til skjemaet", async () => {
    const user = userEvent.setup();
    const { router } = open("person-1");

    await user.click(screen.getByRole("button", { name: "Nytt oppdrag" }));

    expect(router.state.location.pathname).toBe("/oppdrag/ny");
  });

  it("viser oppdragene som kort på mobil", () => {
    open("person-1", "mobile");

    expect(screen.queryByRole("table")).toBe(null);
    for (const title of ownTitles) {
      expect(
        screen.getByRole("heading", { level: 2, name: title }),
      ).toBeTruthy();
    }
    expect(screen.getAllByText("Fjordlys Keramikk")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Nytt oppdrag" })).toBeTruthy();
    expect(
      screen
        .getByRole("link", {
          name: /Se oppdraget.*Innhold og sosiale medier til julesalget/,
        })
        .getAttribute("href"),
    ).toBe("/oppdrag/oppdrag-4");
  });
});

describe("RequestListPage for administratorer", () => {
  it("viser alle oppdrag med Til vurdering først, men ingen Nytt oppdrag-knapp", () => {
    open("person-15");

    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows).toHaveLength(11);
    expect(rows[1]?.textContent).toContain(
      "Markedsføring av vinterkolleksjonen",
    );
    expect(rows[1]?.textContent).toContain("Til vurdering");
    expect(screen.queryByRole("button", { name: "Nytt oppdrag" })).toBe(null);
  });

  it("filtrerer på status", async () => {
    const user = userEvent.setup();
    open("person-15");

    await user.click(screen.getByRole("button", { name: /Vis status/ }));
    await user.click(await screen.findByRole("option", { name: "Avtalt" }));

    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows).toHaveLength(2);
    expect(rows[1]?.textContent).toContain(
      "Hjelp med pakking og sending før jul",
    );
  });

  it("legger filteret i en utvidbar del på mobil", async () => {
    const user = userEvent.setup();
    open("person-15", "mobile");

    expect(screen.queryByRole("button", { name: /Vis status/ })).toBe(null);
    await user.click(screen.getByRole("button", { name: "Filtrer oppdrag" }));
    await user.click(screen.getByRole("button", { name: /Vis status/ }));
    await user.click(await screen.findByRole("option", { name: "Åpen" }));

    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((item) => item.textContent),
    ).toEqual(["Oversette produktbeskrivelser til engelsk"]);
  });
});

describe("RequestListPage for andre", () => {
  it("forklarer at delen er for eiere og arbeidssøkere", () => {
    open("person-2");

    expect(
      screen.getByText(
        "Denne delen er for bedriftseiere og folk som søker oppdrag.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("table")).toBe(null);
    expect(screen.queryByRole("button", { name: "Nytt oppdrag" })).toBe(null);
  });

  it("viser en arbeidssøker med profil de åpne oppdragene og endrer seg når brukeren byttes", () => {
    const { store } = open("person-8");
    expect(
      screen.getByRole("link", {
        name: "Oversette produktbeskrivelser til engelsk",
      }),
    ).toBeTruthy();

    act(() => store.selectUser("person-2"));
    expect(
      screen.getByText(
        "Denne delen er for bedriftseiere og folk som søker oppdrag.",
      ),
    ).toBeTruthy();
  });
});

describe("RequestListPage for arbeidssøkere", () => {
  it("viser alle åpne oppdrag", () => {
    open("person-8");

    expect(
      screen.getByRole("heading", { level: 1, name: "Oppdrag" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", {
        name: "Oversette produktbeskrivelser til engelsk",
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("link", { name: "Regnskap og bilag før årsslutt" }),
    ).toBe(null);
  });

  it("viser oppdragene arbeidssøkeren er med i under Dine oppdrag", () => {
    open("person-8");

    const mine = screen.getByRole("region", { name: "Dine oppdrag" });
    for (const title of [
      "Innhold og sosiale medier til julesalget",
      "Lansere ny nettbutikk med kampanje",
      "Oppdatere nettsiden med nye produkter",
    ]) {
      expect(within(mine).getByRole("link", { name: title })).toBeTruthy();
    }
    expect(
      within(mine).queryByRole("link", {
        name: "Oversette produktbeskrivelser til engelsk",
      }),
    ).toBe(null);
  });

  it("viser ikke oppdrag der arbeidssøkeren er tatt av kortlisten", () => {
    open("person-8");

    for (const title of [
      "Markedsføring av vinterkolleksjonen",
      "Nyhetsbrev med fin design til kaffeabonnentene",
    ]) {
      expect(screen.queryByRole("link", { name: title })).toBe(null);
    }
  });

  it("viser oppdraget arbeidssøkeren har avtalt under Dine oppdrag", () => {
    open("person-12");

    const mine = screen.getByRole("region", { name: "Dine oppdrag" });
    expect(
      within(mine).getByRole("link", {
        name: "Hjelp med pakking og sending før jul",
      }),
    ).toBeTruthy();
  });

  it("forklarer at en ikke kan søke direkte, og har ingen søkeknapp", () => {
    open("person-9");

    expect(
      screen.getByText("Du kan ikke søke direkte; vi matcher deg automatisk"),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /søk/i })).toBe(null);
    expect(screen.queryByRole("button", { name: "Nytt oppdrag" })).toBe(null);
  });

  it("viser åpne oppdrag og Dine oppdrag som kort på mobil", () => {
    open("person-8", "mobile");

    expect(screen.queryByRole("table")).toBe(null);
    expect(screen.getByRole("region", { name: "Dine oppdrag" })).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Oversette produktbeskrivelser til engelsk",
      }),
    ).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = open("person-8");

    expect(await axe(container)).toHaveNoViolations();
  });

  it("har ingen tilgjengelighetsfeil på mobil", async () => {
    const { container } = open("person-8", "mobile");

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("RequestListPage tilgjengelighet", () => {
  it("har ingen tilgjengelighetsfeil for eier på skrivebord", async () => {
    const { container } = open("person-1");

    expect(await axe(container)).toHaveNoViolations();
  });

  it("har ingen tilgjengelighetsfeil for administrator på skrivebord", async () => {
    const { container } = open("person-15");

    expect(await axe(container)).toHaveNoViolations();
  });

  it("har ingen tilgjengelighetsfeil på mobil", async () => {
    const { container } = open("person-1", "mobile");

    expect(await axe(container)).toHaveNoViolations();
  });

  it("har ingen tilgjengelighetsfeil for andre", async () => {
    const { container } = open("person-2");

    expect(await axe(container)).toHaveNoViolations();
  });
});
