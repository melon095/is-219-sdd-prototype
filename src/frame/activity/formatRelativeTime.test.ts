import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./formatRelativeTime";

const now = "2026-11-16T12:00:00.000Z";

describe("formatRelativeTime", () => {
  it("skriver minutter siden", () => {
    expect(formatRelativeTime("2026-11-16T11:55:00.000Z", now)).toBe(
      "for 5 minutter siden",
    );
  });

  it("skriver i går for én dag siden", () => {
    expect(formatRelativeTime("2026-11-15T12:00:00.000Z", now)).toBe("i går");
  });

  it("skriver nå for under ett minutt", () => {
    expect(formatRelativeTime("2026-11-16T11:59:30.000Z", now)).toBe("nå");
    expect(formatRelativeTime(now, now)).toBe("nå");
  });

  it("skriver timer og flere dager siden", () => {
    expect(formatRelativeTime("2026-11-16T09:00:00.000Z", now)).toBe(
      "for 3 timer siden",
    );
    expect(formatRelativeTime("2026-11-13T12:00:00.000Z", now)).toBe(
      "for 3 døgn siden",
    );
  });

  it("skriver nå når tidspunktet er etter nåtid", () => {
    expect(formatRelativeTime("2026-11-16T12:30:00.000Z", now)).toBe("nå");
  });
});
