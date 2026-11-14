import { describe, expect, it } from "vitest";
import { matchScore, stopWords, tokenize, wordsMatch } from "./text";

const expectedStopWords = [
  "alle",
  "bare",
  "ble",
  "blir",
  "bør",
  "deg",
  "den",
  "der",
  "dere",
  "deres",
  "det",
  "din",
  "dine",
  "ditt",
  "eller",
  "enn",
  "etter",
  "for",
  "fordi",
  "fra",
  "får",
  "gjør",
  "gjøre",
  "han",
  "har",
  "her",
  "hun",
  "hva",
  "hvilke",
  "hvilken",
  "hvis",
  "hvor",
  "hvordan",
  "hvorfor",
  "ikke",
  "jeg",
  "kan",
  "kunne",
  "man",
  "med",
  "meg",
  "mellom",
  "men",
  "mer",
  "min",
  "mine",
  "mitt",
  "mot",
  "noe",
  "noen",
  "når",
  "også",
  "oss",
  "over",
  "seg",
  "sin",
  "sine",
  "sitt",
  "skal",
  "skulle",
  "slik",
  "som",
  "til",
  "under",
  "uten",
  "var",
  "vil",
  "ville",
  "vår",
  "våre",
  "vårt",
  "være",
  "vært",
];

describe("stopWords", () => {
  it("er nøyaktig de 73 ordene fra research.md", () => {
    expect(expectedStopWords).toHaveLength(73);
    expect([...stopWords].sort()).toEqual([...expectedStopWords].sort());
  });
});

describe("tokenize", () => {
  it("gjør om til små bokstaver og deler på alt som ikke er bokstaver eller tall", () => {
    expect(tokenize("Nettbutikk, Shopify-oppsett! Frakt/Levering")).toEqual([
      "nettbutikk",
      "shopify",
      "oppsett",
      "frakt",
      "levering",
    ]);
  });

  it("beholder æ, ø og å", () => {
    expect(tokenize("Bærekraftig Økonomi Håndlaget")).toEqual([
      "bærekraftig",
      "økonomi",
      "håndlaget",
    ]);
  });

  it("slår sammen tegn som er skrevet i delt form", () => {
    const decomposed = "årsregnskap".normalize("NFD");
    expect(tokenize(decomposed)).toEqual(["årsregnskap"]);
  });

  it("fjerner ord med færre enn 3 bokstaver", () => {
    expect(tokenize("og i på en et er vi å om at de nå må få app")).toEqual([
      "app",
    ]);
  });

  it("beholder tall", () => {
    expect(tokenize("Bruk 2026 og 24")).toEqual(["bruk", "2026"]);
  });

  it("fjerner stoppord, men ikke andre ord", () => {
    expect(tokenize("Hvordan kan jeg også bruke Claude i nettbutikk")).toEqual([
      "bruke",
      "claude",
      "nettbutikk",
    ]);
    for (const word of ["hvordan", "kan", "jeg", "også"]) {
      expect(tokenize(word)).toEqual([]);
    }
    for (const word of ["nettbutikk", "bruke", "claude"]) {
      expect(tokenize(word)).toEqual([word]);
    }
  });

  it("fjerner alle stoppord", () => {
    expect(tokenize(expectedStopWords.join(" "))).toEqual([]);
  });

  it("gir en tom liste for tom tekst", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("  ,.! ")).toEqual([]);
  });
});

describe("wordsMatch", () => {
  it("er sann for like ord", () => {
    expect(wordsMatch("nettbutikk", "nettbutikk")).toBe(true);
    expect(wordsMatch("app", "app")).toBe(true);
  });

  it("er sann når det korteste ordet har minst 4 bokstaver og er starten på det andre", () => {
    expect(wordsMatch("nettbutikk", "nettbutikken")).toBe(true);
    expect(wordsMatch("nettbutikken", "nettbutikk")).toBe(true);
    expect(wordsMatch("bilde", "bilder")).toBe(true);
    expect(wordsMatch("bilder", "bilde")).toBe(true);
  });

  it("er usann når det korteste ordet har under 4 bokstaver", () => {
    expect(wordsMatch("app", "tapper")).toBe(false);
    expect(wordsMatch("app", "apper")).toBe(false);
    expect(wordsMatch("apper", "app")).toBe(false);
  });

  it("er usann når ingen er starten på den andre", () => {
    expect(wordsMatch("butikk", "nettbutikk")).toBe(false);
    expect(wordsMatch("frakt", "levering")).toBe(false);
  });
});

describe("matchScore", () => {
  it("teller ulike søkeord som passer minst ett ord i teksten", () => {
    expect(
      matchScore(
        ["nettbutikk", "frakt", "bilde"],
        ["nettbutikken", "bilder", "pris"],
      ),
    ).toBe(2);
  });

  it("teller samme søkeord bare én gang", () => {
    expect(
      matchScore(["frakt", "frakt", "frakt"], ["frakt", "fraktpris"]),
    ).toBe(1);
  });

  it("teller ett søkeord én gang selv om flere ord i teksten passer", () => {
    expect(
      matchScore(
        ["nettbutikk"],
        ["nettbutikk", "nettbutikken", "nettbutikker"],
      ),
    ).toBe(1);
  });

  it("gir 0 uten treff og uten ord", () => {
    expect(matchScore(["frakt"], ["levering"])).toBe(0);
    expect(matchScore([], ["levering"])).toBe(0);
    expect(matchScore(["frakt"], [])).toBe(0);
  });
});
