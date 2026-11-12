import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("kaller onPress når den trykkes", async () => {
    const user = userEvent.setup();
    const onPress = vi.fn();
    render(<Button onPress={onPress}>Lagre</Button>);

    await user.click(screen.getByRole("button", { name: "Lagre" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("kan brukes med tastaturet", async () => {
    const user = userEvent.setup();
    const onPress = vi.fn();
    render(<Button onPress={onPress}>Send</Button>);

    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Send" }),
    );
    await user.keyboard("{Enter}");

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("er primær som standard og kan være sekundær eller stille", () => {
    render(
      <>
        <Button>Primær</Button>
        <Button variant="secondary">Sekundær</Button>
        <Button variant="quiet">Stille</Button>
      </>,
    );

    const primary = screen.getByRole("button", { name: "Primær" });
    expect(primary.getAttribute("data-variant")).toBe("primary");
    expect(primary.classList.contains("react-aria-Button")).toBe(true);
    expect(
      screen
        .getByRole("button", { name: "Sekundær" })
        .getAttribute("data-variant"),
    ).toBe("secondary");
    expect(
      screen
        .getByRole("button", { name: "Stille" })
        .getAttribute("data-variant"),
    ).toBe("quiet");
  });

  it("gjør ingenting når den er deaktivert", async () => {
    const user = userEvent.setup();
    const onPress = vi.fn();
    render(
      <Button isDisabled onPress={onPress}>
        Avbryt
      </Button>,
    );

    const button = screen.getByRole<HTMLButtonElement>("button", {
      name: "Avbryt",
    });
    expect(button.disabled).toBe(true);
    await user.click(button);

    expect(onPress).not.toHaveBeenCalled();
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = render(
      <>
        <Button>Lagre</Button>
        <Button variant="secondary">Avbryt</Button>
        <Button variant="quiet" isDisabled>
          Slett
        </Button>
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
