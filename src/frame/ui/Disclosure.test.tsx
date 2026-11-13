import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { Disclosure } from "./Disclosure";

describe("Disclosure", () => {
  it("er lukket som standard og åpnes med knappen", async () => {
    const user = userEvent.setup();
    render(
      <Disclosure title="Vis meldingshistorikk">
        <p>Her er meldingene dine.</p>
      </Disclosure>,
    );

    const button = screen.getByRole("button", {
      name: "Vis meldingshistorikk",
    });
    expect(button.getAttribute("aria-expanded")).toBe("false");

    await user.click(button);

    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Her er meldingene dine.")).toBeTruthy();
  });

  it("kan åpnes og lukkes med tastaturet", async () => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    render(
      <Disclosure title="Detaljer" onExpandedChange={onExpandedChange}>
        <p>Flere detaljer.</p>
      </Disclosure>,
    );

    await user.tab();
    await user.keyboard("{Enter}");
    expect(onExpandedChange).toHaveBeenLastCalledWith(true);

    await user.keyboard(" ");
    expect(onExpandedChange).toHaveBeenLastCalledWith(false);
  });

  it("kan starte åpen", () => {
    render(
      <Disclosure title="Åpen" defaultExpanded>
        <p>Synlig innhold.</p>
      </Disclosure>,
    );

    expect(
      screen
        .getByRole("button", { name: "Åpen" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
    expect(screen.getByText("Synlig innhold.")).toBeTruthy();
  });

  it("har overskriftsnivå 3 som standard og kan få et annet nivå", () => {
    render(
      <>
        <Disclosure title="Standard">
          <p>Innhold.</p>
        </Disclosure>
        <Disclosure title="Nivå to" headingLevel={2}>
          <p>Innhold.</p>
        </Disclosure>
      </>,
    );

    expect(
      screen.getByRole("heading", { level: 3, name: "Standard" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "Nivå to" }),
    ).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = render(
      <>
        <Disclosure title="Lukket">
          <p>Skjult innhold.</p>
        </Disclosure>
        <Disclosure title="Åpen" defaultExpanded>
          <p>Synlig innhold.</p>
        </Disclosure>
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
