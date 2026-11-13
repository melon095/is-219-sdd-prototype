import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { NumberField } from "./NumberField";
import { TextArea } from "./TextArea";
import { TextField } from "./TextField";
import { accessibleDescription } from "./test-helpers";

describe("TextField", () => {
  it("kobler etikett, beskrivelse og verdi til feltet", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TextField
        label="Tittel"
        description="Kort og tydelig."
        onChange={onChange}
      />,
    );

    const input = screen.getByRole<HTMLInputElement>("textbox", {
      name: "Tittel",
    });
    expect(accessibleDescription(input)).toBe("Kort og tydelig.");
    await user.type(input, "Ny nettbutikk");

    expect(onChange).toHaveBeenLastCalledWith("Ny nettbutikk");
    expect(input.value).toBe("Ny nettbutikk");
  });

  it("viser feilmeldingen og merker feltet som ugyldig", () => {
    render(
      <TextField
        label="Tittel"
        isInvalid
        errorMessage="Tittelen må være mellom 1 og 100 tegn."
      />,
    );

    const input = screen.getByRole("textbox", { name: "Tittel" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(accessibleDescription(input)).toBe(
      "Tittelen må være mellom 1 og 100 tegn.",
    );
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = render(
      <>
        <TextField label="Tittel" description="Kort og tydelig." />
        <TextField label="Navn" isInvalid errorMessage="Skriv inn navnet." />
        <TextField label="Låst" isDisabled defaultValue="Kan ikke endres" />
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("TextArea", () => {
  it("rendres som et flerlinjet felt med etikett", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TextArea
        label="Beskrivelse"
        description="Fortell hva du trenger hjelp til."
        onChange={onChange}
      />,
    );

    const field = screen.getByRole("textbox", { name: "Beskrivelse" });
    expect(field.tagName).toBe("TEXTAREA");
    expect(accessibleDescription(field)).toBe(
      "Fortell hva du trenger hjelp til.",
    );
    await user.type(field, "Vi trenger nye produktbilder.");

    expect(onChange).toHaveBeenLastCalledWith("Vi trenger nye produktbilder.");
  });

  it("viser feilmeldingen", () => {
    render(
      <TextArea
        label="Beskrivelse"
        isInvalid
        errorMessage="Beskrivelsen kan ikke være tom."
      />,
    );

    const field = screen.getByRole("textbox", { name: "Beskrivelse" });
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Beskrivelsen kan ikke være tom.")).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = render(
      <>
        <TextArea label="Beskrivelse" description="Kort tekst." />
        <TextArea label="Grunn" isInvalid errorMessage="Skriv en grunn." />
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("NumberField", () => {
  it("lar deg skrive inn og justere et tall", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <NumberField
        label="Timer per uke"
        description="Mellom 1 og 60."
        minValue={1}
        maxValue={60}
        onChange={onChange}
      />,
    );

    const input = screen.getByRole("textbox", { name: "Timer per uke" });
    expect(accessibleDescription(input)).toBe("Mellom 1 og 60.");
    await user.type(input, "12");
    await user.tab();

    expect(onChange).toHaveBeenLastCalledWith(12);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    await user.click(buttons[0] as HTMLElement);
    expect(onChange).toHaveBeenLastCalledWith(13);
  });

  it("viser feilmeldingen", () => {
    render(
      <NumberField
        label="Varighet"
        isInvalid
        errorMessage="Varigheten må være et helt tall på minst 1."
      />,
    );

    const input = screen.getByRole("textbox", { name: "Varighet" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(
      screen.getByText("Varigheten må være et helt tall på minst 1."),
    ).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = render(
      <>
        <NumberField label="Timer per uke" defaultValue={10} />
        <NumberField label="Antall" isInvalid errorMessage="Skriv et tall." />
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
