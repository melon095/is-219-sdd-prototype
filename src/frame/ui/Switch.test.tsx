import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { Switch } from "./Switch";

describe("Switch", () => {
  it("slår av og på", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Switch onChange={onChange}>
        Vi vil gjerne få forslag fra en simulert gjennomgang
      </Switch>,
    );

    const toggle = screen.getByRole<HTMLInputElement>("switch", {
      name: "Vi vil gjerne få forslag fra en simulert gjennomgang",
    });
    expect(toggle.checked).toBe(false);
    await user.click(toggle);

    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(toggle.checked).toBe(true);
  });

  it("kan slås på med mellomromstasten", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch onChange={onChange}>Vis alle</Switch>);

    await user.tab();
    await user.keyboard(" ");

    expect(onChange).toHaveBeenLastCalledWith(true);
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = render(
      <>
        <Switch defaultSelected>På</Switch>
        <Switch isDisabled>Låst</Switch>
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
