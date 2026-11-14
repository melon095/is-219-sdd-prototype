import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOTICE_KEY } from "../store/persistence";
import { brokenStorage, memoryStorage } from "../test-utils";
import { PrototypeNotice } from "./PrototypeNotice";

const paragraphs = [
  "Denne nettsiden er ikke laget av Varodd, og den har ingen tilknytning til Varodd. Den er en prototype, laget som et studentprosjekt.",
  "Alle personer, bedrifter, oppdrag, spørsmål og svar her er oppdiktet. De viser ikke til noen ekte personer eller bedrifter.",
  "Det du endrer, lagres bare i din egen nettleser. Ingenting blir sendt noe sted.",
];

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function setup() {
  return userEvent.setup();
}

function confirmButton() {
  return screen.getByRole<HTMLButtonElement>("button", {
    name: "Jeg forstår",
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PrototypeNotice", () => {
  it("shows a dialog named by its title with the three paragraphs", () => {
    render(<PrototypeNotice storage={memoryStorage()} />);
    const dialog = screen.getByRole("dialog", {
      name: "Dette er en prototype",
    });
    for (const text of paragraphs) {
      expect(within(dialog).getByText(text)).toBeTruthy();
    }
  });

  it("disables the button and counts down in text while waiting", () => {
    render(<PrototypeNotice storage={memoryStorage()} />);
    expect(confirmButton().disabled).toBe(true);
    expect(screen.getByText("Du kan gå videre om 5 sekunder.")).toBeTruthy();

    advance(3000);
    expect(screen.getByText("Du kan gå videre om 2 sekunder.")).toBeTruthy();

    advance(1000);
    expect(screen.getByText("Du kan gå videre om 1 sekund.")).toBeTruthy();

    advance(900);
    expect(confirmButton().disabled).toBe(true);

    advance(100);
    expect(confirmButton().disabled).toBe(false);
  });

  it("keeps the countdown out of any live region", () => {
    render(<PrototypeNotice storage={memoryStorage()} />);
    const countdown = screen.getByText("Du kan gå videre om 5 sekunder.");
    expect(countdown.closest('[role="status"], [aria-live]')).toBe(null);
  });

  it("announces that the visitor can continue only once the wait is over", () => {
    render(<PrototypeNotice storage={memoryStorage()} />);
    const dialog = screen.getByRole("dialog");
    const status = within(dialog).getByRole("status");
    expect(status.textContent).toBe("");

    advance(4900);
    expect(status.textContent).toBe("");

    advance(100);
    expect(status.textContent).toBe("Nå kan du gå videre.");
    expect(screen.queryByText(/Du kan gå videre om/)).toBe(null);
  });

  it("ignores Escape before and after the wait", async () => {
    const user = setup();
    render(<PrototypeNotice storage={memoryStorage()} />);

    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeTruthy();

    advance(5000);
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("closes on the button, saves the confirmation and focuses the page heading", async () => {
    const user = setup();
    const storage = memoryStorage();
    render(
      <>
        <h1 tabIndex={-1}>Hjem</h1>
        <PrototypeNotice storage={storage} />
      </>,
    );
    advance(5000);

    await user.click(confirmButton());

    expect(screen.queryByRole("dialog")).toBe(null);
    expect(storage.getItem(NOTICE_KEY)).toBe("true");
    advance(100);
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { level: 1 }),
    );
  });

  it("enables the button after a long jump in time, as in a throttled background tab", () => {
    render(<PrototypeNotice storage={memoryStorage()} />);
    act(() => {
      vi.setSystemTime(Date.now() + 5000);
      vi.advanceTimersByTime(1000);
    });
    expect(confirmButton().disabled).toBe(false);
  });

  it("has no accessibility violations while waiting and while ready", async () => {
    render(<PrototypeNotice storage={memoryStorage()} />);
    expect(await axe(document.body)).toHaveNoViolations();

    advance(5000);
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it("renders nothing when the notice was confirmed earlier", () => {
    render(
      <PrototypeNotice storage={memoryStorage({ [NOTICE_KEY]: "true" })} />,
    );
    expect(screen.queryByRole("dialog")).toBe(null);
  });

  it("still closes, and stays closed, when the confirmation cannot be saved", async () => {
    const user = setup();
    const storage = brokenStorage();
    const { rerender } = render(<PrototypeNotice storage={storage} />);
    advance(5000);

    await user.click(confirmButton());
    expect(screen.queryByRole("dialog")).toBe(null);

    rerender(<PrototypeNotice storage={storage} />);
    expect(screen.queryByRole("dialog")).toBe(null);
  });

  it.each(["false", "{"])(
    "shows the dialog when the stored text is %s",
    (text) => {
      render(
        <PrototypeNotice storage={memoryStorage({ [NOTICE_KEY]: text })} />,
      );
      expect(screen.getByRole("dialog")).toBeTruthy();
    },
  );
});
