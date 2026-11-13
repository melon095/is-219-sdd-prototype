import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { Radio, RadioGroup } from "./RadioGroup";

describe("RadioGroup", () => {
  it("lar deg velge ett alternativ", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RadioGroup label="Arbeidssted" onChange={onChange}>
        <Radio value="remote">Fjernarbeid</Radio>
        <Radio value="onsite">På stedet</Radio>
      </RadioGroup>,
    );

    expect(
      screen.getByRole("radiogroup", { name: "Arbeidssted" }),
    ).toBeTruthy();
    await user.click(screen.getByRole("radio", { name: "På stedet" }));

    expect(onChange).toHaveBeenLastCalledWith("onsite");
    expect(
      screen.getByRole<HTMLInputElement>("radio", { name: "På stedet" })
        .checked,
    ).toBe(true);
  });

  it("kan styres med piltastene", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RadioGroup label="Erfaring" onChange={onChange}>
        <Radio value="junior">Junior</Radio>
        <Radio value="mid">Erfaren</Radio>
        <Radio value="senior">Senior</Radio>
      </RadioGroup>,
    );

    await user.tab();
    await user.keyboard("{ArrowDown}");

    expect(onChange).toHaveBeenLastCalledWith("mid");
  });

  it("viser beskrivelse og feilmelding", () => {
    render(
      <RadioGroup
        label="Arbeidssted"
        description="Hvor skal arbeidet gjøres?"
        isInvalid
        errorMessage="Velg et arbeidssted."
      >
        <Radio value="remote">Fjernarbeid</Radio>
      </RadioGroup>,
    );

    const group = screen.getByRole("radiogroup");
    expect(group.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Hvor skal arbeidet gjøres?")).toBeTruthy();
    expect(screen.getByText("Velg et arbeidssted.")).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = render(
      <RadioGroup label="Arbeidssted" defaultValue="remote">
        <Radio value="remote">Fjernarbeid</Radio>
        <Radio value="onsite">På stedet</Radio>
        <Radio value="hybrid" isDisabled>
          Begge deler
        </Radio>
      </RadioGroup>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
