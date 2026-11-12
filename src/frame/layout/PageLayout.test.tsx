import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { PageLayout } from "./PageLayout";

function Example() {
  return (
    <PageLayout
      header={<button type="button">Fra toppen</button>}
      footer={<p>Fra bunnen</p>}
    >
      <p>Innhold</p>
    </PageLayout>
  );
}

describe("PageLayout", () => {
  it("har header, main og footer rundt innholdet", () => {
    render(<Example />);

    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.getByRole("contentinfo")).toBeTruthy();
    const main = screen.getByRole("main");
    expect(main.id).toBe("hovedinnhold");
    expect(main.textContent).toContain("Innhold");
    expect(screen.getByRole("banner").textContent).toContain("Fra toppen");
    expect(screen.getByRole("contentinfo").textContent).toContain("Fra bunnen");
  });

  it("har «Hopp til hovedinnhold» som første element som kan få fokus", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.tab();

    const skipLink = screen.getByRole("link", {
      name: "Hopp til hovedinnhold",
    });
    expect(document.activeElement).toBe(skipLink);
  });

  it("flytter fokus til hovedinnholdet fra hopp-lenken", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.tab();
    await user.keyboard("{Enter}");

    expect(document.activeElement).toBe(screen.getByRole("main"));
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = render(<Example />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
