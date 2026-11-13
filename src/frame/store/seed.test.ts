import { describe, expect, it } from "vitest";
import {
  bundledSeed,
  bundledSeedId,
  daysBetween,
  loadSeedState,
  type SeedFile,
  shiftSeedDates,
} from "./seed";

const datePattern = /^(\d{4})-(\d{2})-(\d{2})(.*)$/s;

function expectedShift(value: string, days: number): string {
  const match = datePattern.exec(value);
  if (match === null) {
    return value;
  }
  const [, year = "0", month = "0", day = "0", rest = ""] = match;
  const moved = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day) + days),
  );
  return `${moved.toISOString().slice(0, 10)}${rest}`;
}

function collectDates(value: unknown, path: string, into: Map<string, string>) {
  if (typeof value === "string") {
    if (datePattern.test(value)) {
      into.set(path, value);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      collectDates(item, `${path}[${index}]`, into);
    }
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      collectDates(item, `${path}.${key}`, into);
    }
  }
}

function withoutDates(value: unknown): unknown {
  if (typeof value === "string") {
    return datePattern.test(value) ? "<dato>" : value;
  }
  if (Array.isArray(value)) {
    return value.map(withoutDates);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, withoutDates(item)]),
    );
  }
  return value;
}

const fullSeed: SeedFile = {
  format: 1,
  seedId: "abc",
  anchorDate: "2026-11-16",
  frame: {
    people: [
      {
        id: "person-1",
        name: "Kari Nordmann",
        isVaroddAdmin: false,
        seeksWork: false,
        description: "Eier",
      },
    ],
    businesses: [
      {
        id: "bedrift-1",
        name: "Fjordlys Keramikk",
        description: "Keramikk",
        ownerId: "person-1",
        employeeIds: [],
        isEWavesMember: true,
        crawlOptIn: true,
        crawlSuggestions: ["ferdighet-1"],
        crawlSuggestionsUpdatedAt: "2026-11-09T10:00:00+01:00",
      },
    ],
    skills: [{ id: "ferdighet-1", name: "Regnskap" }],
    activity: [
      {
        id: "aktivitet-1",
        at: "2026-11-10T08:30:00+01:00",
        featureId: "marketplace",
        actor: "system",
        text: "Nytt oppdrag",
        target: { route: "/oppdrag/oppdrag-1" },
        audience: { personIds: ["person-1"], groups: [] },
      },
    ],
  },
  marketplace: {
    workerProfiles: [
      {
        personId: "person-2",
        skillIds: ["ferdighet-1"],
        experienceLevel: "mid",
        availableFrom: "2026-11-20",
        wishes: "Vil jobbe med tall",
        isDraft: false,
        navReferral: {
          referredAt: "2026-10-01T09:00:00+02:00",
          simulated: true,
        },
        eligibleSince: "2026-10-02T09:00:00+02:00",
        lastShortlistedAt: "2026-11-10T08:30:00+01:00",
      },
    ],
    requests: [
      {
        id: "oppdrag-1",
        businessId: "bedrift-1",
        title: "Hjelp med regnskap",
        description: "Vi trenger hjelp med regnskapet.",
        requiredSkillIds: ["ferdighet-1"],
        acceptedSuggestionIds: [],
        desiredStartDate: "2026-12-01",
        estimatedDuration: { amount: 4, unit: "weeks" },
        hoursPerWeek: 10,
        workLocation: "remote",
        status: "cancelled",
        createdAt: "2026-11-10T08:30:00+01:00",
        shortlist: [
          {
            workerId: "person-2",
            rank: 1,
            addedAt: "2026-11-10T08:30:01+01:00",
            matchedSkillIds: ["ferdighet-1"],
            missingSkillIds: [],
            interviewInvitedAt: "2026-11-11T09:00:00+01:00",
            offeredAt: "2026-11-12T09:00:00+01:00",
            state: "offered",
          },
        ],
        excludedWorkerIds: [
          {
            workerId: "person-3",
            reason: "declined",
            at: "2026-11-11T12:00:00+01:00",
          },
        ],
        offeredWorkerId: "person-2",
        agreement: {
          workerId: "person-2",
          ownerAgreedAt: "2026-11-12T09:00:00+01:00",
          workerAgreedAt: "2026-11-13T09:00:00+01:00",
        },
        actualStartDate: "2026-12-01",
        outcome: "not-completed",
        rejection: { reason: "Ingen passet", at: "2026-11-14T09:00:00+01:00" },
        cancellation: {
          reason: "Behovet forsvant",
          at: "2026-11-15T09:00:00+01:00",
          by: "person-1",
        },
        log: [
          {
            id: "logg-1",
            at: "2026-11-10T08:30:00+01:00",
            actor: "person-1",
            kind: "published",
            text: "Oppdraget ble publisert",
          },
        ],
      },
    ],
    conversations: [
      {
        id: "samtale-1",
        requestId: "oppdrag-1",
        ownerId: "person-1",
        workerId: "person-2",
        messages: [
          {
            id: "melding-1",
            at: "2026-11-11T10:00:00+01:00",
            authorId: "person-1",
            text: "Hei!",
          },
        ],
      },
    ],
    crawlCatalog: [{ businessId: "bedrift-1", rounds: [["ferdighet-1"]] }],
    crawlRuns: [
      {
        id: "gjennomgang-1",
        at: "2026-11-09T10:00:00+01:00",
        by: "person-9",
        crawledBusinessIds: ["bedrift-1"],
        skippedBusinessIds: [],
        simulated: true,
      },
    ],
  },
};

describe("daysBetween", () => {
  it("counts whole local days and can be 0", () => {
    expect(daysBetween("2026-11-16", new Date(2026, 10, 16, 23, 59))).toBe(0);
    expect(daysBetween("2026-11-16", new Date(2026, 10, 17, 0, 1))).toBe(1);
    expect(daysBetween("2026-11-16", new Date(2026, 11, 2, 12, 0))).toBe(16);
  });

  it("crosses month and year boundaries", () => {
    expect(daysBetween("2026-11-16", new Date(2027, 0, 1))).toBe(46);
  });
});

describe("shiftSeedDates", () => {
  const days = 9;

  function checkShift(seed: SeedFile) {
    const shifted = shiftSeedDates(seed, days);
    const before = new Map<string, string>();
    const after = new Map<string, string>();
    collectDates(seed, "seed", before);
    collectDates(shifted, "seed", after);
    expect(before.size).toBeGreaterThan(0);
    expect([...after.keys()]).toEqual([...before.keys()]);
    for (const [path, value] of before) {
      expect(after.get(path), path).toBe(expectedShift(value, days));
    }
    expect(withoutDates(shifted)).toEqual(withoutDates(seed));
  }

  it("moves every date field of a fully filled seed and keeps the time of day", () => {
    checkShift(fullSeed);
  });

  it("moves every date field of the bundled seed", () => {
    checkShift(bundledSeed);
  });

  it("does not change the seed it is given", () => {
    const copy = JSON.parse(JSON.stringify(fullSeed));
    shiftSeedDates(fullSeed, 3);
    expect(fullSeed).toEqual(copy);
  });

  it("keeps the offset and crosses month ends", () => {
    const shifted = shiftSeedDates(fullSeed, 20);
    expect(shifted.marketplace.requests[0]?.createdAt).toBe(
      "2026-11-30T08:30:00+01:00",
    );
    expect(shifted.marketplace.requests[0]?.desiredStartDate).toBe(
      "2026-12-21",
    );
    expect(shifted.marketplace.workerProfiles[0]?.navReferral?.referredAt).toBe(
      "2026-10-21T09:00:00+02:00",
    );
  });

  it("leaves everything as it is for 0 days", () => {
    expect(shiftSeedDates(fullSeed, 0)).toEqual(fullSeed);
  });
});

describe("loadSeedState", () => {
  it("returns a DemoState with meta filled in and dates moved to today", () => {
    const today = new Date(2026, 10, 20, 9, 30);
    const state = loadSeedState(today);
    expect(state.meta.seedId).toBe(bundledSeedId);
    expect(state.meta.anchorDate).toBe("2026-11-20");
    expect(state.meta.loadedAt).toBe(today.toISOString());
    expect(state.frame.people.length).toBe(bundledSeed.frame.people.length);
    expect(state.marketplace).toEqual(
      shiftSeedDates(bundledSeed, 4).marketplace,
    );
  });

  it("gives a fresh object on every call", () => {
    const today = new Date(2026, 10, 16);
    expect(loadSeedState(today)).not.toBe(loadSeedState(today));
    expect(loadSeedState(today).frame).not.toBe(bundledSeed.frame);
  });
});
