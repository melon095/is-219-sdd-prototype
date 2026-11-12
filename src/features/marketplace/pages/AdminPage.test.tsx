import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { testSeedState } from "../../../frame/test-utils";
import { formatDateTime } from "../format";
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

describe("AdminPage Simulert gjennomgang av nettsider", () => {
  const older = "2026-11-02T10:00:00+01:00";
  const newer = "2026-11-09T10:00:00+01:00";

  function stateWithRuns() {
    const state = testSeedState();
    return {
      ...state,
      marketplace: {
        ...state.marketplace,
        crawlRuns: [
          {
            id: "gjennomgang-1",
            at: older,
            by: "person-15",
            crawledBusinessIds: ["bedrift-1"],
            skippedBusinessIds: ["bedrift-2", "bedrift-3"],
            simulated: true as const,
          },
          {
            id: "gjennomgang-2",
            at: newer,
            by: "person-15",
            crawledBusinessIds: ["bedrift-1", "bedrift-3"],
            skippedBusinessIds: ["bedrift-2"],
            simulated: true as const,
          },
        ],
      },
    };
  }

  function section() {
    return screen.getByRole("region", {
      name: "Simulert gjennomgang av nettsider",
    });
  }

  it("har en knapp med Simulert-merke", () => {
    open("person-15");

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Simulert gjennomgang av nettsider",
      }),
    ).toBeTruthy();
    expect(
      within(section()).getByRole("button", {
        name: "Kjør simulert gjennomgang",
      }),
    ).toBeTruthy();
    expect(within(section()).getAllByText("Simulert").length).toBeGreaterThan(
      0,
    );
  });

  it("lister tidligere kjøringer med nyeste først, tid og navn", () => {
    renderPage(<AdminPage />, {
      path: "admin",
      route: "/admin",
      userId: "person-15",
      state: stateWithRuns(),
    });

    const items = within(section()).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]?.querySelector("time")?.getAttribute("datetime")).toBe(
      newer,
    );
    expect(items[1]?.querySelector("time")?.getAttribute("datetime")).toBe(
      older,
    );
    expect(items[0]?.textContent).toContain(formatDateTime(newer));
    expect(items[0]?.textContent).toContain(
      "Gjennomgått: Fjordlys Keramikk, Lindesnes Ullvarer",
    );
    expect(items[0]?.textContent).toContain("Hoppet over: Sørlandet Honning");
    expect(items[1]?.textContent).toContain(
      "Hoppet over: Sørlandet Honning, Lindesnes Ullvarer",
    );
  });

  it("kjører gjennomgangen og viser den nye kjøringen øverst", async () => {
    const user = userEvent.setup();
    const { store } = renderPage(<AdminPage />, {
      path: "admin",
      route: "/admin",
      userId: "person-15",
      state: stateWithRuns(),
    });

    await user.click(
      within(section()).getByRole("button", {
        name: "Kjør simulert gjennomgang",
      }),
    );

    const runs = store.getState().marketplace.crawlRuns;
    expect(runs).toHaveLength(3);
    expect(runs[2]?.by).toBe("person-15");
    const items = within(section()).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]?.querySelector("time")?.getAttribute("datetime")).toBe(
      runs[2]?.at,
    );
  });

  it("sier fra når ingen gjennomgang er kjørt", () => {
    const state = testSeedState();
    renderPage(<AdminPage />, {
      path: "admin",
      route: "/admin",
      userId: "person-15",
      state: {
        ...state,
        marketplace: { ...state.marketplace, crawlRuns: [] },
      },
    });

    expect(screen.getByText("Ingen gjennomgang er kjørt ennå")).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil med kjøringer", async () => {
    const { container } = renderPage(<AdminPage />, {
      path: "admin",
      route: "/admin",
      userId: "person-15",
      state: stateWithRuns(),
    });

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
