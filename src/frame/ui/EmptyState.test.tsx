import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("viser tittel, tekst og handling", () => {
    render(
      <EmptyState
        title="Ingenting har skjedd ennå"
        action={<Button>Lag et oppdrag</Button>}
      >
        Når noe skjer, dukker det opp her.
      </EmptyState>,
    );

    expect(screen.getByText("Ingenting har skjedd ennå")).toBeTruthy();
    expect(screen.getByText("Når noe skjer, dukker det opp her.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Lag et oppdrag" })).toBeTruthy();
  });

  it("fungerer med bare tittel", () => {
    render(<EmptyState title="Ingen treff" />);

    expect(screen.getByText("Ingen treff")).toBeTruthy();
    expect(screen.queryByRole("button")).toBe(null);
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = render(
      <EmptyState
        title="Ingen oppdrag"
        action={<Button variant="secondary">Lag et oppdrag</Button>}
      >
        Du har ikke publisert noen oppdrag ennå.
      </EmptyState>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
