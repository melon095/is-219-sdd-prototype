import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { createTestStore, renderFrame } from "../test-utils";
import { PageHeading } from "../ui/PageHeading";
import { ResetDemoButton } from "./ResetDemoButton";

const pages = [
  { index: true, element: <PageHeading>Hjem</PageHeading> },
  { path: "/oppdrag", element: <PageHeading>Oppdrag</PageHeading> },
];

describe("ResetDemoButton", () => {
  it("åpner en dialog med spørsmålet og to knapper", async () => {
    const user = userEvent.setup();
    renderFrame(<ResetDemoButton />, { pages });

    await user.click(screen.getByRole("button", { name: "Tilbakestill demo" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain(
      "Vil du tilbakestille demoen? Alle endringer i denne nettleseren blir slettet.",
    );
    expect(screen.getByRole("button", { name: "Tilbakestill" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Avbryt" })).toBeTruthy();
  });

  it("endrer ingenting ved Avbryt", async () => {
    const user = userEvent.setup();
    const store = createTestStore();
    const reset = vi.spyOn(store, "reset");
    const { router } = renderFrame(<ResetDemoButton />, {
      store,
      route: "/oppdrag",
      pages,
    });

    await user.click(screen.getByRole("button", { name: "Tilbakestill demo" }));
    await screen.findByRole("alertdialog");
    await user.click(screen.getByRole("button", { name: "Avbryt" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBe(null));
    expect(reset).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toBe("/oppdrag");
  });

  it("tilbakestiller, går til forsiden og leser opp at demoen er tilbakestilt", async () => {
    const user = userEvent.setup();
    const store = createTestStore();
    const reset = vi.spyOn(store, "reset");
    const { router } = renderFrame(<ResetDemoButton />, {
      store,
      route: "/oppdrag",
      pages,
    });

    await user.click(screen.getByRole("button", { name: "Tilbakestill demo" }));
    await screen.findByRole("alertdialog");
    await user.click(screen.getByRole("button", { name: "Tilbakestill" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBe(null));
    expect(reset).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(await screen.findByText("Demoen er tilbakestilt")).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const user = userEvent.setup();
    const { container } = renderFrame(<ResetDemoButton />, { pages });

    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole("button", { name: "Tilbakestill demo" }));
    await screen.findByRole("alertdialog");
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
