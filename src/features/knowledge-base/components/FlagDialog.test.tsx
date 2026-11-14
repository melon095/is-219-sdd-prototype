import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { people } from "../../../domain/knowledge-base/testState";
import type { TargetKind } from "../../../domain/knowledge-base/types";
import { testNow } from "../../../frame/test-utils";
import { renderPage } from "../../marketplace/pages/renderPage";
import { moderationState } from "../testFixtures";
import { FlagDialog } from "./FlagDialog";

function open(
  userId: string,
  targetKind: TargetKind = "answer",
  targetId = "svar-1",
) {
  return renderPage(<FlagDialog target={{ targetKind, targetId }} />, {
    path: "test",
    route: "/test",
    userId,
    state: moderationState(),
  });
}

const noteLabel = "Fortell kort hva som er galt";

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Flagg" }));
  return screen.findByRole("dialog", { name: "Flagg innlegget" });
}

describe("FlagDialog", () => {
  it("viser Flagg som knapp for et medlem som ikke har skrevet innlegget", () => {
    open(people.kari);

    expect(screen.getByRole("button", { name: "Flagg" })).toBeTruthy();
    expect(screen.queryByText("Du har flagget dette")).toBe(null);
  });

  it("åpner en dialog med grunner og et felt for en kort forklaring", async () => {
    const user = userEvent.setup({ delay: null });
    open(people.kari);

    const dialog = await openDialog(user);

    const group = within(dialog).getByRole("radiogroup", {
      name: "Hva er galt?",
    });
    for (const label of [
      "Utdatert",
      "Feil",
      "Spam",
      "Ikke relevant",
      "Annet",
    ]) {
      expect(within(group).getByRole("radio", { name: label })).toBeTruthy();
    }
    const note = within(dialog).getByRole<HTMLTextAreaElement>("textbox", {
      name: noteLabel,
    });
    expect(note.required).toBe(false);
    expect(within(dialog).getByRole("button", { name: "Send" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Avbryt" })).toBeTruthy();
  });

  it("gjør forklaringen påkrevd når Annet er valgt", async () => {
    const user = userEvent.setup({ delay: null });
    open(people.kari);
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByText("Annet"));

    expect(
      within(dialog).getByRole<HTMLTextAreaElement>("textbox", {
        name: noteLabel,
      }).required,
    ).toBe(true);
  });

  it("sender flagget, lukker dialogen, kunngjør meldingen og flytter fokus til Du har flagget dette", async () => {
    const user = userEvent.setup({ delay: null });
    const { store } = open(people.kari);
    const before = store.getState().knowledgeBase.flags.length;
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByText("Utdatert"));
    await user.click(within(dialog).getByRole("button", { name: "Send" }));

    const flags = store.getState().knowledgeBase.flags;
    expect(flags).toHaveLength(before + 1);
    expect(flags.at(-1)).toMatchObject({
      targetKind: "answer",
      targetId: "svar-1",
      flaggedBy: people.kari,
      reason: "outdated",
      at: testNow,
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    expect(
      await screen.findByText("Takk! Varodd ser på det du har flagget."),
    ).toBeTruthy();
    const done = screen.getByText("Du har flagget dette");
    expect(screen.queryByRole("button", { name: "Flagg" })).toBe(null);
    expect(screen.queryByRole("button", { name: /Du har flagget/ })).toBe(null);
    await waitFor(() => expect(document.activeElement).toBe(done));
  });

  it("krever en forklaring for Annet og sender den trimmet", async () => {
    const user = userEvent.setup({ delay: null });
    const { store } = open(people.kari);
    const before = store.getState().knowledgeBase.flags.length;
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByText("Annet"));
    await user.click(within(dialog).getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(within(dialog).getAllByText(noteLabel)).toHaveLength(2),
    );
    expect(store.getState().knowledgeBase.flags).toHaveLength(before);
    expect(
      screen.getByRole("dialog", { name: "Flagg innlegget" }),
    ).toBeTruthy();

    await user.type(
      within(dialog).getByRole("textbox", { name: noteLabel }),
      "  Gammel pris.  ",
    );
    await user.click(within(dialog).getByRole("button", { name: "Send" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    const stored = store.getState().knowledgeBase.flags.at(-1);
    expect(stored?.reason).toBe("other");
    expect(stored?.note).toBe("Gammel pris.");
  });

  it("ber om en grunn når ingen er valgt", async () => {
    const user = userEvent.setup({ delay: null });
    const { store } = open(people.kari);
    const before = store.getState().knowledgeBase.flags.length;
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByRole("button", { name: "Send" }));

    expect(
      await within(dialog).findByText("Velg hva som er galt"),
    ).toBeTruthy();
    expect(store.getState().knowledgeBase.flags).toHaveLength(before);
  });

  it("endrer ingenting med Avbryt og gir fokus tilbake til Flagg", async () => {
    const user = userEvent.setup({ delay: null });
    const { store } = open(people.kari);
    const before = store.getState().knowledgeBase.flags.length;
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByText("Spam"));
    await user.click(within(dialog).getByRole("button", { name: "Avbryt" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    expect(store.getState().knowledgeBase.flags).toHaveLength(before);
    const trigger = screen.getByRole("button", { name: "Flagg" });
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(screen.queryByText("Du har flagget dette")).toBe(null);
  });

  it("vises ikke for forfatteren, administratorer, ikke-medlemmer eller fjernet innhold", () => {
    const cases: [string, TargetKind, string][] = [
      [people.ola, "answer", "svar-2"],
      [people.jonas, "question", "sporsmal-1"],
      [people.marte, "answer", "svar-1"],
      [people.anne, "answer", "svar-1"],
      [people.per, "answer", "svar-3"],
    ];
    for (const [userId, kind, targetId] of cases) {
      const { container, unmount } = open(userId, kind, targetId);
      expect(container.querySelector("button"), userId).toBe(null);
      expect(screen.queryByText("Du har flagget dette"), userId).toBe(null);
      unmount();
    }
  });

  it("viser Du har flagget dette til den som allerede har flagget, men Flagg til andre", () => {
    const first = open(people.per, "question", "sporsmal-1");
    expect(screen.getByText("Du har flagget dette")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Flagg" })).toBe(null);
    first.unmount();

    const second = open(people.per, "answer", "svar-2");
    expect(screen.getByRole("button", { name: "Flagg" })).toBeTruthy();
    expect(screen.queryByText("Du har flagget dette")).toBe(null);
    second.unmount();
  });

  it("har ingen tilgjengelighetsfeil lukket, åpen og etter flagging", async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = open(people.kari);
    expect(await axe(container)).toHaveNoViolations();

    const dialog = await openDialog(user);
    expect(await axe(document.body)).toHaveNoViolations();

    await user.click(within(dialog).getByText("Feil"));
    await user.click(within(dialog).getByRole("button", { name: "Send" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    expect(await axe(container)).toHaveNoViolations();
  });
});
