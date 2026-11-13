import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { Link } from "./Link";

describe("Link", () => {
  it("rendres som en lenke med href", () => {
    render(<Link href="#/oppdrag">Se oppdrag</Link>);

    const link = screen.getByRole("link", { name: "Se oppdrag" });
    expect(link.getAttribute("href")).toBe("#/oppdrag");
    expect(link.classList.contains("react-aria-Link")).toBe(true);
  });

  it("kaller onPress når den trykkes", async () => {
    const user = userEvent.setup();
    const onPress = vi.fn();
    render(
      <Link href="#/profil" onPress={onPress}>
        Min profil
      </Link>,
    );

    await user.click(screen.getByRole("link", { name: "Min profil" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = render(
      <p>
        Les mer på <Link href="#/oppdrag">oppdragssiden</Link>.
      </p>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
