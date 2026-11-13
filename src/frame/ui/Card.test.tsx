import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { Card } from "./Card";
import { Link } from "./Link";

describe("Card", () => {
  it("viser overskrift, kort tekst og én handling", () => {
    render(
      <Card
        heading="Få hjelp med små oppdrag"
        action={<Link href="#/oppdrag">Gå til oppdrag</Link>}
      >
        Beskriv hva du trenger hjelp til.
      </Card>,
    );

    expect(
      screen.getByRole("heading", { name: "Få hjelp med små oppdrag" }),
    ).toBeTruthy();
    expect(screen.getByText("Beskriv hva du trenger hjelp til.")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Gå til oppdrag" }).getAttribute("href"),
    ).toBe("#/oppdrag");
  });

  it("bruker valgt overskriftsnivå", () => {
    render(
      <Card heading="Kort" headingLevel={3}>
        Tekst
      </Card>,
    );

    expect(
      screen.getByRole("heading", { level: 3, name: "Kort" }),
    ).toBeTruthy();
  });

  it("fungerer uten handling", () => {
    render(<Card heading="Bare tekst">Ingen knapp her.</Card>);

    expect(screen.queryByRole("link")).toBe(null);
    expect(screen.queryByRole("button")).toBe(null);
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = render(
      <Card
        heading="Oppdrag som passer deg"
        action={<Link href="#/oppdrag">Se oppdrag</Link>}
      >
        Vi matcher deg automatisk.
      </Card>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
