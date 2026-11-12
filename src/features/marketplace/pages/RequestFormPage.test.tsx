import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import type { DemoState } from "../../../domain/frame/types";
import { testSeedState } from "../../../frame/test-utils";
import { RequestFormPage } from "./RequestFormPage";
import { renderPage, withBusiness } from "./renderPage";

const newOptions = {
  path: "oppdrag/ny",
  route: "/oppdrag/ny",
  userId: "person-3",
};

const requestPage = {
  path: "oppdrag/:requestId",
  element: <p>Oppdragssiden</p>,
};

describe("RequestFormPage", () => {
  it("har alle feltene i skjemaet", () => {
    renderPage(<RequestFormPage />, newOptions);

    expect(
      screen.getByRole("heading", { level: 1, name: "Nytt oppdrag" }),
    ).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Tittel" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Beskrivelse" })).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "Nødvendige ferdigheter" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("textbox", { name: "Tilleggskrav (valgfritt)" }),
    ).toBeTruthy();
    expect(screen.getByText("Ønsket startdato")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Varighet" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Enhet/ }).textContent).toContain(
      "uker",
    );
    expect(screen.getByRole("textbox", { name: "Timer per uke" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Fjernarbeid" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "På stedet" })).toBeTruthy();
  });

  it("viser varighetsmerknaden så snart varigheten er utenfor det vanlige", async () => {
    const user = userEvent.setup();
    renderPage(<RequestFormPage />, newOptions);
    const notice =
      "Varigheten er utenfor det vanlige (2 uker til 6 måneder). Du kan fortsatt publisere oppdraget.";
    const duration = screen.getByRole("textbox", { name: "Varighet" });

    await user.type(duration, "6");
    await user.tab();
    expect(screen.queryByText(notice)).toBe(null);

    await user.clear(duration);
    await user.type(duration, "1");
    await user.tab();
    expect(screen.getByText(notice)).toBeTruthy();
  });

  it("viser feil fra kommandoen på feltene", async () => {
    const user = userEvent.setup();
    renderPage(<RequestFormPage />, newOptions);

    await user.click(
      screen.getByRole("button", { name: "Publiser oppdraget" }),
    );

    expect(
      await screen.findByText("Skriv en tittel på 1–100 tegn."),
    ).toBeTruthy();
    expect(screen.getByText("Beskriv oppdraget med 1–4000 tegn.")).toBeTruthy();
    expect(screen.getByText("Velg minst én ferdighet.")).toBeTruthy();
    expect(screen.getByText("Velg ønsket startdato.")).toBeTruthy();
    expect(
      screen.getByText("Oppgi timer per uke som et helt tall fra 1 til 60."),
    ).toBeTruthy();
    expect(
      screen.getByText("Velg om arbeidet er fjernarbeid eller på stedet."),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("textbox", { name: "Tittel" })
        .getAttribute("aria-invalid"),
    ).toBe("true");
  });

  it("publiserer, går til oppdragssiden og kunngjør at oppdraget er publisert", async () => {
    const user = userEvent.setup({ delay: null });
    const { router, store } = renderPage(<RequestFormPage />, {
      ...newOptions,
      extraPages: [requestPage],
    });

    await user.click(screen.getByLabelText("Tittel"));
    await user.paste("Hjelp med sosiale medier");
    await user.click(screen.getByLabelText("Beskrivelse"));
    await user.paste("Vi trenger hjelp til å lage innlegg.");
    await user.click(
      screen.getByRole("combobox", { name: "Nødvendige ferdigheter" }),
    );
    await user.paste("Sosiale");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: /Kalender/ }));
    const calendar = await screen.findByRole("dialog");
    await user.click(
      within(calendar).getAllByRole("button", {
        name: /20\. /,
      })[0] as HTMLElement,
    );
    await user.click(screen.getByRole("textbox", { name: "Varighet" }));
    await user.paste("6");
    await user.click(screen.getByRole("textbox", { name: "Timer per uke" }));
    await user.paste("10");
    await user.click(screen.getByLabelText("Fjernarbeid"));
    await user.click(
      screen.getByRole("button", { name: "Publiser oppdraget" }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toMatch(
        /^\/oppdrag\/test-id-\d+$/,
      ),
    );
    expect(await screen.findByText("Oppdraget er publisert")).toBeTruthy();
    const published = store
      .getState()
      .marketplace.requests.find(
        (item) => item.title === "Hjelp med sosiale medier",
      );
    expect(published?.status).toBeDefined();
    expect(router.state.location.pathname).toBe(`/oppdrag/${published?.id}`);
  });

  it("viser at oppdraget bare kan endres mens det er åpent", () => {
    renderPage(<RequestFormPage />, {
      path: "oppdrag/:requestId/rediger",
      route: "/oppdrag/oppdrag-4/rediger",
      userId: "person-1",
    });

    expect(
      screen.getByText("Oppdraget kan bare endres mens det er åpent"),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Tilbake til oppdraget" })
        .getAttribute("href"),
    ).toBe("/oppdrag/oppdrag-4");
    expect(screen.queryByRole("textbox", { name: "Tittel" })).toBe(null);
  });

  it("fyller ut skjemaet når et åpent oppdrag redigeres", () => {
    renderPage(<RequestFormPage />, {
      path: "oppdrag/:requestId/rediger",
      route: "/oppdrag/oppdrag-7/rediger",
      userId: "person-7",
    });

    expect(
      screen.getByRole("heading", { level: 1, name: "Rediger oppdrag" }),
    ).toBeTruthy();
    expect(
      (screen.getByRole("textbox", { name: "Tittel" }) as HTMLInputElement)
        .value,
    ).toBe("Oversette produktbeskrivelser til engelsk");
    expect(
      (
        screen.getByRole("textbox", {
          name: "Timer per uke",
        }) as HTMLInputElement
      ).value,
    ).toBe("10");
    expect(screen.getByRole("radio", { name: "Fjernarbeid" })).toHaveProperty(
      "checked",
      true,
    );
  });

  it("er bare for eieren av bedriften", () => {
    const { store } = renderPage(<RequestFormPage />, {
      ...newOptions,
      userId: "person-8",
    });

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Du har ikke tilgang til denne siden",
      }),
    ).toBeTruthy();
    act(() => store.selectUser("person-1"));
    expect(
      screen.getByRole("heading", { level: 1, name: "Nytt oppdrag" }),
    ).toBeTruthy();
  });

  it("viser forklaringen som sidepanel på skrivebord", () => {
    renderPage(<RequestFormPage />, newOptions);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Slik finner vi folk til deg",
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Slik finner vi folk til deg" }),
    ).toBe(null);
  });

  it("viser forklaringen som en utvidbar del over skjemaet på mobil", async () => {
    const user = userEvent.setup();
    renderPage(<RequestFormPage />, { ...newOptions, layout: "mobile" });

    expect(
      screen.queryByRole("heading", {
        level: 2,
        name: "Slik finner vi folk til deg",
      }),
    ).toBe(null);
    const trigger = screen.getByRole("button", {
      name: "Slik finner vi folk til deg",
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await user.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = renderPage(<RequestFormPage />, newOptions);

    expect(await axe(container)).toHaveNoViolations();
  });

  it("har ingen tilgjengelighetsfeil med feilmeldinger", async () => {
    const user = userEvent.setup();
    const { container } = renderPage(<RequestFormPage />, newOptions);
    await user.click(
      screen.getByRole("button", { name: "Publiser oppdraget" }),
    );
    await screen.findByText("Skriv en tittel på 1–100 tegn.");

    expect(await axe(container)).toHaveNoViolations();
  });
});

const suggestionNote =
  "Foreslått fra en simulert gjennomgang av nettsiden deres";

function stateWithSuggestions(
  businessId: string,
  suggestions: string[],
): DemoState {
  return withBusiness(testSeedState(), businessId, {
    crawlSuggestions: suggestions,
  });
}

describe("RequestFormPage med forslag fra gjennomgangen", () => {
  const suggestedOptions = {
    path: "oppdrag/ny",
    route: "/oppdrag/ny",
    userId: "person-1",
    state: stateWithSuggestions("bedrift-1", ["ferdighet-6", "ferdighet-5"]),
  };

  it("forhåndsvelger forslagene med Forslag-merke, notat og Simulert-merke", () => {
    renderPage(<RequestFormPage />, suggestedOptions);

    expect(
      screen.getByRole("row", { name: "Sosiale medier (Forslag)" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("row", { name: "Innholdsproduksjon (Forslag)" }),
    ).toBeTruthy();
    expect(screen.getAllByText("Forslag")).toHaveLength(2);
    const note = screen.getByText(suggestionNote);
    expect(note.textContent).toContain("Simulert");
  });

  it("lar eieren fjerne forslag og legge til andre ferdigheter", async () => {
    const user = userEvent.setup();
    renderPage(<RequestFormPage />, suggestedOptions);

    await user.click(
      screen.getByRole("button", { name: /Fjern.*Innholdsproduksjon/ }),
    );
    await user.click(
      screen.getByRole("combobox", { name: "Nødvendige ferdigheter" }),
    );
    await user.paste("Regnskap");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(screen.queryByRole("row", { name: /Innholdsproduksjon/ })).toBe(
      null,
    );
    expect(
      screen.getByRole("row", { name: "Sosiale medier (Forslag)" }),
    ).toBeTruthy();
    expect(screen.getByRole("row", { name: "Regnskap" })).toBeTruthy();
  });

  it("merker ikke et forslag som eieren har fjernet og lagt til igjen selv", async () => {
    const user = userEvent.setup();
    renderPage(<RequestFormPage />, suggestedOptions);

    await user.click(
      screen.getByRole("button", { name: /Fjern.*Innholdsproduksjon/ }),
    );
    await user.click(
      screen.getByRole("combobox", { name: "Nødvendige ferdigheter" }),
    );
    await user.paste("Innholdsproduksjon");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(
      screen.getByRole("row", { name: "Innholdsproduksjon" }),
    ).toBeTruthy();
    expect(screen.getAllByText("Forslag")).toHaveLength(1);
  });

  it("lagrer forslagene som er beholdt, og alle valgte ferdigheter", async () => {
    const user = userEvent.setup({ delay: null });
    const { store } = renderPage(<RequestFormPage />, {
      ...suggestedOptions,
      extraPages: [requestPage],
    });

    await user.click(
      screen.getByRole("button", { name: /Fjern.*Innholdsproduksjon/ }),
    );
    await user.click(
      screen.getByRole("combobox", { name: "Nødvendige ferdigheter" }),
    );
    await user.paste("Regnskap");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("textbox", { name: "Tittel" }));
    await user.paste("Hjelp med kampanjen");
    await user.click(screen.getByRole("textbox", { name: "Beskrivelse" }));
    await user.paste("Vi trenger hjelp til å lage innlegg.");
    await user.click(screen.getByRole("button", { name: /Kalender/ }));
    const calendar = await screen.findByRole("dialog");
    await user.click(
      within(calendar).getAllByRole("button", {
        name: /20\. /,
      })[0] as HTMLElement,
    );
    await user.type(screen.getByRole("textbox", { name: "Varighet" }), "6");
    await user.tab();
    await user.type(
      screen.getByRole("textbox", { name: "Timer per uke" }),
      "10",
    );
    await user.tab();
    await user.click(screen.getByRole("radio", { name: "Fjernarbeid" }));
    await user.click(
      screen.getByRole("button", { name: "Publiser oppdraget" }),
    );

    await waitFor(() =>
      expect(
        store
          .getState()
          .marketplace.requests.some(
            (item) => item.title === "Hjelp med kampanjen",
          ),
      ).toBe(true),
    );
    const published = store
      .getState()
      .marketplace.requests.find(
        (item) => item.title === "Hjelp med kampanjen",
      );
    expect(published?.requiredSkillIds).toEqual(["ferdighet-6", "ferdighet-4"]);
    expect(published?.acceptedSuggestionIds).toEqual(["ferdighet-6"]);
  });

  it("starter med tom skillevelger og ingen merknad uten forslag", () => {
    renderPage(<RequestFormPage />, {
      ...suggestedOptions,
      userId: "person-3",
    });

    expect(screen.queryByRole("grid")).toBe(null);
    expect(screen.queryByText("Forslag")).toBe(null);
    expect(screen.queryByText(suggestionNote)).toBe(null);
    expect(screen.queryByText("Simulert")).toBe(null);
  });

  it("forhåndsvelger aldri forslag når et oppdrag redigeres", () => {
    renderPage(<RequestFormPage />, {
      path: "oppdrag/:requestId/rediger",
      route: "/oppdrag/oppdrag-7/rediger",
      userId: "person-7",
      state: stateWithSuggestions("bedrift-5", ["ferdighet-1", "ferdighet-2"]),
    });

    expect(
      screen.getByRole("row", { name: "Oversettelse til engelsk" }),
    ).toBeTruthy();
    expect(screen.getByRole("row", { name: "Tekstskriving" })).toBeTruthy();
    expect(screen.queryByRole("row", { name: /Produktfotografering/ })).toBe(
      null,
    );
    expect(screen.queryByRole("row", { name: /Shopify-oppsett/ })).toBe(null);
    expect(screen.queryByText("Forslag")).toBe(null);
    expect(screen.queryByText(suggestionNote)).toBe(null);
  });

  it("har ingen tilgjengelighetsfeil med forslag", async () => {
    const { container } = renderPage(<RequestFormPage />, suggestedOptions);

    expect(await axe(container)).toHaveNoViolations();
  });
});
