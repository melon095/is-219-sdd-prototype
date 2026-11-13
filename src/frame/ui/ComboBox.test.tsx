import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { ComboBox, ComboBoxItem } from "./ComboBox";

const skills = [
  { id: "f1", name: "Produktfotografering" },
  { id: "f2", name: "Shopify-oppsett" },
  { id: "f3", name: "Regnskap" },
];

describe("ComboBox", () => {
  it("filtrerer ved skriving og velger med tastaturet", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ComboBox label="Ferdighet" items={skills} onSelectionChange={onChange}>
        {(item) => <ComboBoxItem>{item.name}</ComboBoxItem>}
      </ComboBox>,
    );

    const input = screen.getByRole<HTMLInputElement>("combobox", {
      name: "Ferdighet",
    });
    await user.type(input, "Shop");

    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]?.textContent).toBe("Shopify-oppsett");

    await user.keyboard("{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenLastCalledWith("f2");
    expect(input.value).toBe("Shopify-oppsett");
  });

  it("åpner listen med knappen", async () => {
    const user = userEvent.setup();
    render(
      <ComboBox label="Ferdighet" items={skills}>
        {(item) => <ComboBoxItem>{item.name}</ComboBoxItem>}
      </ComboBox>,
    );

    await user.click(screen.getByRole("button"));

    expect(await screen.findAllByRole("option")).toHaveLength(3);
  });

  it("viser feilmelding", () => {
    render(
      <ComboBox
        label="Ferdighet"
        items={skills}
        isInvalid
        errorMessage="Velg en ferdighet fra listen."
      >
        {(item) => <ComboBoxItem>{item.name}</ComboBoxItem>}
      </ComboBox>,
    );

    expect(screen.getByRole("combobox").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(screen.getByText("Velg en ferdighet fra listen.")).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = render(
      <ComboBox label="Ferdighet" items={skills} description="Søk i listen.">
        {(item) => <ComboBoxItem>{item.name}</ComboBoxItem>}
      </ComboBox>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
