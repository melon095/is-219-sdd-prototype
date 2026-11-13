import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { AdminPage } from "./AdminPage";
import { RequestPage } from "./RequestPage";
import { renderPage } from "./renderPage";

function openRequest(requestId: string, userId: string) {
  return renderPage(<RequestPage />, {
    path: "oppdrag/:requestId",
    route: `/oppdrag/${requestId}`,
    userId,
  });
}

function openAdmin() {
  return renderPage(<AdminPage />, {
    path: "admin",
    route: "/admin",
    userId: "person-15",
  });
}

async function expectFocusOn(find: () => HTMLElement | ReactElement) {
  await waitFor(() => {
    const target = find();
    expect(document.activeElement).toBe(target);
  });
  await waitFor(() => expect(document.activeElement).toBe(find()));
}

function heading(level: 1 | 2, name: string) {
  return () => screen.getByRole("heading", { level, name });
}

describe("fokus etter handlinger på oppdragssiden", () => {
  it("flytter fokus til Din status etter at arbeideren godtar tilbudet", async () => {
    const user = userEvent.setup({ delay: null });
    openRequest("oppdrag-5", "person-8");

    await user.click(screen.getByRole("button", { name: "Godta" }));

    await expectFocusOn(heading(2, "Din status"));
  });

  it("flytter fokus til sidens overskrift etter at arbeideren avslår tilbudet", async () => {
    const user = userEvent.setup({ delay: null });
    openRequest("oppdrag-5", "person-8");

    await user.click(screen.getByRole("button", { name: "Avslå" }));

    await expectFocusOn(heading(1, "Lansere ny nettbutikk med kampanje"));
  });

  it("flytter fokus til sidens overskrift etter at arbeideren trekker seg", async () => {
    const user = userEvent.setup({ delay: null });
    openRequest("oppdrag-2", "person-12");

    await user.click(screen.getByRole("button", { name: "Trekk deg" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Trekk deg fra oppdraget",
      }),
    );

    await expectFocusOn(heading(1, "Hjelp med pakking og sending før jul"));
  });

  it("flytter fokus til Detaljer etter at eieren registrerer oppstart", async () => {
    const user = userEvent.setup({ delay: null });
    openRequest("oppdrag-2", "person-5");

    await user.click(
      screen.getByRole("button", { name: "Registrer oppstart" }),
    );
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Registrer",
      }),
    );

    await expectFocusOn(heading(2, "Detaljer"));
  });

  it("flytter fokus til Detaljer etter at eieren fullfører oppdraget", async () => {
    const user = userEvent.setup({ delay: null });
    openRequest("oppdrag-11", "person-4");

    await user.click(
      screen.getByRole("button", { name: "Marker som fullført" }),
    );
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByText("Ble fast ansettelse"));
    await user.click(
      within(dialog).getByRole("button", { name: "Fullfør oppdraget" }),
    );

    await expectFocusOn(heading(2, "Detaljer"));
  });

  it("flytter fokus til Detaljer etter at oppdraget avlyses", async () => {
    const user = userEvent.setup({ delay: null });
    openRequest("oppdrag-4", "person-1");

    await user.click(screen.getByRole("button", { name: "Avlys" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(
      within(dialog).getByRole("textbox", {
        name: "Hvorfor avlyses oppdraget?",
      }),
    );
    await user.paste("Oppdraget er ikke lenger aktuelt.");
    await user.click(
      within(dialog).getByRole("button", { name: "Avlys oppdraget" }),
    );

    await expectFocusOn(heading(2, "Detaljer"));
  });

  it("flytter fokus til Detaljer etter at administratoren gjør oppdraget åpent igjen", async () => {
    const user = userEvent.setup({ delay: null });
    openRequest("oppdrag-1", "person-15");

    await user.click(screen.getByRole("button", { name: "Gjør åpen igjen" }));

    await expectFocusOn(heading(2, "Detaljer"));
  });

  it("flytter fokus til Kortliste etter at eieren avviser hele kortlisten", async () => {
    const user = userEvent.setup({ delay: null });
    openRequest("oppdrag-8", "person-1");

    await user.click(
      screen.getByRole("button", { name: "Avvis hele kortlisten" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    await user.click(
      within(dialog).getByRole("textbox", {
        name: "Hvorfor passer ingen av disse?",
      }),
    );
    await user.paste("Ingen av dem passer.");
    await user.click(
      within(dialog).getByRole("button", { name: "Avvis kortlisten" }),
    );

    await expectFocusOn(heading(2, "Kortliste"));
  });
});

describe("fokus etter handlinger på Varodd-verktøy", () => {
  it("flytter fokus til overskriften når den siste i Til vurdering gjøres åpen igjen", async () => {
    const user = userEvent.setup({ delay: null });
    openAdmin();

    await user.click(screen.getByRole("button", { name: "Gjør åpen igjen" }));

    await expectFocusOn(heading(2, "Til vurdering"));
  });

  it("flytter fokus til overskriften når den siste i Til vurdering avlyses", async () => {
    const user = userEvent.setup({ delay: null });
    openAdmin();

    await user.click(screen.getByRole("button", { name: "Avlys" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(
      within(dialog).getByRole("textbox", {
        name: "Hvorfor avlyses oppdraget?",
      }),
    );
    await user.paste("Oppdraget er ikke lenger aktuelt.");
    await user.click(
      within(dialog).getByRole("button", { name: "Avlys oppdraget" }),
    );

    await expectFocusOn(heading(2, "Til vurdering"));
  });

  it("flytter fokus til neste person etter en NAV-henvisning", async () => {
    const user = userEvent.setup({ delay: null });
    openAdmin();
    const section = screen.getByRole("region", {
      name: "Simulert NAV-henvisning",
    });
    const items = within(section).getAllByRole("listitem");
    const first = items[0] as HTMLElement;
    const second = items[1] as HTMLElement;

    await user.click(
      within(first).getByRole("button", { name: "Henvis fra NAV (simulert)" }),
    );

    await expectFocusOn(() => second);
  });

  it("flytter fokus til overskriften etter den siste NAV-henvisningen", async () => {
    const user = userEvent.setup({ delay: null });
    openAdmin();
    const section = () =>
      screen.getByRole("region", { name: "Simulert NAV-henvisning" });

    for (let round = 0; round < 2; round += 1) {
      const first = within(section()).getAllByRole(
        "listitem",
      )[0] as HTMLElement;
      await user.click(
        within(first).getByRole("button", {
          name: "Henvis fra NAV (simulert)",
        }),
      );
    }

    await expectFocusOn(heading(2, "Simulert NAV-henvisning"));
  });
});
