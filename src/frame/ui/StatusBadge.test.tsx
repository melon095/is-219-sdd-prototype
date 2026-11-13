import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("viser alltid etiketten som synlig tekst", () => {
    render(<StatusBadge label="Avtalt" tone="success" />);

    const badge = screen.getByText("Avtalt");
    expect(badge.textContent).toBe("Avtalt");
    expect(badge.classList.contains("status-badge")).toBe(true);
  });

  it("er nøytral som standard og kan ha alle tonene", () => {
    render(
      <>
        <StatusBadge label="Åpen" />
        <StatusBadge label="Utkast" tone="neutral" />
        <StatusBadge label="Til vurdering" tone="info" />
        <StatusBadge label="Avtalt" tone="success" />
        <StatusBadge label="Venter" tone="warning" />
        <StatusBadge label="Avvist" tone="error" />
      </>,
    );

    expect(screen.getByText("Åpen").getAttribute("data-tone")).toBe("neutral");
    expect(screen.getByText("Utkast").getAttribute("data-tone")).toBe(
      "neutral",
    );
    expect(screen.getByText("Til vurdering").getAttribute("data-tone")).toBe(
      "info",
    );
    expect(screen.getByText("Avtalt").getAttribute("data-tone")).toBe(
      "success",
    );
    expect(screen.getByText("Venter").getAttribute("data-tone")).toBe(
      "warning",
    );
    expect(screen.getByText("Avvist").getAttribute("data-tone")).toBe("error");
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = render(
      <>
        <StatusBadge label="Åpen" />
        <StatusBadge label="Til vurdering" tone="info" />
        <StatusBadge label="Avtalt" tone="success" />
        <StatusBadge label="Venter" tone="warning" />
        <StatusBadge label="Avvist" tone="error" />
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
