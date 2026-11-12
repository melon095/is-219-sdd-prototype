import { screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { brokenStorage, createTestStore, renderFrame } from "../test-utils";
import { Footer } from "./Footer";

const prototypeNotice =
  "Dette er en prototype. Alle personer, bedrifter og data er oppdiktet.";
const storageNotice = "Endringer lagres ikke i denne nettleseren";

describe("Footer", () => {
  it("viser prototypemerknaden og ingen lagringsmerknad når lagring virker", () => {
    renderFrame(<Footer />);

    expect(screen.getByText(prototypeNotice)).toBeTruthy();
    expect(screen.queryByText(storageNotice)).toBe(null);
  });

  it("viser lagringsmerknaden når lagring ikke er tilgjengelig", () => {
    renderFrame(<Footer />, {
      store: createTestStore({ storage: brokenStorage() }),
    });

    expect(screen.getByText(prototypeNotice)).toBeTruthy();
    expect(screen.getByText(storageNotice)).toBeTruthy();
  });

  it("har ingen tilgjengelighetsfeil", async () => {
    const { container } = renderFrame(<Footer />, {
      store: createTestStore({ storage: brokenStorage() }),
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});
