import { describe, expect, it } from "vitest";
import { type AudienceGroups, canSeeEntry, visibleActivity } from "./activity";
import type { ActivityEntry, DemoState, Person } from "./types";

function person(id: string, overrides: Partial<Person> = {}): Person {
  return {
    id,
    name: `Navn ${id}`,
    isVaroddAdmin: false,
    seeksWork: false,
    description: "",
    ...overrides,
  };
}

function entry(
  id: string,
  at: string,
  audience: ActivityEntry["audience"],
): ActivityEntry {
  return {
    id,
    at,
    featureId: "marketplace",
    actor: "system",
    text: `Hendelse ${id}`,
    target: { route: "/oppdrag/oppdrag-1" },
    audience,
  };
}

const owner = person("person-1");
const worker = person("person-2", { seeksWork: true });
const bystander = person("person-3");
const admin = person("person-4", { isVaroddAdmin: true });

const direct = entry("a-1", "2026-11-10T10:00:00+01:00", {
  personIds: ["person-1"],
  groups: [],
});
const forWorkers = entry("a-2", "2026-11-12T10:00:00+01:00", {
  personIds: [],
  groups: ["marketplace.workers"],
});
const unknownGroup = entry("a-3", "2026-11-11T10:00:00+01:00", {
  personIds: [],
  groups: ["ukjent.gruppe"],
});

const state: DemoState = {
  meta: {
    seedId: "seed",
    anchorDate: "2026-11-16",
    loadedAt: "2026-11-16T08:00:00+01:00",
  },
  frame: {
    people: [owner, worker, bystander, admin],
    businesses: [],
    skills: [],
    activity: [direct, forWorkers, unknownGroup],
  },
  marketplace: {
    workerProfiles: [
      { personId: "person-2", skillIds: ["ferdighet-1"], isDraft: false },
    ],
    requests: [],
    conversations: [],
    crawlCatalog: [],
    crawlRuns: [],
  },
};

const groups: AudienceGroups = {
  "marketplace.workers": (p, s) =>
    s.marketplace.workerProfiles.some(
      (profile) => profile.personId === p.id && !profile.isDraft,
    ),
};

describe("canSeeEntry", () => {
  it("shows an entry to people in personIds", () => {
    expect(canSeeEntry(direct, owner, state, groups)).toBe(true);
    expect(canSeeEntry(direct, worker, state, groups)).toBe(false);
  });

  it("shows an entry to members of one of its groups", () => {
    expect(canSeeEntry(forWorkers, worker, state, groups)).toBe(true);
    expect(canSeeEntry(forWorkers, bystander, state, groups)).toBe(false);
  });

  it("checks group membership when called", () => {
    const later: DemoState = {
      ...state,
      marketplace: {
        ...state.marketplace,
        workerProfiles: [
          ...state.marketplace.workerProfiles,
          { personId: "person-3", skillIds: ["ferdighet-1"], isDraft: false },
        ],
      },
    };
    expect(canSeeEntry(forWorkers, bystander, state, groups)).toBe(false);
    expect(canSeeEntry(forWorkers, bystander, later, groups)).toBe(true);
  });

  it("shows every entry to a Varodd administrator", () => {
    expect(canSeeEntry(direct, admin, state, groups)).toBe(true);
    expect(canSeeEntry(forWorkers, admin, state, groups)).toBe(true);
    expect(canSeeEntry(unknownGroup, admin, state, groups)).toBe(true);
  });

  it("hides entries for unknown groups from non-admins", () => {
    expect(canSeeEntry(unknownGroup, owner, state, groups)).toBe(false);
    expect(canSeeEntry(unknownGroup, worker, state, groups)).toBe(false);
  });
});

describe("visibleActivity", () => {
  it("returns only visible entries, newest first", () => {
    expect(visibleActivity(state, admin, groups).map((e) => e.id)).toEqual([
      "a-2",
      "a-3",
      "a-1",
    ]);
    expect(visibleActivity(state, worker, groups).map((e) => e.id)).toEqual([
      "a-2",
    ]);
    expect(visibleActivity(state, bystander, groups)).toEqual([]);
  });

  it("does not change the order of the state's activity list", () => {
    visibleActivity(state, admin, groups);
    expect(state.frame.activity.map((e) => e.id)).toEqual([
      "a-1",
      "a-2",
      "a-3",
    ]);
  });
});
