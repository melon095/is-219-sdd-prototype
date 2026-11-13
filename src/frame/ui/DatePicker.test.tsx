import { CalendarDate } from "@internationalized/date";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { I18nProvider } from "react-aria-components";
import { describe, expect, it, vi } from "vitest";
import { DatePicker } from "./DatePicker";

function renderPicker(props: Partial<Parameters<typeof DatePicker>[0]> = {}) {
  return render(
    <I18nProvider locale="nb-NO">
      <DatePicker
        label="Ønsket oppstart"
        defaultValue={new CalendarDate(2026, 11, 16)}
        {...props}
      />
    </I18nProvider>,
  );
}

describe("DatePicker", () => {
  it("viser norske månedsnavn og mandag som første ukedag", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole("button", { name: /Kalender/ }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading").textContent).toBe(
      "november 2026",
    );
    const headers = within(dialog).getAllByRole("columnheader", {
      hidden: true,
    });
    expect(headers).toHaveLength(7);
    expect(headers[0]?.textContent).toMatch(/^man/);
    expect(headers[6]?.textContent).toMatch(/^søn/);
  });

  it("kaller onChange når en dag velges", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPicker({ onChange });

    await user.click(screen.getByRole("button", { name: /Kalender/ }));
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: /20\. november 2026/ }),
    );

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]?.toString()).toBe("2026-11-20");
  });

  it("viser beskrivelse og feilmelding", () => {
    renderPicker({
      description: "Når kan arbeidet starte?",
      isInvalid: true,
      errorMessage: "Velg en dato.",
    });

    expect(screen.getByText("Når kan arbeidet starte?")).toBeTruthy();
    expect(screen.getByText("Velg en dato.")).toBeTruthy();
    expect(
      screen
        .getByRole("group", { name: /Ønsket oppstart/ })
        .getAttribute("data-invalid"),
    ).toBe("true");
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = renderPicker({
      description: "Når kan arbeidet starte?",
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});
