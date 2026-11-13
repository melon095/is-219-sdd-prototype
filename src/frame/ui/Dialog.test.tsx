import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { DialogTrigger } from "react-aria-components";
import { describe, expect, it, vi } from "vitest";
import { AlertDialog } from "./AlertDialog";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

describe("Dialog", () => {
  it("fanger fokus, lukkes med Escape og gir fokus tilbake til knappen", async () => {
    const user = userEvent.setup();
    render(
      <DialogTrigger>
        <Button>Registrer oppstart</Button>
        <Dialog title="Registrer oppstart">
          {({ close }) => (
            <>
              <p>Når startet arbeidet?</p>
              <Button onPress={close}>Lagre</Button>
              <Button variant="secondary" onPress={close}>
                Avbryt
              </Button>
            </>
          )}
        </Dialog>
      </DialogTrigger>,
    );

    const trigger = screen.getByRole("button", { name: "Registrer oppstart" });
    await user.click(trigger);

    const dialog = await screen.findByRole("dialog", {
      name: "Registrer oppstart",
    });
    const save = screen.getByRole("button", { name: "Lagre" });
    const cancel = screen.getByRole("button", { name: "Avbryt" });

    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );
    await user.tab();
    await user.tab();
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect([save, cancel, dialog]).toContain(document.activeElement);

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const user = userEvent.setup();
    render(
      <DialogTrigger>
        <Button>Åpne</Button>
        <Dialog title="Et spørsmål">
          <p>Innhold i dialogen.</p>
        </Dialog>
      </DialogTrigger>,
    );

    await user.click(screen.getByRole("button", { name: "Åpne" }));
    await screen.findByRole("dialog");

    expect(await axe(document.body)).toHaveNoViolations();
  });
});

describe("AlertDialog", () => {
  it("bekrefter og avbryter", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <DialogTrigger>
        <Button>Tilbakestill demo</Button>
        <AlertDialog
          title="Tilbakestill demo"
          text="Vil du tilbakestille demoen? Alle endringer i denne nettleseren blir slettet."
          confirmLabel="Tilbakestill"
          cancelLabel="Avbryt"
          onConfirm={onConfirm}
        />
      </DialogTrigger>,
    );

    const trigger = screen.getByRole("button", { name: "Tilbakestill demo" });
    await user.click(trigger);
    const dialog = await screen.findByRole("alertdialog", {
      name: "Tilbakestill demo",
    });
    expect(dialog.textContent).toContain(
      "Vil du tilbakestille demoen? Alle endringer i denne nettleseren blir slettet.",
    );

    await user.click(screen.getByRole("button", { name: "Avbryt" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBe(null));
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(trigger);
    await screen.findByRole("alertdialog");
    await user.click(screen.getByRole("button", { name: "Tilbakestill" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBe(null));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(undefined);
  });

  it("krever en grunn før du kan bekrefte når reasonLabel er satt", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <DialogTrigger>
        <Button>Avvis hele kortlisten</Button>
        <AlertDialog
          title="Avvis hele kortlisten"
          text="Fortell oss hvorfor, så finner vi bedre kandidater neste gang."
          confirmLabel="Avvis"
          cancelLabel="Avbryt"
          reasonLabel="Hvorfor passer ingen av disse?"
          onConfirm={onConfirm}
        />
      </DialogTrigger>,
    );

    await user.click(
      screen.getByRole("button", { name: "Avvis hele kortlisten" }),
    );
    await screen.findByRole("alertdialog");

    const confirm = screen.getByRole<HTMLButtonElement>("button", {
      name: "Avvis",
    });
    expect(confirm.disabled).toBe(true);

    const reason = screen.getByRole<HTMLTextAreaElement>("textbox", {
      name: "Hvorfor passer ingen av disse?",
    });
    expect(reason.required).toBe(true);
    expect(reason.maxLength).toBe(1000);

    await user.type(reason, "Ingen har erfaring med Shopify.");
    expect(confirm.disabled).toBe(false);

    await user.clear(reason);
    expect(confirm.disabled).toBe(true);

    await user.type(reason, "Ingen har erfaring med Shopify.");
    await user.click(confirm);

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBe(null));
    expect(onConfirm).toHaveBeenCalledWith("Ingen har erfaring med Shopify.");
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const user = userEvent.setup();
    render(
      <DialogTrigger>
        <Button>Avlys</Button>
        <AlertDialog
          title="Avlys oppdraget"
          text="Er du sikker?"
          confirmLabel="Avlys"
          cancelLabel="Avbryt"
          reasonLabel="Hvorfor avlyser du?"
          onConfirm={() => undefined}
        />
      </DialogTrigger>,
    );

    await user.click(screen.getByRole("button", { name: "Avlys" }));
    await screen.findByRole("alertdialog");

    expect(await axe(document.body)).toHaveNoViolations();
  });
});
