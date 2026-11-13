import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { Notice } from "./Notice";

describe("Notice", () => {
  it("viser tittel og innhold", () => {
    render(
      <Notice tone="warning" title="Tilbudet utløper snart">
        Svar innen to dager.
      </Notice>,
    );

    expect(screen.getByText("Tilbudet utløper snart")).toBeTruthy();
    expect(screen.getByText("Svar innen to dager.")).toBeTruthy();
  });

  it("forteller tonen i tekst og ikke bare med farge", () => {
    render(
      <>
        <Notice tone="info">Informasjon her.</Notice>
        <Notice tone="success">Det gikk bra.</Notice>
        <Notice tone="warning">Vær oppmerksom.</Notice>
        <Notice tone="error">Noe gikk galt.</Notice>
      </>,
    );

    expect(screen.getByText("Informasjon:")).toBeTruthy();
    expect(screen.getByText("Vellykket:")).toBeTruthy();
    expect(screen.getByText("Advarsel:")).toBeTruthy();
    expect(screen.getByText("Feil:")).toBeTruthy();
  });

  it("gir feilmeldinger rollen alert", () => {
    render(<Notice tone="error">Noe gikk galt.</Notice>);

    expect(screen.getByRole("alert").textContent).toContain("Noe gikk galt.");
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = render(
      <>
        <Notice tone="info" title="Tips">
          Informasjon her.
        </Notice>
        <Notice tone="success">Det gikk bra.</Notice>
        <Notice tone="warning">Vær oppmerksom.</Notice>
        <Notice tone="error">Noe gikk galt.</Notice>
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
