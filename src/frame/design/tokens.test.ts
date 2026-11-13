import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = resolve("src");
const tokensFile = resolve(sourceRoot, "frame", "design", "tokens.css");

const rawColours: { name: string; pattern: RegExp }[] = [
  {
    name: "hex",
    pattern:
      /(?<![\w-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g,
  },
  { name: "rgb(", pattern: /\brgba?\(/gi },
  { name: "hsl(", pattern: /\bhsla?\(/gi },
];

function cssFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return cssFiles(path);
    }
    return entry.name.endsWith(".css") ? [path] : [];
  });
}

const stylesheets = cssFiles(sourceRoot).filter((file) => file !== tokensFile);

describe("designtokens", () => {
  it("finner stilarkene som skal sjekkes", () => {
    expect(stylesheets.length).toBeGreaterThan(20);
    expect(stylesheets).not.toContain(tokensFile);
  });

  it("har alle fargeverdiene i tokens.css", () => {
    const tokens = readFileSync(tokensFile, "utf8");

    expect(tokens).toMatch(/#[0-9a-fA-F]{6}/);
  });

  for (const { name, pattern } of rawColours) {
    it(`bruker ingen ${name}-fargeverdier utenfor tokens.css`, () => {
      const found: string[] = [];
      for (const file of stylesheets) {
        const lines = readFileSync(file, "utf8").split("\n");
        lines.forEach((line, index) => {
          if (line.match(pattern) !== null) {
            found.push(
              `${relative(sourceRoot, file).split(sep).join("/")}:${index + 1}: ${line.trim()}`,
            );
          }
        });
      }

      expect(found).toEqual([]);
    });
  }
});
