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
  knowledgeBase: {
    topics: [
      { id: "tema-1", name: "Nettbutikk", description: "Om nettbutikk" },
    ],
    questions: [
      {
        id: "sporsmal-1",
        topicId: "tema-1",
        title: "Hvordan sender jeg pakker?",
        description: "Vi trenger en god løsning for frakt.",
        authorId: "person-1",
        businessId: "bedrift-1",
        createdAt: "2026-11-05T09:00:00+01:00",
        editedAt: "2026-11-06T09:30:00+01:00",
        moderation: "flagged",
      },
    ],
    answers: [
      {
        id: "svar-1",
        questionId: "sporsmal-1",
        text: "Bruk en fraktavtale.",
        authorId: "person-2",
        businessId: "bedrift-1",
        createdAt: "2026-11-05T10:00:00+01:00",
        editedAt: "2026-11-05T11:00:00+01:00",
        moderation: "removed",
      },
    ],
    flags: [
      {
        id: "flagg-1",
        reviewId: "vurdering-1",
        targetKind: "answer",
        targetId: "svar-1",
        flaggedBy: "person-3",
        reason: "other",
        note: "Dette er utdatert.",
        at: "2026-11-07T08:00:00+01:00",
      },
    ],
    reviews: [
      {
        id: "vurdering-1",
        targetKind: "answer",
        targetId: "svar-1",
        openedAt: "2026-11-07T08:00:00+01:00",
        flagIds: ["flagg-1"],
        outcome: "removed",
        reviewedBy: "person-15",
        reviewedAt: "2026-11-08T08:00:00+01:00",
      },
    ],
    chatbotQuestions: [
      {
        id: "chatbot-1",
        text: "Hvordan sender jeg pakker?",
        answer: {
          text: "Bruk en fraktavtale.",
          sourceQuestionIds: ["sporsmal-1"],
          sourceAnswerIds: ["svar-1"],
        },
      },
    ],
    nearDuplicateExamples: [
      {
        id: "duplikat-1",
        title: "Hvordan sende pakker",
        description: "Frakt av pakker",
        matchesQuestionId: "sporsmal-1",
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

  it("moves every knowledge base date field by exactly the given days", () => {
    const shifted = shiftSeedDates(fullSeed, 20).knowledgeBase;
    expect(shifted.questions[0]?.createdAt).toBe("2026-11-25T09:00:00+01:00");
    expect(shifted.questions[0]?.editedAt).toBe("2026-11-26T09:30:00+01:00");
    expect(shifted.answers[0]?.createdAt).toBe("2026-11-25T10:00:00+01:00");
    expect(shifted.answers[0]?.editedAt).toBe("2026-11-25T11:00:00+01:00");
    expect(shifted.flags[0]?.at).toBe("2026-11-27T08:00:00+01:00");
    expect(shifted.reviews[0]?.openedAt).toBe("2026-11-27T08:00:00+01:00");
    expect(shifted.reviews[0]?.reviewedAt).toBe("2026-11-28T08:00:00+01:00");
  });

  it("keeps the knowledge base fields that are not dates", () => {
    const shifted = shiftSeedDates(fullSeed, 20).knowledgeBase;
    expect(shifted.topics).toEqual(fullSeed.knowledgeBase.topics);
    expect(shifted.chatbotQuestions).toEqual(
      fullSeed.knowledgeBase.chatbotQuestions,
    );
    expect(shifted.nearDuplicateExamples).toEqual(
      fullSeed.knowledgeBase.nearDuplicateExamples,
    );
    expect(shifted.reviews[0]?.outcome).toBe("removed");
    expect(shifted.reviews[0]?.reviewedBy).toBe("person-15");
  });

  it("leaves out optional knowledge base dates that are not set", () => {
    const question = fullSeed.knowledgeBase.questions[0];
    if (question === undefined) {
      throw new Error("Mangler spørsmål");
    }
    const { editedAt: _editedAt, ...withoutEdit } = question;
    const seed: SeedFile = {
      ...fullSeed,
      knowledgeBase: { ...fullSeed.knowledgeBase, questions: [withoutEdit] },
    };
    const shifted = shiftSeedDates(seed, 5).knowledgeBase.questions[0];
    expect(shifted).toBeDefined();
    expect(shifted && "editedAt" in shifted).toBe(false);
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
    expect(state.knowledgeBase).toEqual(
      shiftSeedDates(bundledSeed, 4).knowledgeBase,
    );
  });

  it("returns a state with a knowledge base part", () => {
    const state = loadSeedState(new Date(2026, 10, 16));
    expect(state.knowledgeBase).toBeDefined();
    expect(Array.isArray(state.knowledgeBase.topics)).toBe(true);
    expect(Array.isArray(state.knowledgeBase.questions)).toBe(true);
  });

  it("walks the bundled seed's knowledge base part when checking dates", () => {
    const shifted = shiftSeedDates(bundledSeed, 9);
    const before = new Map<string, string>();
    const after = new Map<string, string>();
    collectDates(bundledSeed.knowledgeBase, "knowledgeBase", before);
    collectDates(shifted.knowledgeBase, "knowledgeBase", after);
    expect([...after.keys()]).toEqual([...before.keys()]);
    for (const [path, value] of before) {
      expect(after.get(path), path).toBe(expectedShift(value, 9));
    }
  });

  it("gives a fresh object on every call", () => {
    const today = new Date(2026, 10, 16);
    expect(loadSeedState(today)).not.toBe(loadSeedState(today));
    expect(loadSeedState(today).frame).not.toBe(bundledSeed.frame);
  });
});
