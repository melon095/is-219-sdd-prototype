export const stopWords: ReadonlySet<string> = new Set([
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
]);

const minimumWordLength = 3;

const minimumPrefixLength = 4;

function letterCount(word: string): number {
  return Array.from(word).length;
}

export function tokenize(text: string): string[] {
  return text
    .normalize("NFC")
    .toLocaleLowerCase("nb-NO")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(
      (word) => letterCount(word) >= minimumWordLength && !stopWords.has(word),
    );
}

export function wordsMatch(a: string, b: string): boolean {
  if (a === b) {
    return true;
  }
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return (
    letterCount(shorter) >= minimumPrefixLength && longer.startsWith(shorter)
  );
}

export function matchScore(queryWords: string[], textWords: string[]): number {
  const distinct = new Set(queryWords);
  let score = 0;
  for (const queryWord of distinct) {
    if (textWords.some((textWord) => wordsMatch(queryWord, textWord))) {
      score += 1;
    }
  }
  return score;
}
