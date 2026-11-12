import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { Menu, MenuItem } from "./Menu";

function Example({ onAction }: { onAction?: (key: unknown) => void }) {
  return (
    <Menu label="Handlinger" onAction={(key) => onAction?.(key)}>
      <MenuItem id="edit">Rediger oppdrag</MenuItem>
      <MenuItem id="cancel">Avlys oppdrag</MenuItem>
      <MenuItem id="archive" isDisabled>
        Arkiver
      </MenuItem>
    </Menu>
  );
}

describe("Menu", () => {
  it("åpner menyen og kaller onAction med valgt element", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<Example onAction={onAction} />);

    const trigger = screen.getByRole("button", { name: "Handlinger" });
    expect(trigger.getAttribute("aria-haspopup")).toBe("true");
    await user.click(trigger);

    expect(await screen.findByRole("menu")).toBeTruthy();
    await user.click(screen.getByRole("menuitem", { name: "Avlys oppdrag" }));

    expect(onAction).toHaveBeenCalledWith("cancel");
    await waitFor(() => expect(screen.queryByRole("menu")).toBe(null));
  });

  it("kan styres med tastaturet og lukkes med Escape", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<Example onAction={onAction} />);

    const trigger = screen.getByRole("button", { name: "Handlinger" });
    await user.tab();
    await user.keyboard("{Enter}");
    await screen.findByRole("menu");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onAction).toHaveBeenCalledWith("cancel");

    await user.keyboard("{Enter}");
    await screen.findByRole("menu");
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("menu")).toBe(null));
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("viser deaktiverte elementer som utilgjengelige", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("button", { name: "Handlinger" }));
    await screen.findByRole("menu");

    expect(
      screen
        .getByRole("menuitem", { name: "Arkiver" })
        .getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const user = userEvent.setup();
    const { container } = render(<Example />);

    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole("button", { name: "Handlinger" }));
    await screen.findByRole("menu");

    expect(await axe(document.body)).toHaveNoViolations();
  });
});
