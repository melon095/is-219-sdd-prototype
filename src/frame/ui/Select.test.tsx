import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { Select, SelectItem, SelectSection } from "./Select";

function Example({ onChange }: { onChange?: (key: unknown) => void }) {
  return (
    <Select label="Enhet" onSelectionChange={onChange}>
      <SelectItem id="weeks">uker</SelectItem>
      <SelectItem id="months">måneder</SelectItem>
    </Select>
  );
}

describe("Select", () => {
  it("åpner listen og velger et alternativ", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Example onChange={onChange} />);

    const trigger = screen.getByRole("button", { name: /Enhet/ });
    await user.click(trigger);
    const listbox = await screen.findByRole("listbox");
    expect(listbox).toBeTruthy();
    await user.click(screen.getByRole("option", { name: "måneder" }));

    expect(onChange).toHaveBeenLastCalledWith("months");
    expect(trigger.textContent).toContain("måneder");
  });

  it("grupperer alternativer i seksjoner", async () => {
    const user = userEvent.setup();
    render(
      <Select label="Bytt bruker">
        <SelectSection title="Bedriftseiere">
          <SelectItem id="p1">Kari Nordmann</SelectItem>
        </SelectSection>
        <SelectSection title="Arbeidssøkere">
          <SelectItem id="p2">Ola Hansen</SelectItem>
        </SelectSection>
      </Select>,
    );

    await user.click(screen.getByRole("button", { name: /Bytt bruker/ }));

    const groups = await screen.findAllByRole("group");
    expect(groups).toHaveLength(2);
    expect(screen.getByRole("group", { name: "Bedriftseiere" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Arbeidssøkere" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Ola Hansen" })).toBeTruthy();
  });

  it("viser feilmelding og beskrivelse", () => {
    render(
      <Select
        label="Enhet"
        description="Velg uker eller måneder."
        isInvalid
        errorMessage="Du må velge en enhet."
      >
        <SelectItem id="weeks">uker</SelectItem>
      </Select>,
    );

    expect(screen.getByText("Velg uker eller måneder.")).toBeTruthy();
    expect(screen.getByText("Du må velge en enhet.")).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = render(<Example />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
