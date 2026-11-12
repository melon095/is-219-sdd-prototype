import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import type { DemoState } from "../../../domain/frame/types";
import type { TaskRequest } from "../../../domain/marketplace/types";
import { testSeedState } from "../../../frame/test-utils";
import { RequestPage } from "./RequestPage";
import { renderPage } from "./renderPage";

function open(
  requestId: string,
  userId: string,
  options: { state?: DemoState; layout?: "desktop" | "mobile" } = {},
) {
  return renderPage(<RequestPage />, {
    path: "oppdrag/:requestId",
    route: `/oppdrag/${requestId}`,
    userId,
    ...options,
  });
}

function changeRequest(
  state: DemoState,
  requestId: string,
  change: (request: TaskRequest) => TaskRequest,
): DemoState {
  return {
    ...state,
    marketplace: {
      ...state.marketplace,
      requests: state.marketplace.requests.map((item) =>
        item.id === requestId ? change(item) : item,
      ),
    },
  };
}

function candidate(name: string): HTMLElement {
  const list = screen.getByRole("list", { name: "Kortliste" });
  const found = within(list)
    .getAllByRole("listitem")
    .find((item) => within(item).queryByText(name) !== null);
  if (found === undefined) {
    throw new Error(`Fant ikke ${name} på kortlisten`);
  }
  return found;
}

describe("RequestPage for eier og administrator", () => {
  it("viser detaljene med statusmerke", () => {
    open("oppdrag-4", "person-1");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Innhold og sosiale medier til julesalget",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "Detaljer" }),
    ).toBeTruthy();
    expect(screen.getByText("Kortliste klar")).toBeTruthy();
    expect(screen.getByText("Fjordlys Keramikk")).toBeTruthy();
    expect(screen.getByText("Sosiale medier")).toBeTruthy();
    expect(screen.getByText("Innholdsproduksjon")).toBeTruthy();
    expect(screen.getByText("8 uker")).toBeTruthy();
    expect(screen.getByText("10. desember 2026")).toBeTruthy();
  });

  it("viser kortlisten sortert etter rangering med alle opplysningene", () => {
    open("oppdrag-4", "person-1");

    const items = within(
      screen.getByRole("list", { name: "Kortliste" }),
    ).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]?.textContent).toContain("Amina Yusuf");
    expect(items[1]?.textContent).toContain("Lena Eriksen");
    expect(items[2]?.textContent).toContain("Mats Johansen");

    const amina = candidate("Amina Yusuf");
    expect(amina.textContent).toContain("Nr. 1");
    expect(amina.textContent).toContain("Erfaring: Senior");
    expect(amina.textContent).toContain("Kan starte: 30. november 2026");
    expect(amina.textContent).toContain("Passer: Sosiale medier");
    expect(amina.textContent).toContain("Mangler: ingen");
    expect(within(amina).getByText("Invitert til intervju")).toBeTruthy();
    expect(within(amina).queryByText("Henvist fra NAV")).toBe(null);
    expect(
      within(candidate("Lena Eriksen")).getByText("Henvist fra NAV"),
    ).toBeTruthy();
  });

  it("viser rangeringen slik den er lagret når en erstatter har fått nummer 4", () => {
    const state = changeRequest(testSeedState(), "oppdrag-4", (request) => ({
      ...request,
      shortlist: [...request.shortlist]
        .reverse()
        .map((entry) =>
          entry.workerId === "person-8" ? { ...entry, rank: 4 } : entry,
        ),
    }));
    open("oppdrag-4", "person-1", { state });

    const items = within(
      screen.getByRole("list", { name: "Kortliste" }),
    ).getAllByRole("listitem");
    expect(
      items.map((item) => item.textContent?.match(/Nr\. \d/)?.[0]),
    ).toEqual(["Nr. 1", "Nr. 2", "Nr. 4"]);
  });

  it("viser handlingene bare til eieren og bare når de er tillatt", () => {
    open("oppdrag-4", "person-1");

    expect(
      within(candidate("Amina Yusuf")).queryByRole("button", {
        name: "Inviter til intervju",
      }),
    ).toBe(null);
    expect(
      within(candidate("Amina Yusuf")).getByRole("button", {
        name: "Gi tilbud",
      }),
    ).toBeTruthy();
    expect(
      within(candidate("Lena Eriksen")).getByRole("button", {
        name: "Inviter til intervju",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Avvis hele kortlisten" }),
    ).toBeTruthy();
  });

  it("skjuler eierens handlinger for administratoren", () => {
    open("oppdrag-4", "person-15");

    expect(screen.getByRole("list", { name: "Kortliste" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Gi tilbud" })).toBe(null);
    expect(screen.queryByRole("button", { name: "Inviter til intervju" })).toBe(
      null,
    );
    expect(
      screen.queryByRole("button", { name: "Avvis hele kortlisten" }),
    ).toBe(null);
  });

  it("lar eieren invitere når tilbudet er sendt, men ikke gi nytt tilbud", () => {
    open("oppdrag-5", "person-4");

    expect(
      within(candidate("Henrik Larsen")).getByRole("button", {
        name: "Inviter til intervju",
      }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Gi tilbud" })).toBe(null);
    expect(
      screen.queryByRole("button", { name: "Avvis hele kortlisten" }),
    ).toBe(null);
  });

  it("gir et tilbud og oppdaterer statusen", async () => {
    const user = userEvent.setup();
    const { store } = open("oppdrag-4", "person-1");

    await user.click(
      within(candidate("Lena Eriksen")).getByRole("button", {
        name: "Gi tilbud",
      }),
    );

    expect(await screen.findByText("Tilbud sendt")).toBeTruthy();
    const request = store
      .getState()
      .marketplace.requests.find((item) => item.id === "oppdrag-4");
    expect(request?.offeredWorkerId).toBe("person-11");
  });

  it("inviterer til intervju uten å endre statusen", async () => {
    const user = userEvent.setup();
    open("oppdrag-4", "person-1");

    await user.click(
      within(candidate("Lena Eriksen")).getByRole("button", {
        name: "Inviter til intervju",
      }),
    );

    await waitFor(() =>
      expect(
        within(candidate("Lena Eriksen")).getByText("Invitert til intervju"),
      ).toBeTruthy(),
    );
    expect(screen.getByText("Kortliste klar")).toBeTruthy();
  });

  it("avviser hele kortlisten med en begrunnelse", async () => {
    const user = userEvent.setup();
    open("oppdrag-4", "person-1");

    await user.click(
      screen.getByRole("button", { name: "Avvis hele kortlisten" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    const confirm = within(dialog).getByRole("button", {
      name: "Avvis kortlisten",
    });
    expect(confirm.hasAttribute("disabled")).toBe(true);

    await user.type(
      within(dialog).getByRole("textbox", {
        name: "Hvorfor passer ingen av disse?",
      }),
      "De mangler erfaring med keramikk.",
    );
    await user.click(confirm);

    expect(await screen.findByText("Til vurdering")).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Kortliste" })).toBe(null);
  });

  it("viser en samtale per kandidat til eieren", () => {
    open("oppdrag-4", "person-1");

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Amina Yusuf",
      "Lena Eriksen",
      "Mats Johansen",
    ]);
    expect(
      screen.getByText(/Torsdag formiddag passer fint for meg/),
    ).toBeTruthy();
  });

  it("lar eieren sende en melding", async () => {
    const user = userEvent.setup();
    open("oppdrag-4", "person-1");

    await user.type(
      screen.getByRole("textbox", { name: "Skriv en melding" }),
      "Vi sees torsdag!",
    );
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Vi sees torsdag!")).toBeTruthy();
    expect(
      (
        screen.getByRole("textbox", {
          name: "Skriv en melding",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("");
  });

  it("gir administratoren alle samtalene, men uten skrivetilgang", () => {
    open("oppdrag-4", "person-15");

    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(
      screen.getByText("Du kan lese, men ikke skrive i denne samtalen"),
    ).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Skriv en melding" })).toBe(
      null,
    );
  });

  it("viser loggen med tid og aktør, og 'System' for automatiske hendelser", () => {
    open("oppdrag-4", "person-1");

    const log = screen.getByRole("list", { name: "Logg" });
    expect(
      within(log).getByText("Kari Nordmann publiserte oppdraget"),
    ).toBeTruthy();
    expect(within(log).getAllByText("System").length).toBeGreaterThan(0);
    expect(log.querySelectorAll("time").length).toBeGreaterThan(0);
  });

  it("merker simulerte hendelser i loggen", () => {
    const state = changeRequest(testSeedState(), "oppdrag-5", (request) => ({
      ...request,
      log: [
        ...request.log,
        {
          id: "logg-test",
          at: "2026-11-16T10:00:00+01:00",
          actor: "system",
          kind: "offer-expired",
          text: "Tilbudet til Mats Johansen utløp. Simulert med feilsøkingsknappen",
          workerId: "person-8",
          simulated: true,
        },
      ],
    }));
    open("oppdrag-5", "person-4", { state });

    const log = screen.getByRole("list", { name: "Logg" });
    expect(within(log).getAllByText("Simulert")).toHaveLength(1);
  });

  it("viser Rediger bare til eieren mens oppdraget er åpent", () => {
    const first = open("oppdrag-7", "person-7");
    expect(
      screen.getByRole("link", { name: "Rediger" }).getAttribute("href"),
    ).toBe("/oppdrag/oppdrag-7/rediger");
    first.unmount();

    open("oppdrag-4", "person-1");
    expect(screen.queryByRole("link", { name: "Rediger" })).toBe(null);
  });

  it("viser varighetsmerknaden for uvanlig varighet", () => {
    open("oppdrag-6", "person-3");

    expect(
      screen.getByText(
        "Varigheten er utenfor det vanlige (2 uker til 6 måneder). Du kan fortsatt publisere oppdraget.",
      ),
    ).toBeTruthy();
  });
});

describe("RequestPage for arbeidssøkere", () => {
  it("viser Godta til arbeidssøkeren som har fått tilbud", async () => {
    const user = userEvent.setup();
    open("oppdrag-5", "person-8");

    expect(screen.queryByRole("list", { name: "Kortliste" })).toBe(null);
    await user.click(screen.getByRole("button", { name: "Godta" }));

    expect(await screen.findByText("Avtalt")).toBeTruthy();
  });

  it("viser ikke Godta når arbeidssøkeren bare står på kortlisten", () => {
    open("oppdrag-4", "person-8");

    expect(screen.queryByRole("button", { name: "Godta" })).toBe(null);
    expect(
      screen.getByRole("heading", { level: 2, name: "Din status" }),
    ).toBeTruthy();
  });

  it("viser bare sin egen samtale", () => {
    open("oppdrag-4", "person-9");

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Kari Nordmann",
    ]);
  });

  it("viser bare egne hendelser og statusendringer i loggen", () => {
    open("oppdrag-4", "person-8");

    const log = screen.getByRole("list", { name: "Logg" });
    expect(within(log).queryByText("Kari Nordmann publiserte oppdraget")).toBe(
      null,
    );
    expect(
      within(log).getByText(/Mats Johansen ble lagt til på kortlisten/),
    ).toBeTruthy();
    expect(
      within(log).queryByText(/Amina Yusuf ble lagt til på kortlisten/),
    ).toBe(null);
  });

  it("viser bare detaljene på et åpent oppdrag uten kortlisteplass", () => {
    open("oppdrag-7", "person-8");

    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "Detaljer" }),
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Kortliste" })).toBe(null);
    expect(screen.queryByRole("heading", { name: "Meldinger" })).toBe(null);
    expect(screen.queryByRole("heading", { name: "Logg" })).toBe(null);
    expect(screen.queryByRole("heading", { name: "Din status" })).toBe(null);
  });

  it("viser bare tittelen når oppdraget ikke lenger er åpent for arbeidssøkeren", () => {
    open("oppdrag-1", "person-8");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Markedsføring av vinterkolleksjonen",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Dette oppdraget er ikke lenger åpent for deg. Vi gir deg beskjed når vi finner nye oppdrag som passer deg.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Se oppdrag" }).getAttribute("href"),
    ).toBe("/oppdrag");
    expect(screen.queryByRole("heading", { name: "Detaljer" })).toBe(null);
    expect(screen.queryByRole("list", { name: "Kortliste" })).toBe(null);
    expect(screen.queryByRole("heading", { name: "Logg" })).toBe(null);
    expect(screen.queryByRole("tab")).toBe(null);
  });
});

describe("RequestPage tilbud og avslag", () => {
  it("viser både Godta og Avslå til arbeidssøkeren som har fått tilbud", () => {
    open("oppdrag-5", "person-8");

    expect(screen.getByRole("button", { name: "Godta" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Avslå" })).toBeTruthy();
  });

  it("viser ikke Avslå til andre på kortlisten", () => {
    open("oppdrag-5", "person-10");

    expect(screen.queryByRole("button", { name: "Avslå" })).toBe(null);
    expect(screen.queryByRole("button", { name: "Godta" })).toBe(null);
  });

  it("avslår tilbudet, ekskluderer arbeidssøkeren og viser at oppdraget ikke lenger er åpent for dem", async () => {
    const user = userEvent.setup();
    const { store } = open("oppdrag-5", "person-8");

    await user.click(screen.getByRole("button", { name: "Avslå" }));

    const request = store
      .getState()
      .marketplace.requests.find((item) => item.id === "oppdrag-5");
    expect(request?.status).toBe("shortlisted");
    expect(request?.excludedWorkerIds).toContainEqual(
      expect.objectContaining({ workerId: "person-8", reason: "declined" }),
    );
    expect(
      await screen.findByText(
        "Dette oppdraget er ikke lenger åpent for deg. Vi gir deg beskjed når vi finner nye oppdrag som passer deg.",
      ),
    ).toBeTruthy();
  });

  it("viser bare detaljene til en arbeidssøker på et åpent oppdrag uten kortlisteplass", () => {
    open("oppdrag-7", "person-9");

    expect(
      screen.getByRole("heading", { level: 2, name: "Detaljer" }),
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Kortliste" })).toBe(null);
    expect(screen.queryByRole("heading", { name: "Meldinger" })).toBe(null);
    expect(screen.queryByRole("heading", { name: "Logg" })).toBe(null);
    expect(screen.queryByRole("heading", { name: "Din status" })).toBe(null);
  });
});

describe("RequestPage tidsknapp for tilbud", () => {
  const label = "Demo: Simuler at 7 dager har gått";

  it("viser tidsknappen på et oppdrag med tilbud", () => {
    open("oppdrag-5", "person-4");

    expect(screen.getByRole("button", { name: label })).toBeTruthy();
  });

  it("viser ikke tidsknappen når oppdraget ikke har et tilbud", () => {
    open("oppdrag-4", "person-1");

    expect(screen.queryByRole("button", { name: label })).toBe(null);
  });

  it("sender simulateOfferExpiry og merker loggen som simulert", async () => {
    const user = userEvent.setup();
    const { store } = open("oppdrag-5", "person-4");

    await user.click(screen.getByRole("button", { name: label }));

    const state = store.getState();
    const request = state.marketplace.requests.find(
      (item) => item.id === "oppdrag-5",
    );
    expect(request?.status).toBe("shortlisted");
    expect(request?.excludedWorkerIds).toContainEqual(
      expect.objectContaining({
        workerId: "person-8",
        reason: "offer-expired",
      }),
    );
    const expired = request?.log.find(
      (event) => event.kind === "offer-expired",
    );
    expect(expired?.simulated).toBe(true);
    expect(expired?.text).toContain("Simulert med feilsøkingsknappen");
    const log = await screen.findByRole("list", { name: "Logg" });
    expect(within(log).getAllByText("Simulert")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: label })).toBe(null);
  });

  it("endrer ikke andre oppdrag", async () => {
    const user = userEvent.setup();
    const { store } = open("oppdrag-5", "person-4");
    const before = store.getState().marketplace.requests;

    await user.click(screen.getByRole("button", { name: label }));

    const after = store.getState().marketplace.requests;
    for (const item of before.filter((request) => request.id !== "oppdrag-5")) {
      expect(after.find((request) => request.id === item.id)).toEqual(item);
    }
  });

  it("er tilgjengelig for arbeidssøkeren og administratoren", () => {
    const first = open("oppdrag-5", "person-8");
    expect(screen.getByRole("button", { name: label })).toBeTruthy();
    first.unmount();

    open("oppdrag-5", "person-15");
    expect(screen.getByRole("button", { name: label })).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil for eier med tidsknapp", async () => {
    const { container } = open("oppdrag-5", "person-4");

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("RequestPage for andre", () => {
  it("viser siden om manglende tilgang når verken oppdraget eller tittelen kan ses", () => {
    open("oppdrag-4", "person-14");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Du har ikke tilgang til denne siden",
      }),
    ).toBeTruthy();
  });

  it("viser siden om manglende tilgang til en ansatt som ikke er eier", () => {
    open("oppdrag-4", "person-2");

    expect(
      screen.getByText("Du har ikke tilgang til denne siden"),
    ).toBeTruthy();
  });

  it("sjekker tilgangen på nytt når brukeren byttes", () => {
    const { store } = open("oppdrag-4", "person-1");
    expect(screen.getByRole("list", { name: "Kortliste" })).toBeTruthy();

    act(() => store.selectUser("person-14"));
    expect(
      screen.getByText("Du har ikke tilgang til denne siden"),
    ).toBeTruthy();

    act(() => store.selectUser("person-8"));
    expect(screen.queryByRole("list", { name: "Kortliste" })).toBe(null);
    expect(
      screen.getByRole("heading", { level: 2, name: "Din status" }),
    ).toBeTruthy();
  });

  it("viser siden som ikke finnes for et ukjent oppdrag", () => {
    open("finnes-ikke", "person-1");

    expect(screen.getByText("Siden finnes ikke")).toBeTruthy();
  });
});

describe("RequestPage oppsett", () => {
  it("viser to kolonner på skrivebord", () => {
    const { container } = open("oppdrag-4", "person-1");

    const main = container.querySelector('[data-column="main"]') as HTMLElement;
    const side = container.querySelector('[data-column="side"]') as HTMLElement;
    expect(
      within(main).getByRole("heading", { name: "Detaljer" }),
    ).toBeTruthy();
    expect(within(main).getByRole("heading", { name: "Logg" })).toBeTruthy();
    expect(
      within(side).getByRole("heading", { name: "Kortliste" }),
    ).toBeTruthy();
    expect(
      within(side).getByRole("heading", { name: "Meldinger" }),
    ).toBeTruthy();
  });

  it("viser detaljene og deretter faner på mobil", async () => {
    const user = userEvent.setup();
    open("oppdrag-4", "person-1", { layout: "mobile" });

    expect(
      screen.getByRole("heading", { level: 2, name: "Detaljer" }),
    ).toBeTruthy();
    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(tabs).toEqual(["Kortliste", "Meldinger", "Logg"]);
    expect(screen.getByRole("list", { name: "Kortliste" })).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "Meldinger" }));
    expect(screen.getByRole("tab", { name: "Amina Yusuf" })).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "Logg" }));
    expect(screen.getByRole("list", { name: "Logg" })).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil på skrivebord", async () => {
    const { container } = open("oppdrag-4", "person-1");

    expect(await axe(container)).toHaveNoViolations();
  });

  it("har ingen tilgjengelighetsfeil på mobil", async () => {
    const { container } = open("oppdrag-4", "person-1", { layout: "mobile" });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("har ingen tilgjengelighetsfeil for en arbeidssøker med tilbud", async () => {
    const { container } = open("oppdrag-5", "person-8");

    expect(await axe(container)).toHaveNoViolations();
  });

  it("har ingen tilgjengelighetsfeil når oppdraget ikke lenger er åpent", async () => {
    const { container } = open("oppdrag-1", "person-8");

    expect(await axe(container)).toHaveNoViolations();
  });
});
