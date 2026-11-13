import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { SimulatedLabel } from "./SimulatedLabel";

describe("SimulatedLabel", () => {
  it("viser teksten Simulert", () => {
    render(<SimulatedLabel />);

    expect(screen.getByText("Simulert")).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = render(
      <p>
        Henvist fra NAV <SimulatedLabel />
      </p>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
