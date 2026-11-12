import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DemoState } from "../../../domain/frame/types";
import { testSeedState } from "../../../frame/test-utils";
import { renderPage } from "./renderPage";
import { WorkerProfilePage } from "./WorkerProfilePage";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-12T10:00:00+01:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

function open(
  userId: string,
  options: { state?: DemoState; layout?: "desktop" | "mobile" } = {},
) {
  return renderPage(<WorkerProfilePage />, {
    path: "profil",
    route: "/profil",
    userId,
    ...options,
  });
}

function withNavDraft(personId: string): DemoState {
  const state = testSeedState();
  return {
    ...state,
    marketplace: {
      ...state.marketplace,
      workerProfiles: [
        ...state.marketplace.workerProfiles,
        {
          personId,
          skillIds: [],
          isDraft: true,
          navReferral: {
            referredAt: "2026-11-10T09:00:00+01:00",
            simulated: true,
          },
        },
      ],
    },
  };
}

async function pickDate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Kalender/ }));
  const calendar = await screen.findByRole("dialog");
  await user.click(
    within(calendar).getAllByRole("button", {
      name: /20\. /,
    })[0] as HTMLElement,
  );
}

describe("WorkerProfilePage for personer som ikke søker oppdrag", () => {
  it("forklarer at siden er for dem som søker oppdrag", () => {
    open("person-2");

    expect(
      screen.getByRole("heading", { level: 1, name: "Min profil" }),
    ).toBeTruthy();
    expect(
      screen.getByText("Denne siden er for deg som søker oppdrag."),
    ).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBe(null);
  });
});

describe("WorkerProfilePage uten profil", () => {
  it("viser registreringsskjemaet uten NAV-merknad", () => {
    open("person-13");

    expect(
      screen.getByRole("heading", { level: 1, name: "Min profil" }),
    ).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Ferdigheter" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Junior" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Erfaren" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Senior" })).toBeTruthy();
    expect(screen.getByText("Tilgjengelig fra")).toBeTruthy();
    expect(
      screen.getByRole("textbox", { name: "Ønsker (valgfritt)" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Registrer profilen" }),
    ).toBeTruthy();
    expect(screen.queryByText(/Du er henvist fra NAV/)).toBe(null);
  });

  it("viser feil fra kommandoen på feltene", async () => {
    const user = userEvent.setup();
    open("person-13");

    await user.click(
      screen.getByRole("button", { name: "Registrer profilen" }),
    );

    expect(await screen.findByText("Velg minst én ferdighet.")).toBeTruthy();
    expect(screen.getByText("Velg erfaringsnivå.")).toBeTruthy();
    expect(screen.getByText("Velg når du kan starte.")).toBeTruthy();
  });

  it("registrerer profilen og viser den etterpå", async () => {
    const user = userEvent.setup();
    const { store } = open("person-13");

    await user.type(
      screen.getByRole("combobox", { name: "Ferdigheter" }),
      "Oversettelse",
    );
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("radio", { name: "Erfaren" }));
    await pickDate(user);
    await user.type(
      screen.getByRole("textbox", { name: "Ønsker (valgfritt)" }),
      "Jeg vil oversette tekster.",
    );
    await user.click(
      screen.getByRole("button", { name: "Registrer profilen" }),
    );

    await waitFor(() =>
      expect(
        store
          .getState()
          .marketplace.workerProfiles.find(
            (item) => item.personId === "person-13",
          ),
      ).toBeDefined(),
    );
    const profile = store
      .getState()
      .marketplace.workerProfiles.find((item) => item.personId === "person-13");
    expect(profile).toMatchObject({
      skillIds: ["ferdighet-14"],
      experienceLevel: "mid",
      wishes: "Jeg vil oversette tekster.",
      isDraft: false,
    });
    expect(await screen.findByText("Profilen din er klar")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rediger" })).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = open("person-13");

    expect(await axe(container)).toHaveNoViolations();
  });

  it("har ingen tilgjengelighetsfeil med feilmeldinger", async () => {
    const user = userEvent.setup();
    const { container } = open("person-13");
    await user.click(
      screen.getByRole("button", { name: "Registrer profilen" }),
    );
    await screen.findByText("Velg minst én ferdighet.");

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("WorkerProfilePage med NAV-utkast", () => {
  it("viser NAV-merknaden med Simulert-merke og samme skjema", () => {
    const { container } = open("person-14", {
      state: withNavDraft("person-14"),
    });

    expect(
      screen.getByText(
        "Du er henvist fra NAV (simulert). Fyll ut profilen din for å bli med i matchingen",
      ),
    ).toBeTruthy();
    expect(within(container).getByText("Simulert")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Ferdigheter" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Registrer profilen" }),
    ).toBeTruthy();
  });

  it("fullfører utkastet og blir med i matchingen", async () => {
    const user = userEvent.setup();
    const { store } = open("person-14", { state: withNavDraft("person-14") });

    await user.type(
      screen.getByRole("combobox", { name: "Ferdigheter" }),
      "Oversettelse",
    );
    await user.keyboard("{ArrowDown}{Enter}");
    await user.type(
      screen.getByRole("combobox", { name: "Ferdigheter" }),
      "Tekstskriving",
    );
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("radio", { name: "Junior" }));
    await pickDate(user);
    await user.click(
      screen.getByRole("button", { name: "Registrer profilen" }),
    );

    await waitFor(() =>
      expect(
        store
          .getState()
          .marketplace.workerProfiles.find(
            (item) => item.personId === "person-14",
          )?.isDraft,
      ).toBe(false),
    );
    const state = store.getState();
    const profile = state.marketplace.workerProfiles.find(
      (item) => item.personId === "person-14",
    );
    expect(profile?.navReferral).toBeDefined();
    const translate = state.marketplace.requests.find(
      (item) => item.id === "oppdrag-7",
    );
    expect(
      translate?.shortlist.some((entry) => entry.workerId === "person-14"),
    ).toBe(true);
    expect(
      await screen.findByRole("link", {
        name: "Oversette produktbeskrivelser til engelsk",
      }),
    ).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = open("person-14", {
      state: withNavDraft("person-14"),
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("WorkerProfilePage med ferdig profil", () => {
  it("viser profilen med Rediger", () => {
    open("person-8");

    expect(screen.getByText("Shopify-oppsett")).toBeTruthy();
    expect(screen.getByText("Erfaren")).toBeTruthy();
    expect(screen.getByText("23. november 2026")).toBeTruthy();
    expect(
      screen.getByText(
        "Jeg vil gjerne hjelpe små nettbutikker med å bli mer synlige på nett.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Henvist fra NAV")).toBe(null);
    expect(screen.getByRole("button", { name: "Rediger" })).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Ferdigheter" })).toBe(null);
  });

  it("viser at profilen kom fra en NAV-henvisning", () => {
    open("person-11");

    expect(screen.getByText("Henvist fra NAV")).toBeTruthy();
  });

  it("viser kortlister og tilbud med lenker til oppdragssidene", () => {
    open("person-8");

    const list = screen.getByRole("list", { name: "Kortlister og tilbud" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(
      within(list)
        .getByRole("link", { name: "Lansere ny nettbutikk med kampanje" })
        .getAttribute("href"),
    ).toBe("/oppdrag/oppdrag-5");
    const offered = items.find((item) =>
      within(item).queryByText("Lansere ny nettbutikk med kampanje"),
    ) as HTMLElement;
    expect(within(offered).getByText("Du har fått et tilbud")).toBeTruthy();
    const listed = items.find((item) =>
      within(item).queryByText("Innhold og sosiale medier til julesalget"),
    ) as HTMLElement;
    expect(within(listed).getByText("På kortlisten")).toBeTruthy();
  });

  it("viser avtalte oppdrag som avtalt", () => {
    open("person-12");

    const list = screen.getByRole("list", { name: "Kortlister og tilbud" });
    const item = within(list)
      .getAllByRole("listitem")
      .find((candidate) =>
        within(candidate).queryByText("Hjelp med pakking og sending før jul"),
      ) as HTMLElement;
    expect(within(item).getByText("Avtalt")).toBeTruthy();
  });

  it("viser en melding når profilen ikke er på noen kortlister", () => {
    const state = testSeedState();
    const empty: DemoState = {
      ...state,
      marketplace: {
        ...state.marketplace,
        requests: state.marketplace.requests.map((request) => ({
          ...request,
          shortlist: request.shortlist.filter(
            (entry) => entry.workerId !== "person-9",
          ),
        })),
      },
    };
    open("person-9", { state: empty });

    expect(
      screen.getByText("Du står ikke på noen kortlister ennå."),
    ).toBeTruthy();
  });

  it("lar arbeidssøkeren endre profilen", async () => {
    const user = userEvent.setup();
    const { store } = open("person-8");

    await user.click(screen.getByRole("button", { name: "Rediger" }));
    expect(screen.getByRole("radio", { name: "Erfaren" })).toHaveProperty(
      "checked",
      true,
    );
    await user.click(screen.getByRole("radio", { name: "Senior" }));
    await user.click(screen.getByRole("button", { name: "Lagre endringer" }));

    await waitFor(() =>
      expect(
        store
          .getState()
          .marketplace.workerProfiles.find(
            (item) => item.personId === "person-8",
          )?.experienceLevel,
      ).toBe("senior"),
    );
    expect(await screen.findByRole("button", { name: "Rediger" })).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = open("person-8");

    expect(await axe(container)).toHaveNoViolations();
  });

  it("har ingen tilgjengelighetsfeil når profilen redigeres", async () => {
    const user = userEvent.setup();
    const { container } = open("person-8");
    await user.click(screen.getByRole("button", { name: "Rediger" }));

    expect(await axe(container)).toHaveNoViolations();
  });
});
