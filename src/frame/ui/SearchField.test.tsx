import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SearchField } from "./SearchField";
import { accessibleDescription } from "./test-helpers";

function Controlled({
  onSubmit,
  onChange,
}: {
  onSubmit?: (value: string) => void;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <SearchField
      label="Søk i forumet"
      description="Skriv noen ord."
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      onSubmit={onSubmit}
    />
  );
}

describe("SearchField", () => {
  it("kobler etikett og beskrivelse til feltet og tar imot tekst", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    const input = screen.getByRole<HTMLInputElement>("searchbox", {
      name: "Søk i forumet",
    });
    expect(accessibleDescription(input)).toBe("Skriv noen ord.");
    await user.type(input, "nettbutikk");

    expect(onChange).toHaveBeenLastCalledWith("nettbutikk");
    expect(input.value).toBe("nettbutikk");
  });

  it("sender søket når du trykker Enter", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Controlled onSubmit={onSubmit} />);

    await user.type(screen.getByRole("searchbox"), "frakt{Enter}");

    expect(onSubmit).toHaveBeenCalledWith("frakt");
  });

  it("tømmer feltet med knappen Tøm søket", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const input = screen.getByRole<HTMLInputElement>("searchbox");

    await user.type(input, "frakt");
    await user.click(screen.getByRole("button", { name: "Tøm søket" }));

    expect(input.value).toBe("");
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("tømmer feltet med Escape", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const input = screen.getByRole<HTMLInputElement>("searchbox");

    await user.type(input, "frakt");
    await user.keyboard("{Escape}");

    expect(input.value).toBe("");
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const user = userEvent.setup();
    const { container } = render(<Controlled />);
    expect(await axe(container)).toHaveNoViolations();

    await user.type(screen.getByRole("searchbox"), "frakt");
    expect(await axe(container)).toHaveNoViolations();
  });
});
