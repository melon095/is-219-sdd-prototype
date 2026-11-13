import { screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { renderFrame } from "../test-utils";
import { SubNav, SubNavLayout } from "./SubNav";

const links = [
  { label: "Forum", path: "/kunnskapsbank" },
  { label: "Spør chatboten", path: "/kunnskapsbank/chatbot" },
  { label: "Til vurdering", path: "/kunnskapsbank/vurdering", badge: "3" },
];

function useTestLinks() {
  return links;
}

function useNoLinks() {
  return [];
}

function linkTexts(): (string | null)[] {
  return screen.getAllByRole("link").map((link) => link.textContent);
}

describe("SubNav", () => {
  it("viser én lenke per element", () => {
    renderFrame(<SubNav label="I Kunnskapsbank" links={links} />);

    expect(linkTexts()).toEqual(["Forum", "Spør chatboten", "Til vurdering 3"]);
    expect(
      screen.getByRole("link", { name: "Forum" }).getAttribute("href"),
    ).toBe("/kunnskapsbank");
  });

  it("er en navigasjon med navnet fra label", () => {
    renderFrame(<SubNav label="I Kunnskapsbank" links={links} />);

    const navigation = screen.getByRole("navigation", {
      name: "I Kunnskapsbank",
    });
    expect(within(navigation).getAllByRole("link")).toHaveLength(3);
  });

  it("markerer lenken til gjeldende side med aria-current", () => {
    renderFrame(<SubNav label="I Kunnskapsbank" links={links} />, {
      route: "/kunnskapsbank/chatbot",
    });

    expect(
      screen
        .getByRole("link", { name: "Spør chatboten" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("link", { name: "Forum" }).getAttribute("aria-current"),
    ).toBe(null);
  });

  it("viser merket etter teksten og tar det med i lenkens navn", () => {
    renderFrame(<SubNav label="I Kunnskapsbank" links={links} />);

    const link = screen.getByRole("link", { name: "Til vurdering 3" });
    expect(link.textContent).toBe("Til vurdering 3");
    expect(within(link).getByText("3")).toBeTruthy();
  });

  it("viser ingenting uten lenker", () => {
    const { container } = renderFrame(
      <SubNav label="I Kunnskapsbank" links={[]} />,
    );

    expect(screen.queryByRole("navigation")).toBe(null);
    expect(container.querySelector("nav")).toBe(null);
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = renderFrame(
      <SubNav label="I Kunnskapsbank" links={links} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("SubNavLayout", () => {
  it("viser SubNav over innholdet i Outlet", () => {
    renderFrame(<div />, {
      route: "/kunnskapsbank",
      pages: [
        {
          element: (
            <SubNavLayout label="I Kunnskapsbank" useLinks={useTestLinks} />
          ),
          children: [{ path: "*", element: <p>Innhold på siden</p> }],
        },
      ],
    });

    const navigation = screen.getByRole("navigation", {
      name: "I Kunnskapsbank",
    });
    const content = screen.getByText("Innhold på siden");
    expect(
      navigation.compareDocumentPosition(content) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("viser bare innholdet når det ikke er noen lenker", () => {
    renderFrame(<div />, {
      route: "/kunnskapsbank",
      pages: [
        {
          element: (
            <SubNavLayout label="I Kunnskapsbank" useLinks={useNoLinks} />
          ),
          children: [{ path: "*", element: <p>Innhold på siden</p> }],
        },
      ],
    });

    expect(screen.queryByRole("navigation")).toBe(null);
    expect(screen.getByText("Innhold på siden")).toBeTruthy();
  });
});
