import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { RequestFormPage } from "./RequestFormPage";
import { renderPage } from "./renderPage";

const newOptions = {
  path: "oppdrag/ny",
  route: "/oppdrag/ny",
  userId: "person-1",
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
    const user = userEvent.setup();
    const { router, store } = renderPage(<RequestFormPage />, {
      ...newOptions,
      extraPages: [requestPage],
    });

    await user.type(
      screen.getByRole("textbox", { name: "Tittel" }),
      "Hjelp med sosiale medier",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Beskrivelse" }),
      "Vi trenger hjelp til å lage innlegg.",
    );
    await user.type(
      screen.getByRole("combobox", { name: "Nødvendige ferdigheter" }),
      "Sosiale",
    );
    await user.keyboard("{ArrowDown}{Enter}");
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
