import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { LiveAnnouncer, useAnnounce } from "./LiveAnnouncer";

function Trigger({ message }: { message: string }) {
  const announce = useAnnounce();
  return (
    <button type="button" onClick={() => announce(message)}>
      Kunngjør
    </button>
  );
}

function region(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>("[aria-live]");
  if (!element) {
    throw new Error("Fant ikke live-området");
  }
  return element;
}

describe("LiveAnnouncer", () => {
  it("viser ett skjult område med aria-live polite", () => {
    const { container } = render(
      <LiveAnnouncer>
        <p>Innhold</p>
      </LiveAnnouncer>,
    );

    const live = container.querySelectorAll("[aria-live]");
    expect(live).toHaveLength(1);
    expect(live[0]?.getAttribute("aria-live")).toBe("polite");
    expect(live[0]?.classList.contains("visually-hidden")).toBe(true);
    expect(live[0]?.textContent).toBe("");
  });

  it("setter teksten når useAnnounce kalles", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <LiveAnnouncer>
        <Trigger message="Du ser nå prototypen som Kari Nordmann" />
      </LiveAnnouncer>,
    );

    await user.click(screen.getByRole("button", { name: "Kunngjør" }));

    expect(region(container).textContent).toBe(
      "Du ser nå prototypen som Kari Nordmann",
    );
  });

  it("kunngjør samme melding på nytt som et nytt element", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <LiveAnnouncer>
        <Trigger message="Demoen er tilbakestilt" />
      </LiveAnnouncer>,
    );

    const button = screen.getByRole("button", { name: "Kunngjør" });
    await user.click(button);
    const first = region(container).firstElementChild;
    await user.click(button);
    const second = region(container).firstElementChild;

    expect(region(container).textContent).toBe("Demoen er tilbakestilt");
    expect(second).not.toBe(first);
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = render(
      <LiveAnnouncer>
        <Trigger message="Lagret" />
      </LiveAnnouncer>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
