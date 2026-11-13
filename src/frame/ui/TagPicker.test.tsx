import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { useState } from "react";
import { I18nProvider, type Key } from "react-aria-components";
import { describe, expect, it, vi } from "vitest";
import { TagPicker } from "./TagPicker";

const skills = [
  { id: "f1", name: "Produktfotografering" },
  { id: "f2", name: "Shopify-oppsett" },
  { id: "f3", name: "Regnskap" },
];

function Example({
  initial = [],
  marked,
  onChange,
  errorMessage,
}: {
  initial?: Key[];
  marked?: Key[];
  onChange?: (keys: Key[]) => void;
  errorMessage?: string;
}) {
  const [selected, setSelected] = useState<Key[]>(initial);
  return (
    <I18nProvider locale="nb-NO">
      <TagPicker
        label="Ferdigheter"
        items={skills}
        selectedKeys={selected}
        onSelectionChange={(keys) => {
          setSelected(keys);
          onChange?.(keys);
        }}
        markedKeys={marked}
        markLabel="Forslag"
        errorMessage={errorMessage}
      />
    </I18nProvider>
  );
}

describe("TagPicker", () => {
  it("legger til en ferdighet ved å skrive og trykke Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Example onChange={onChange} />);

    const input = screen.getByRole<HTMLInputElement>("combobox", {
      name: "Ferdigheter",
    });
    await user.type(input, "Regn");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenLastCalledWith(["f3"]);
    expect(screen.getByRole("row", { name: "Regnskap" })).toBeTruthy();
    expect(input.value).toBe("");
  });

  it("viser bare ferdigheter som ikke er valgt i listen", async () => {
    const user = userEvent.setup();
    render(<Example initial={["f1"]} />);

    await user.click(screen.getByRole("button", { name: /Vis forslag/ }));

    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Shopify-oppsett",
      "Regnskap",
    ]);
  });

  it("fjerner en ferdighet med tastaturet", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Example initial={["f1", "f2"]} onChange={onChange} />);

    const tag = screen.getByRole("row", { name: "Produktfotografering" });
    tag.focus();
    await user.keyboard("{Delete}");

    expect(onChange).toHaveBeenLastCalledWith(["f2"]);
    expect(screen.queryByRole("row", { name: "Produktfotografering" })).toBe(
      null,
    );
  });

  it("fjerner en ferdighet med fjern-knappen", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Example initial={["f1"]} onChange={onChange} />);

    await user.click(
      screen.getByRole("button", { name: /Fjern.*Produktfotografering/ }),
    );

    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("tar markeringen med i det tilgjengelige navnet på en markert ferdighet", () => {
    render(<Example initial={["f1", "f2"]} marked={["f2"]} />);

    expect(
      screen.getByRole("row", { name: "Shopify-oppsett (Forslag)" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("row", { name: "Produktfotografering" }),
    ).toBeTruthy();
    expect(screen.getByText("Forslag")).toBeTruthy();
  });

  it("viser feilmeldingen", () => {
    render(<Example errorMessage="Velg minst én ferdighet." />);

    expect(screen.getByText("Velg minst én ferdighet.")).toBeTruthy();
    expect(screen.getByRole("combobox").getAttribute("aria-invalid")).toBe(
      "true",
    );
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = render(
      <Example initial={["f1", "f2"]} marked={["f2"]} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
