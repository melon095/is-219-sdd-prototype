import { describe, expect, it } from "vitest";
import { deriveRng, int, mulberry32, pick, shuffle } from "./random";

function take(rng: () => number, count: number): number[] {
  return Array.from({ length: count }, () => rng());
}

describe("mulberry32", () => {
  it("gives the same sequence for the same seed", () => {
    expect(take(mulberry32(42), 10)).toEqual(take(mulberry32(42), 10));
  });

  it("gives numbers in [0, 1)", () => {
    for (const value of take(mulberry32(7), 1000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("gives different sequences for different seeds", () => {
    expect(take(mulberry32(1), 5)).not.toEqual(take(mulberry32(2), 5));
  });
});

describe("deriveRng", () => {
  it("is repeatable for the same base seed and key", () => {
    expect(take(deriveRng("varodd", "frame"), 10)).toEqual(
      take(deriveRng("varodd", "frame"), 10),
    );
  });

  it("gives different sequences for different keys", () => {
    expect(take(deriveRng("varodd", "frame"), 10)).not.toEqual(
      take(deriveRng("varodd", "marketplace"), 10),
    );
  });

  it("does not change an existing key's sequence when a new key is added", () => {
    const before = take(deriveRng("varodd", "frame"), 10);
    deriveRng("varodd", "knowledge-base");
    expect(take(deriveRng("varodd", "frame"), 10)).toEqual(before);
  });
});

describe("pick", () => {
  it("is repeatable and returns an element of the list", () => {
    const list = ["a", "b", "c", "d"];
    const first = take(mulberry32(3), 0);
    expect(first).toEqual([]);
    const picksA = Array.from({ length: 20 }, () => pick(mulberry32(3), list));
    const picksB = Array.from({ length: 20 }, () => pick(mulberry32(3), list));
    expect(picksA).toEqual(picksB);
    for (const value of picksA) {
      expect(list).toContain(value);
    }
  });

  it("throws on an empty list", () => {
    expect(() => pick(mulberry32(1), [])).toThrow();
  });
});

describe("shuffle", () => {
  it("returns a new array with the same elements", () => {
    const list = [1, 2, 3, 4, 5, 6];
    const result = shuffle(mulberry32(9), list);
    expect(result).not.toBe(list);
    expect(list).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...result].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("is repeatable", () => {
    const list = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffle(mulberry32(9), list)).toEqual(shuffle(mulberry32(9), list));
  });
});

describe("int", () => {
  it("stays inside the inclusive range", () => {
    const rng = mulberry32(5);
    const values = Array.from({ length: 500 }, () => int(rng, 2, 4));
    expect(Math.min(...values)).toBe(2);
    expect(Math.max(...values)).toBe(4);
    for (const value of values) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it("is repeatable", () => {
    const a = mulberry32(11);
    const b = mulberry32(11);
    expect(Array.from({ length: 20 }, () => int(a, 0, 100))).toEqual(
      Array.from({ length: 20 }, () => int(b, 0, 100)),
    );
  });
});
