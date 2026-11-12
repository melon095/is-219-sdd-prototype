import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { TimeDebugButton } from "./TimeDebugButton";

describe("TimeDebugButton", () => {
  it("viser Demo: foran teksten og har demo-klassen", () => {
    render(
      <TimeDebugButton
        label="Simuler at 7 dager har gått"
        onPress={() => undefined}
      />,
    );

    const button = screen.getByRole("button", {
      name: "Demo: Simuler at 7 dager har gått",
    });
    expect(button.textContent).toBe("Demo: Simuler at 7 dager har gått");
    expect(button.classList.contains("time-debug-button")).toBe(true);
  });

  it("har et klokkeikon som er skjult for skjermlesere", () => {
    render(<TimeDebugButton label="Spol frem" onPress={() => undefined} />);

    const icon = screen
      .getByRole("button")
      .querySelector('svg[aria-hidden="true"]');
    expect(icon).not.toBe(null);
  });

  it("kaller onPress", async () => {
    const user = userEvent.setup();
    const onPress = vi.fn();
    render(<TimeDebugButton label="Spol frem" onPress={onPress} />);

    await user.click(screen.getByRole("button"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = render(
      <TimeDebugButton label="Spol frem" onPress={() => undefined} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
