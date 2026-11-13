import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { Tab, TabList, TabPanel, Tabs } from "./Tabs";

function Example({
  onSelectionChange,
}: {
  onSelectionChange?: (key: unknown) => void;
}) {
  return (
    <Tabs onSelectionChange={onSelectionChange}>
      <TabList aria-label="Oppdrag">
        <Tab id="open">Åpne</Tab>
        <Tab id="active">Pågående</Tab>
        <Tab id="done">Fullførte</Tab>
      </TabList>
      <TabPanel id="open">Her er de åpne oppdragene.</TabPanel>
      <TabPanel id="active">Her er de pågående oppdragene.</TabPanel>
      <TabPanel id="done">Her er de fullførte oppdragene.</TabPanel>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("viser første fane som standard", () => {
    render(<Example />);

    expect(
      screen.getByRole("tab", { name: "Åpne" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toBe(
      "Her er de åpne oppdragene.",
    );
  });

  it("bytter fane ved klikk", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(<Example onSelectionChange={onSelectionChange} />);

    await user.click(screen.getByRole("tab", { name: "Pågående" }));

    expect(onSelectionChange).toHaveBeenLastCalledWith("active");
    expect(screen.getByRole("tabpanel").textContent).toBe(
      "Her er de pågående oppdragene.",
    );
  });

  it("kan styres med piltastene", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.tab();
    await user.keyboard("{ArrowRight}{ArrowRight}");

    expect(
      screen
        .getByRole("tab", { name: "Fullførte" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toBe(
      "Her er de fullførte oppdragene.",
    );
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = render(<Example />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
