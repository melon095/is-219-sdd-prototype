import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Link, MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { PageFocusProvider, PageHeading } from "./PageHeading";

function Example({ shared = true }: { shared?: boolean }) {
  const content = (
    <MemoryRouter>
      <Link to="/oppdrag">Til oppdrag</Link>
      <Routes>
        <Route path="/" element={<PageHeading>Hjem</PageHeading>} />
        <Route path="/oppdrag" element={<PageHeading>Oppdrag</PageHeading>} />
      </Routes>
    </MemoryRouter>
  );
  return shared ? <PageFocusProvider>{content}</PageFocusProvider> : content;
}

describe("PageHeading", () => {
  it("viser siden sin ene h1 som kan få fokus med kode", () => {
    render(<Example />);

    const heading = screen.getByRole("heading", { level: 1, name: "Hjem" });
    expect(heading.getAttribute("tabindex")).toBe("-1");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("setter dokumenttittelen", () => {
    render(<Example />);

    expect(document.title).toBe("Hjem – Varodd");
  });

  it("flytter ikke fokus ved første innlasting", () => {
    render(<Example />);

    expect(document.activeElement).toBe(document.body);
  });

  it("flytter fokus til overskriften etter en sideendring", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("link", { name: "Til oppdrag" }));

    const heading = await screen.findByRole("heading", {
      level: 1,
      name: "Oppdrag",
    });
    expect(document.activeElement).toBe(heading);
    expect(document.title).toBe("Oppdrag – Varodd");
  });

  it("flytter ikke fokus uten PageFocusProvider", async () => {
    const user = userEvent.setup();
    render(<Example shared={false} />);

    await user.click(screen.getByRole("link", { name: "Til oppdrag" }));

    const heading = await screen.findByRole("heading", {
      level: 1,
      name: "Oppdrag",
    });
    expect(document.activeElement).not.toBe(heading);
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = render(<Example />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
