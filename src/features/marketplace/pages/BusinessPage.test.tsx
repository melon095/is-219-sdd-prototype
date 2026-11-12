import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { testSeedState } from "../../../frame/test-utils";
import { formatDateTime } from "../format";
import { BusinessPage } from "./BusinessPage";
import { renderPage, withBusiness } from "./renderPage";

const switchName =
  "Vi vil gjerne få forslag fra en simulert gjennomgang av nettsiden vår";

const crawledAt = "2026-11-09T10:00:00+01:00";

function open(userId: string, state = testSeedState()) {
  return renderPage(<BusinessPage />, {
    path: "bedrift",
    route: "/bedrift",
    userId,
    state,
  });
}

function crawledState() {
  return withBusiness(testSeedState(), "bedrift-1", {
    crawlOptIn: true,
    crawlSuggestions: ["ferdighet-6", "ferdighet-5"],
    crawlSuggestionsUpdatedAt: crawledAt,
  });
}

describe("BusinessPage for owners", () => {
  it("viser navn, beskrivelse og folkene som jobber der", () => {
    open("person-1");

    expect(
      screen.getByRole("heading", { level: 1, name: "Min bedrift" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "Fjordlys Keramikk" }),
    ).toBeTruthy();
    expect(screen.getByText(/Håndlaget keramikk/)).toBeTruthy();
    const people = screen.getByRole("region", { name: "Folk som jobber her" });
    expect(
      within(people)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      expect.stringContaining("Kari Nordmann"),
      expect.stringContaining("Jonas Berg"),
    ]);
  });

  it("tar med folk som er plassert i bedriften gjennom et oppdrag", () => {
    open("person-5");

    const people = screen.getByRole("region", { name: "Folk som jobber her" });
    expect(within(people).getByText("Silje Moen")).toBeTruthy();
  });

  it("viser E-Waves-medlemskap som tekst uten å la det endres", () => {
    open("person-1");

    expect(screen.getByText("Medlem av E-Waves")).toBeTruthy();
    expect(screen.queryByRole("switch", { name: /E-Waves/ })).toBe(null);
    expect(screen.queryByRole("checkbox", { name: /E-Waves/ })).toBe(null);
  });

  it("viser at bedriften ikke er med i E-Waves", () => {
    open("person-4");

    expect(screen.getByText("Ikke medlem av E-Waves")).toBeTruthy();
  });

  it("har en bryter med forklaring som speiler valget om gjennomgang", () => {
    open("person-1");

    const toggle = screen.getByRole("switch", { name: switchName });
    expect((toggle as HTMLInputElement).checked).toBe(true);
    expect(toggle.getAttribute("aria-describedby")).toBeTruthy();
    const described = document.getElementById(
      toggle.getAttribute("aria-describedby") ?? "",
    );
    expect(described?.textContent?.length).toBeGreaterThan(40);
  });

  it("viser bryteren som av for en bedrift som ikke har valgt gjennomgang", () => {
    open("person-3");

    expect(
      (screen.getByRole("switch", { name: switchName }) as HTMLInputElement)
        .checked,
    ).toBe(false);
  });

  it("sender setCrawlOptIn når bryteren skrus av og på", async () => {
    const user = userEvent.setup();
    const { store } = open("person-1");
    const optIn = () =>
      store
        .getState()
        .frame.businesses.find((business) => business.id === "bedrift-1")
        ?.crawlOptIn;

    await user.click(screen.getByRole("switch", { name: switchName }));
    expect(optIn()).toBe(false);
    expect(
      (screen.getByRole("switch", { name: switchName }) as HTMLInputElement)
        .checked,
    ).toBe(false);

    await user.click(screen.getByRole("switch", { name: switchName }));
    expect(optIn()).toBe(true);
  });

  it("beholder forslagene når bryteren skrus av", async () => {
    const user = userEvent.setup();
    const { store } = open("person-1", crawledState());

    await user.click(screen.getByRole("switch", { name: switchName }));

    const business = store
      .getState()
      .frame.businesses.find((item) => item.id === "bedrift-1");
    expect(business?.crawlSuggestions).toEqual(["ferdighet-6", "ferdighet-5"]);
    expect(screen.getByText("Sosiale medier")).toBeTruthy();
  });

  it("viser forslagene med Simulert-merke og tidspunktet for siste gjennomgang", () => {
    open("person-1", crawledState());

    const section = screen.getByRole("region", {
      name: "Forslag fra gjennomgangen",
    });
    expect(within(section).getByText("Simulert")).toBeTruthy();
    expect(within(section).getByText("Sosiale medier")).toBeTruthy();
    expect(within(section).getByText("Innholdsproduksjon")).toBeTruthy();
    const time = within(section).getByText(formatDateTime(crawledAt));
    expect(time.tagName).toBe("TIME");
    expect(time.getAttribute("datetime")).toBe(crawledAt);
  });

  it("sier fra når det ikke finnes forslag ennå", () => {
    open("person-3");

    expect(screen.getByText("Du har ingen forslag ennå.")).toBeTruthy();
    expect(screen.queryByText(/Siste gjennomgang/)).toBe(null);
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = open("person-1", crawledState());

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("BusinessPage for others", () => {
  it("viser en ansatt navnet og folkene, uten å la noe endres", () => {
    open("person-2");

    expect(
      screen.getByRole("heading", { level: 1, name: "Min bedrift" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "Fjordlys Keramikk" }),
    ).toBeTruthy();
    const people = screen.getByRole("region", { name: "Folk som jobber her" });
    expect(within(people).getByText("Kari Nordmann")).toBeTruthy();
    expect(within(people).getByText("Jonas Berg")).toBeTruthy();
    expect(screen.queryByRole("switch")).toBe(null);
    expect(screen.queryByText("Simulert")).toBe(null);
  });

  it("har ingen tilgjengelighetsfeil for en ansatt", async () => {
    const { container } = open("person-2");

    expect(await axe(container)).toHaveNoViolations();
  });

  it("gir alle andre siden om manglende tilgang", () => {
    for (const userId of ["person-8", "person-15", "person-14"]) {
      const { unmount } = open(userId);
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Du har ikke tilgang til denne siden",
        }),
      ).toBeTruthy();
      expect(screen.queryByRole("switch")).toBe(null);
      unmount();
    }
  });

  it("sjekker tilgangen på nytt når brukeren byttes", () => {
    const { store } = open("person-8");
    expect(screen.queryByRole("switch")).toBe(null);

    act(() => store.selectUser("person-1"));

    expect(
      screen.getByRole("heading", { level: 1, name: "Min bedrift" }),
    ).toBeTruthy();
  });
});
