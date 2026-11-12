import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { marketplaceStateSchema } from "../../src/features/marketplace/schema";
import { buildSeedFileSchema } from "../../src/frame/store/schema";
import { buildSeedFile } from "./generate";

const seedFilePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../src/seed/seed-data.json",
);

const seedFileSchema = buildSeedFileSchema({
  marketplace: marketplaceStateSchema,
});

const generated = buildSeedFile();
const parsed = seedFileSchema.parse(JSON.parse(generated));
const { people, businesses, skills } = parsed.frame;
const personIds = new Set(people.map((person) => person.id));

function worksAtABusiness(personId: string): boolean {
  return businesses.some(
    (business) =>
      business.ownerId === personId || business.employeeIds.includes(personId),
  );
}

describe("buildSeedFile", () => {
  it("is byte-for-byte equal to the committed seed file", () => {
    expect(generated).toBe(readFileSync(seedFilePath, "utf8"));
  });

  it("gives the same string when called twice", () => {
    expect(buildSeedFile()).toBe(generated);
  });

  it("stores the SHA-256 of the file content with an empty seedId", () => {
    const withoutId = { ...JSON.parse(generated), seedId: "" };
    const expected = createHash("sha256")
      .update(`${JSON.stringify(withoutId, null, 2)}\n`)
      .digest("hex");
    expect(parsed.seedId).toBe(expected);
  });

  it("writes the top-level keys in a fixed order", () => {
    expect(Object.keys(JSON.parse(generated))).toEqual([
      "format",
      "seedId",
      "anchorDate",
      "frame",
      "marketplace",
    ]);
    expect(parsed.format).toBe(1);
    expect(parsed.anchorDate).toBe("2026-11-16");
  });
});

describe("frame seed", () => {
  it("has 4–6 businesses with 1–3 people each and exactly one owner", () => {
    expect(businesses.length).toBeGreaterThanOrEqual(4);
    expect(businesses.length).toBeLessThanOrEqual(6);
    for (const business of businesses) {
      const count = 1 + business.employeeIds.length;
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(3);
      expect(business.employeeIds).not.toContain(business.ownerId);
    }
    const owners = businesses.map((business) => business.ownerId);
    expect(new Set(owners).size).toBe(owners.length);
  });

  it("has businesses both opted in to and out of crawling", () => {
    expect(
      businesses.filter((b) => b.crawlOptIn).length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      businesses.filter((b) => !b.crawlOptIn).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("has at least 2 E-Waves members", () => {
    expect(
      businesses.filter((b) => b.isEWavesMember).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("has at least 1 Varodd administrator", () => {
    expect(people.filter((p) => p.isVaroddAdmin).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("has 7–8 people seeking work who do not work at any business", () => {
    const seekers = people.filter(
      (p) => p.seeksWork && !worksAtABusiness(p.id),
    );
    expect(seekers.length).toBeGreaterThanOrEqual(7);
    expect(seekers.length).toBeLessThanOrEqual(8);
  });

  it("has 10–15 people in total, each with a description", () => {
    expect(people.length).toBeGreaterThanOrEqual(10);
    expect(people.length).toBeLessThanOrEqual(15);
    expect(personIds.size).toBe(people.length);
    for (const person of people) {
      expect(person.description.length).toBeGreaterThan(0);
    }
  });

  it("points every owner and employee at an existing person", () => {
    for (const business of businesses) {
      expect(personIds.has(business.ownerId)).toBe(true);
      for (const employeeId of business.employeeIds) {
        expect(personIds.has(employeeId)).toBe(true);
      }
    }
  });

  it("has 15–20 skills with unique ids", () => {
    expect(skills.length).toBeGreaterThanOrEqual(15);
    expect(skills.length).toBeLessThanOrEqual(20);
    expect(new Set(skills.map((s) => s.id)).size).toBe(skills.length);
  });

  it("uses readable ids", () => {
    for (const person of people) {
      expect(person.id).toMatch(/^person-\d+$/);
    }
    for (const business of businesses) {
      expect(business.id).toMatch(/^bedrift-\d+$/);
    }
    for (const skill of skills) {
      expect(skill.id).toMatch(/^ferdighet-\d+$/);
    }
  });
});
