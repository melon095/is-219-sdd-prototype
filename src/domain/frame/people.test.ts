import { describe, expect, it } from "vitest";
import { emptyKnowledgeBaseState } from "../knowledge-base/types";
import type { TaskRequest } from "../marketplace/types";
import {
  isAdmin,
  isOwnerOf,
  ownedBusiness,
  peopleWorkingAt,
  personById,
  switcherSection,
  workerProfileOf,
} from "./people";
import type { Business, DemoState, Person } from "./types";

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

function business(id: string, overrides: Partial<Business> = {}): Business {
  return {
    id,
    name: `Bedrift ${id}`,
    description: "",
    ownerId: "person-1",
    employeeIds: [],
    isEWavesMember: false,
    crawlOptIn: false,
    crawlSuggestions: [],
    ...overrides,
  };
}

function request(
  id: string,
  businessId: string,
  overrides: Partial<TaskRequest>,
): TaskRequest {
  return {
    id,
    businessId,
    title: "Tittel",
    description: "Beskrivelse",
    requiredSkillIds: ["ferdighet-1"],
    acceptedSuggestionIds: [],
    desiredStartDate: "2026-12-01",
    estimatedDuration: { amount: 4, unit: "weeks" },
    hoursPerWeek: 10,
    workLocation: "remote",
    status: "open",
    createdAt: "2026-11-01T09:00:00+01:00",
    shortlist: [],
    excludedWorkerIds: [],
    log: [],
    ...overrides,
  };
}

const people = [
  person("person-1"),
  person("person-2"),
  person("person-3", { isVaroddAdmin: true }),
  person("person-4", { seeksWork: true }),
  person("person-5", { seeksWork: true }),
  person("person-6", { seeksWork: true }),
  person("person-7", { seeksWork: true }),
  person("person-8", { seeksWork: true }),
];

const bedrift1 = business("bedrift-1", {
  ownerId: "person-1",
  employeeIds: ["person-2"],
});
const bedrift2 = business("bedrift-2", { ownerId: "person-3" });

const state: DemoState = {
  meta: {
    seedId: "seed",
    anchorDate: "2026-11-16",
    loadedAt: "2026-11-16T08:00:00+01:00",
  },
  frame: {
    people,
    businesses: [bedrift1, bedrift2],
    skills: [{ id: "ferdighet-1", name: "Regnskap" }],
    activity: [],
  },
  marketplace: {
    workerProfiles: [
      { personId: "person-4", skillIds: ["ferdighet-1"], isDraft: false },
    ],
    requests: [
      request("oppdrag-1", "bedrift-1", {
        status: "in-progress",
        agreement: {
          workerId: "person-4",
          ownerAgreedAt: "2026-11-02T09:00:00+01:00",
          workerAgreedAt: "2026-11-03T09:00:00+01:00",
        },
      }),
      request("oppdrag-2", "bedrift-1", {
        status: "completed",
        outcome: "permanent",
        agreement: {
          workerId: "person-5",
          ownerAgreedAt: "2026-10-02T09:00:00+01:00",
          workerAgreedAt: "2026-10-03T09:00:00+01:00",
        },
      }),
      request("oppdrag-3", "bedrift-1", {
        status: "completed",
        outcome: "as-planned",
        agreement: {
          workerId: "person-6",
          ownerAgreedAt: "2026-09-02T09:00:00+01:00",
          workerAgreedAt: "2026-09-03T09:00:00+01:00",
        },
      }),
      request("oppdrag-4", "bedrift-1", {
        status: "completed",
        outcome: "extended",
        agreement: {
          workerId: "person-7",
          ownerAgreedAt: "2026-09-02T09:00:00+01:00",
          workerAgreedAt: "2026-09-03T09:00:00+01:00",
        },
      }),
      request("oppdrag-5", "bedrift-1", {
        status: "cancelled",
        outcome: "not-completed",
        agreement: {
          workerId: "person-8",
          ownerAgreedAt: "2026-09-02T09:00:00+01:00",
          workerAgreedAt: "2026-09-03T09:00:00+01:00",
        },
      }),
      request("oppdrag-6", "bedrift-1", {
        status: "in-progress",
        agreement: {
          workerId: "person-4",
          ownerAgreedAt: "2026-11-02T09:00:00+01:00",
          workerAgreedAt: "2026-11-03T09:00:00+01:00",
        },
      }),
      request("oppdrag-7", "bedrift-2", {
        status: "in-progress",
        agreement: {
          workerId: "person-2",
          ownerAgreedAt: "2026-11-02T09:00:00+01:00",
          workerAgreedAt: "2026-11-03T09:00:00+01:00",
        },
      }),
    ],
    conversations: [],
    crawlCatalog: [],
    crawlRuns: [],
  },
  knowledgeBase: emptyKnowledgeBaseState(),
};

describe("isOwnerOf", () => {
  it("is true only for the owner", () => {
    expect(isOwnerOf("person-1", bedrift1)).toBe(true);
    expect(isOwnerOf("person-2", bedrift1)).toBe(false);
  });
});

describe("ownedBusiness", () => {
  it("returns the business a person owns", () => {
    expect(ownedBusiness("person-1", state)).toBe(bedrift1);
    expect(ownedBusiness("person-3", state)).toBe(bedrift2);
  });

  it("returns undefined for people who own nothing", () => {
    expect(ownedBusiness("person-2", state)).toBeUndefined();
    expect(ownedBusiness("person-4", state)).toBeUndefined();
  });
});

describe("isAdmin", () => {
  it("reflects isVaroddAdmin", () => {
    expect(isAdmin(people[2] as Person)).toBe(true);
    expect(isAdmin(people[0] as Person)).toBe(false);
  });
});

describe("personById", () => {
  it("finds a person by id", () => {
    expect(personById("person-3", state)?.name).toBe("Navn person-3");
    expect(personById("finnes-ikke", state)).toBeUndefined();
  });
});

describe("workerProfileOf", () => {
  it("returns the profile when there is one", () => {
    expect(workerProfileOf("person-4", state)?.personId).toBe("person-4");
  });

  it("returns undefined when there is none", () => {
    expect(workerProfileOf("person-1", state)).toBeUndefined();
  });
});

describe("peopleWorkingAt", () => {
  const ids = peopleWorkingAt(bedrift1, state).map((p) => p.id);

  it("always includes the owner and the employees", () => {
    expect(ids).toContain("person-1");
    expect(ids).toContain("person-2");
  });

  it("includes a worker whose request for the business is in progress", () => {
    expect(ids).toContain("person-4");
  });

  it("includes a worker whose request completed as a permanent position", () => {
    expect(ids).toContain("person-5");
  });

  it("leaves out completed as planned, extended, and cancelled", () => {
    expect(ids).not.toContain("person-6");
    expect(ids).not.toContain("person-7");
    expect(ids).not.toContain("person-8");
  });

  it("lists nobody twice", () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only counts requests for this business", () => {
    const other = peopleWorkingAt(bedrift2, state).map((p) => p.id);
    expect(other).toEqual(["person-3", "person-2"]);
  });
});

describe("switcherSection", () => {
  const extraPeople = [
    person("person-9", { isVaroddAdmin: true }),
    person("person-10", { isVaroddAdmin: true, seeksWork: true }),
    person("person-11", { seeksWork: true }),
    person("person-12"),
  ];
  const switcherState: DemoState = {
    ...state,
    frame: {
      ...state.frame,
      people: [...people, ...extraPeople],
      businesses: [bedrift1, { ...bedrift2, employeeIds: ["person-11"] }],
    },
  };

  function sectionOf(id: string) {
    return switcherSection(
      personById(id, switcherState) as Person,
      switcherState,
    );
  }

  it("puts an owner in Bedriftseiere", () => {
    expect(sectionOf("person-1")).toBe("Bedriftseiere");
  });

  it("puts an employee in Ansatte", () => {
    expect(sectionOf("person-2")).toBe("Ansatte");
  });

  it("puts a person seeking work in Arbeidssøkere", () => {
    expect(sectionOf("person-4")).toBe("Arbeidssøkere");
  });

  it("puts an administrator in Varodd", () => {
    expect(sectionOf("person-9")).toBe("Varodd");
  });

  it("gives the first matching section only", () => {
    expect(sectionOf("person-3")).toBe("Bedriftseiere");
    expect(sectionOf("person-11")).toBe("Ansatte");
    expect(sectionOf("person-10")).toBe("Arbeidssøkere");
  });

  it("returns nothing for a person with none of the roles", () => {
    expect(sectionOf("person-12")).toBeUndefined();
  });
});
