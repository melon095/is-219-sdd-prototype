import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { features } from "../../app/features";
import { renderFrame } from "../test-utils";
import { PageHeading } from "../ui/PageHeading";
import { MobileMenu } from "./MobileMenu";

const pages = [
  { index: true, element: <PageHeading>Hjem</PageHeading> },
  { path: "/oppdrag", element: <PageHeading>Oppdrag</PageHeading> },
];

describe("MobileMenu", () => {
  it("åpner en dialog med funksjonsknapper, brukerbytte og Tilbakestill demo", async () => {
    const user = userEvent.setup();
    renderFrame(<MobileMenu />, { layout: "mobile", pages });

    await user.click(screen.getByRole("button", { name: "Meny" }));

    const dialog = await screen.findByRole("dialog", { name: "Meny" });
    const names = within(dialog)
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(names).toEqual([
      "Hjem",
      ...features.map((feature) => feature.label),
    ]);
    expect(
      within(dialog).getByRole("button", { name: /Bytt bruker/ }),
    ).toBeTruthy();
    expect(
      within(dialog).getByRole("button", { name: "Tilbakestill demo" }),
    ).toBeTruthy();
  });

  it("fanger fokus mens menyen er åpen", async () => {
    const user = userEvent.setup();
    renderFrame(<MobileMenu />, { layout: "mobile", pages });

    await user.click(screen.getByRole("button", { name: "Meny" }));
    const dialog = await screen.findByRole("dialog", { name: "Meny" });
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );

    for (let step = 0; step < 8; step += 1) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it("lukkes med Escape og gir fokus tilbake til Meny", async () => {
    const user = userEvent.setup();
    renderFrame(<MobileMenu />, { layout: "mobile", pages });
    const trigger = screen.getByRole("button", { name: "Meny" });

    await user.click(trigger);
    await screen.findByRole("dialog", { name: "Meny" });
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("navigerer, lukker menyen og flytter fokus til sidens h1", async () => {
    const user = userEvent.setup();
    const { router } = renderFrame(<MobileMenu />, {
      layout: "mobile",
      pages,
    });

    await user.click(screen.getByRole("button", { name: "Meny" }));
    const dialog = await screen.findByRole("dialog", { name: "Meny" });
    await user.click(within(dialog).getByRole("link", { name: "Oppdrag" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    const heading = await screen.findByRole("heading", {
      level: 1,
      name: "Oppdrag",
    });
    expect(router.state.location.pathname).toBe("/oppdrag");
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const user = userEvent.setup();
    renderFrame(<MobileMenu />, { layout: "mobile", pages });

    await user.click(screen.getByRole("button", { name: "Meny" }));
    await screen.findByRole("dialog", { name: "Meny" });

    expect(await axe(document.body)).toHaveNoViolations();
  });
});
