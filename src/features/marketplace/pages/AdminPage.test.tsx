import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { AdminPage } from "./AdminPage";
import { renderPage } from "./renderPage";

function open(userId: string) {
  return renderPage(<AdminPage />, { path: "admin", route: "/admin", userId });
}

describe("AdminPage", () => {
  it("er bare for administratorer", () => {
    open("person-1");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Du har ikke tilgang til denne siden",
      }),
    ).toBeTruthy();
    expect(screen.queryByText("Til vurdering")).toBe(null);
  });

  it("viser oppdrag til vurdering med begrunnelse, lenke og handlinger", () => {
    open("person-15");

    expect(
      screen.getByRole("heading", { level: 1, name: "Varodd-verktøy" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "Til vurdering" }),
    ).toBeTruthy();
    const item = screen
      .getAllByRole("listitem")
      .find((candidate) =>
        within(candidate).queryByText("Markedsføring av vinterkolleksjonen"),
      ) as HTMLElement;
    expect(
      within(item)
        .getByRole("link", { name: "Markedsføring av vinterkolleksjonen" })
        .getAttribute("href"),
    ).toBe("/oppdrag/oppdrag-1");
    expect(
      within(item).getByText(/Ingen av dem har erfaring med strikk og mote/),
    ).toBeTruthy();
    expect(within(item).getByText(/Lindesnes Ullvarer/)).toBeTruthy();
    expect(
      within(item).getByRole("button", { name: "Gjør åpen igjen" }),
    ).toBeTruthy();
    expect(within(item).getByRole("button", { name: "Avlys" })).toBeTruthy();
  });

  it("åpner oppdraget igjen og fjerner det fra listen", async () => {
    const user = userEvent.setup();
    const { store } = open("person-15");

    await user.click(screen.getByRole("button", { name: "Gjør åpen igjen" }));

    expect(
      await screen.findByText("Ingen oppdrag venter på vurdering"),
    ).toBeTruthy();
    const request = store
      .getState()
      .marketplace.requests.find((item) => item.id === "oppdrag-1");
    expect(request?.status).not.toBe("under-review");
  });

  it("ber om en begrunnelse før oppdraget avlyses", async () => {
    const user = userEvent.setup();
    open("person-15");

    await user.click(screen.getByRole("button", { name: "Avlys" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByRole("textbox", {
        name: "Hvorfor avlyses oppdraget?",
      }),
    ).toBeTruthy();
    expect(
      within(dialog)
        .getByRole("button", { name: "Avlys oppdraget" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = open("person-15");

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("AdminPage Simulert NAV-henvisning", () => {
  function itemFor(name: string): HTMLElement {
    const section = screen.getByRole("region", {
      name: "Simulert NAV-henvisning",
    });
    const found = within(section)
      .getAllByRole("listitem")
      .find((candidate) => within(candidate).queryByText(name) !== null);
    if (found === undefined) {
      throw new Error(`Fant ikke ${name} i NAV-listen`);
    }
    return found;
  }

  it("lister alle som søker oppdrag uten profil, med knapp og Simulert-merke", () => {
    open("person-15");

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Simulert NAV-henvisning",
      }),
    ).toBeTruthy();
    const section = screen.getByRole("region", {
      name: "Simulert NAV-henvisning",
    });
    expect(
      within(section)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      expect.stringContaining("Thea Bakke"),
      expect.stringContaining("Sander Haugen"),
    ]);
    for (const name of ["Thea Bakke", "Sander Haugen"]) {
      const item = itemFor(name);
      expect(
        within(item).getByRole("button", {
          name: "Henvis fra NAV (simulert)",
        }),
      ).toBeTruthy();
      expect(within(item).getByText("Simulert")).toBeTruthy();
    }
  });

  it("henviser personen og fjerner dem fra listen", async () => {
    const user = userEvent.setup();
    const { store } = open("person-15");

    await user.click(
      within(itemFor("Sander Haugen")).getByRole("button", {
        name: "Henvis fra NAV (simulert)",
      }),
    );

    const section = screen.getByRole("region", {
      name: "Simulert NAV-henvisning",
    });
    expect(within(section).queryByText("Sander Haugen")).toBe(null);
    expect(within(section).getByText("Thea Bakke")).toBeTruthy();
    const draft = store
      .getState()
      .marketplace.workerProfiles.find((item) => item.personId === "person-14");
    expect(draft).toMatchObject({ isDraft: true, skillIds: [] });
    expect(draft?.navReferral?.simulated).toBe(true);
  });

  it("viser en melding når alle har en profil", async () => {
    const user = userEvent.setup();
    open("person-15");

    for (const name of ["Thea Bakke", "Sander Haugen"]) {
      await user.click(
        within(itemFor(name)).getByRole("button", {
          name: "Henvis fra NAV (simulert)",
        }),
      );
    }

    expect(
      await screen.findByText("Alle som søker oppdrag har allerede en profil"),
    ).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = open("person-15");

    expect(await axe(container)).toHaveNoViolations();
  });
});
