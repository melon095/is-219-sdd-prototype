import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ActivityEntry } from "../../src/domain/frame/types";
import { buildFrameSeed, type SeedModule } from "./frame";
import { seedKnowledgeBase } from "./knowledge-base";
import { seedMarketplace } from "./marketplace";
import { deriveRng } from "./random";

const baseSeed = "varodd-prototype-2026";

const anchorDate = "2026-11-16";

const featureModules: [string, SeedModule][] = [
  ["marketplace", seedMarketplace],
  ["knowledgeBase", seedKnowledgeBase],
];

function serialize(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

export function buildSeedFile(): string {
  const frame = buildFrameSeed(deriveRng(baseSeed, "frame"));
  const activity: ActivityEntry[] = [];
  const featureParts: Record<string, unknown> = {};
  for (const [key, module] of featureModules) {
    const result = module(deriveRng(baseSeed, key), frame);
    featureParts[result.key] = result.data;
    activity.push(...result.activity);
  }
  const data = {
    format: 1,
    seedId: "",
    anchorDate,
    frame: {
      people: frame.people,
      businesses: frame.businesses,
      skills: frame.skills,
      activity,
    },
    ...featureParts,
  };
  data.seedId = createHash("sha256").update(serialize(data)).digest("hex");
  return serialize(data);
}

const scriptPath = fileURLToPath(import.meta.url);

if (process.argv[1] !== undefined && resolve(process.argv[1]) === scriptPath) {
  const outputPath = resolve(
    dirname(scriptPath),
    "../../src/seed/seed-data.json",
  );
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, buildSeedFile(), "utf8");
  console.log(`Skrev ${outputPath}`);
}
