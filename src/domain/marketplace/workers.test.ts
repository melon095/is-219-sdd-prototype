import { describe, expect, it } from "vitest";
import type { CommandResult, DemoState } from "../frame/types";
import { isEligibleForMatching } from "./matching";
import {
  createContext,
  createState,
  deepFreeze,
  entry,
  ids,
  request,
  requestIn,
  worker,
} from "./testState";
import type { WorkerProfile } from "./types";
import {
  registerWorkerProfile,
  simulateNavReferral,
  updateWorkerProfile,
} from "./workers";

const now = "2026-11-16T10:00:00+01:00";

const validInput = {
  skillIds: ["ferdighet-1", "ferdighet-2"],
  experienceLevel: "mid",
  availableFrom: "2026-11-20",
};

function register(
  state: DemoState,
  actorId: string,
  overrides: Record<string, unknown> = {},
): CommandResult {
  return registerWorkerProfile(
    state,
    { type: "registerWorkerProfile", ...validInput, ...overrides },
    createContext(actorId, now),
  );
}

function update(
  state: DemoState,
  actorId: string,
  overrides: Record<string, unknown> = {},
): CommandResult {
  return updateWorkerProfile(
    state,
    { type: "updateWorkerProfile", ...validInput, ...overrides },
    createContext(actorId, now),
  );
}

function refer(
  state: DemoState,
  personId: string,
  actorId: string = ids.admin,
): CommandResult {
  return simulateNavReferral(
    state,
    { type: "simulateNavReferral", personId },
    createContext(actorId, now),
  );
}

function errorOf(result: CommandResult) {
  if (result.ok) {
    throw new Error("Forventet en feil");
  }
  return result.error;
}

function okState(result: CommandResult): DemoState {
  if (!result.ok) {
    throw new Error(`Forventet suksess: ${result.error.message}`);
  }
  return result.state;
}

function profileOf(state: DemoState, personId: string) {
  return state.marketplace.workerProfiles.find(
    (item) => item.personId === personId,
  );
}

function navDraft(personId: string, overrides: Partial<WorkerProfile> = {}) {
  return {
    personId,
    skillIds: [],
    isDraft: true,
    navReferral: {
      referredAt: "2026-11-10T09:00:00+01:00",
      simulated: true as const,
    },
    ...overrides,
  } satisfies WorkerProfile;
}

describe("registerWorkerProfile", () => {
  it("creates a complete profile that is not a draft", () => {
    const state = okState(
      register(deepFreeze(createState()), ids.thea, {
        wishes: "Jeg vil jobbe med tekst.",
      }),
    );
    expect(profileOf(state, ids.thea)).toEqual({
      personId: ids.thea,
      skillIds: ["ferdighet-1", "ferdighet-2"],
      experienceLevel: "mid",
      availableFrom: "2026-11-20",
      wishes: "Jeg vil jobbe med tekst.",
      isDraft: false,
      eligibleSince: now,
    });
  });

  it("leaves out blank wishes", () => {
    const state = okState(register(createState(), ids.thea, { wishes: "  " }));
    expect(profileOf(state, ids.thea)).not.toHaveProperty("wishes");
  });

  it("is allowed only for the person themselves, and only if they seek work", () => {
    for (const actor of [ids.owner1, ids.employee1, ids.admin]) {
      expect(errorOf(register(createState(), actor)).code).toBe("not-allowed");
    }
  });

  it("needs at least one known skill, an experience level and a start date", () => {
    const empty = errorOf(register(createState(), ids.thea, { skillIds: [] }));
    expect(empty.code).toBe("validation");
    expect(empty.fieldErrors?.skillIds).toBeDefined();

    const unknown = errorOf(
      register(createState(), ids.thea, { skillIds: ["ferdighet-99"] }),
    );
    expect(unknown.code).toBe("validation");
    expect(unknown.fieldErrors?.skillIds).toBeDefined();

    const missing = errorOf(
      register(createState(), ids.thea, {
        experienceLevel: undefined,
        availableFrom: undefined,
      }),
    );
    expect(missing.code).toBe("validation");
    expect(Object.keys(missing.fieldErrors ?? {}).sort()).toEqual([
      "availableFrom",
      "experienceLevel",
    ]);

    const badLevel = errorOf(
      register(createState(), ids.thea, { experienceLevel: "ekspert" }),
    );
    expect(badLevel.fieldErrors?.experienceLevel).toBeDefined();

    const badDate = errorOf(
      register(createState(), ids.thea, { availableFrom: "2026-13-40" }),
    );
    expect(badDate.fieldErrors?.availableFrom).toBeDefined();
  });

  it("leaves the state unchanged on a failure", () => {
    const state = deepFreeze(createState());
    expect(register(state, ids.thea, { skillIds: [] }).ok).toBe(false);
    expect(state.marketplace.workerProfiles).toEqual([]);
  });

  it("completes a NAV draft and keeps the NAV referral", () => {
    const state = okState(
      register(createState({ workers: [navDraft(ids.thea)] }), ids.thea),
    );
    const profile = profileOf(state, ids.thea);
    expect(profile?.isDraft).toBe(false);
    expect(profile?.skillIds).toEqual(["ferdighet-1", "ferdighet-2"]);
    expect(profile?.navReferral).toEqual({
      referredAt: "2026-11-10T09:00:00+01:00",
      simulated: true,
    });
    expect(profile?.eligibleSince).toBe(now);
    expect(state.marketplace.workerProfiles).toHaveLength(1);
  });

  it("keeps eligibleSince when it is already set", () => {
    const state = okState(
      register(
        createState({
          workers: [
            navDraft(ids.thea, { eligibleSince: "2026-10-01T09:00:00+01:00" }),
          ],
        }),
        ids.thea,
      ),
    );
    expect(profileOf(state, ids.thea)?.eligibleSince).toBe(
      "2026-10-01T09:00:00+01:00",
    );
  });

  it("refuses to register again when a complete profile exists", () => {
    const state = createState({ workers: [worker(ids.thea)] });
    expect(errorOf(register(state, ids.thea)).code).toBe("invalid-status");
  });

  it("announces that the profile is ready, to the worker only", () => {
    const state = okState(register(createState(), ids.thea));
    const ready = state.frame.activity.filter((item) =>
      item.text.includes("Profilen din er klar"),
    );
    expect(ready).toHaveLength(1);
    expect(ready[0]).toMatchObject({
      featureId: "marketplace",
      actor: ids.thea,
      at: now,
      audience: { personIds: [ids.thea], groups: [] },
      target: { route: "/profil" },
    });
  });

  it("matches the new worker against open, shortlisted and offered requests, oldest first", () => {
    const base = createState({
      workers: [worker(ids.mats)],
      requests: [
        request("oppdrag-1", { createdAt: "2026-11-05T09:00:00+01:00" }),
        request("oppdrag-2", {
          createdAt: "2026-11-01T09:00:00+01:00",
          status: "shortlisted",
          shortlist: [entry(ids.mats)],
        }),
        request("oppdrag-3", {
          createdAt: "2026-11-03T09:00:00+01:00",
          status: "offered",
          offeredWorkerId: ids.mats,
          shortlist: [
            entry(ids.mats, {
              state: "offered",
              offeredAt: "2026-11-14T09:00:00+01:00",
            }),
          ],
        }),
      ],
    });
    const state = okState(register(deepFreeze(base), ids.thea));

    for (const id of ["oppdrag-1", "oppdrag-2", "oppdrag-3"]) {
      const listed = requestIn(state, id)?.shortlist.find(
        (item) => item.workerId === ids.thea,
      );
      expect(listed).toMatchObject({ state: "active", addedAt: now });
    }
    expect(requestIn(state, "oppdrag-1")?.status).toBe("shortlisted");
    expect(requestIn(state, "oppdrag-3")?.status).toBe("offered");
    const order = state.frame.activity
      .filter((item) => item.audience.personIds.includes(ids.thea))
      .map((item) => item.target.route)
      .filter((route) => route.startsWith("/oppdrag/"));
    expect(order).toEqual([
      "/oppdrag/oppdrag-2",
      "/oppdrag/oppdrag-3",
      "/oppdrag/oppdrag-1",
    ]);
    expect(profileOf(state, ids.thea)?.lastShortlistedAt).toBe(now);
  });

  it("does not add the worker to full, finished or non-matching requests", () => {
    const full = request("oppdrag-1", {
      status: "shortlisted",
      shortlist: [
        entry(ids.mats, { rank: 1 }),
        entry(ids.amina, { rank: 2 }),
        entry(ids.lena, { rank: 3 }),
      ],
    });
    const base = createState({
      workers: [worker(ids.mats), worker(ids.amina), worker(ids.lena)],
      requests: [
        full,
        request("oppdrag-2", { status: "completed" }),
        request("oppdrag-3", { status: "under-review" }),
        request("oppdrag-4", { requiredSkillIds: ["ferdighet-5"] }),
      ],
    });
    const state = okState(register(base, ids.thea));
    expect(requestIn(state, "oppdrag-1")).toEqual(full);
    for (const id of ["oppdrag-2", "oppdrag-3", "oppdrag-4"]) {
      expect(requestIn(state, id)?.shortlist).toEqual([]);
    }
  });

  it("does not add a worker who is busy on another request", () => {
    const base = createState({
      workers: [worker(ids.thea, { skillIds: ["ferdighet-3"] })],
      requests: [
        request("oppdrag-1", {
          status: "agreed",
          agreement: {
            workerId: ids.thea,
            ownerAgreedAt: "2026-11-10T09:00:00+01:00",
            workerAgreedAt: "2026-11-11T09:00:00+01:00",
          },
        }),
        request("oppdrag-2"),
      ],
    });
    const state = okState(update(base, ids.thea));
    expect(requestIn(state, "oppdrag-2")?.shortlist).toEqual([]);
  });
});

describe("updateWorkerProfile", () => {
  const existing = worker(ids.thea, {
    skillIds: ["ferdighet-3"],
    experienceLevel: "junior",
    availableFrom: "2026-12-20",
    wishes: "Gammelt ønske",
    eligibleSince: "2026-10-01T09:00:00+01:00",
    lastShortlistedAt: "2026-11-02T09:00:00+01:00",
  });

  it("replaces the profile fields and keeps the rest", () => {
    const state = okState(
      update(deepFreeze(createState({ workers: [existing] })), ids.thea, {
        wishes: "",
      }),
    );
    expect(profileOf(state, ids.thea)).toEqual({
      personId: ids.thea,
      skillIds: ["ferdighet-1", "ferdighet-2"],
      experienceLevel: "mid",
      availableFrom: "2026-11-20",
      isDraft: false,
      eligibleSince: "2026-10-01T09:00:00+01:00",
      lastShortlistedAt: "2026-11-02T09:00:00+01:00",
    });
  });

  it("does not change existing shortlist entries", () => {
    const listed = request("oppdrag-1", {
      status: "shortlisted",
      requiredSkillIds: ["ferdighet-3"],
      shortlist: [
        entry(ids.thea, {
          matchedSkillIds: ["ferdighet-3"],
          missingSkillIds: [],
        }),
      ],
    });
    const base = createState({ workers: [existing], requests: [listed] });
    const state = okState(update(base, ids.thea));
    expect(requestIn(state, "oppdrag-1")).toEqual(listed);
  });

  it("can add the worker to requests the new skills now fit", () => {
    const base = createState({
      workers: [existing],
      requests: [request("oppdrag-1")],
    });
    const state = okState(update(base, ids.thea));
    expect(
      requestIn(state, "oppdrag-1")?.shortlist.map((item) => item.workerId),
    ).toEqual([ids.thea]);
  });

  it("is allowed only for a person seeking work who has a complete profile", () => {
    expect(
      errorOf(update(createState({ workers: [existing] }), ids.owner1)).code,
    ).toBe("not-allowed");
    expect(errorOf(update(createState(), ids.thea)).code).toBe(
      "invalid-status",
    );
    expect(
      errorOf(update(createState({ workers: [navDraft(ids.thea)] }), ids.thea))
        .code,
    ).toBe("invalid-status");
  });

  it("validates the fields the same way as registering", () => {
    const error = errorOf(
      update(createState({ workers: [existing] }), ids.thea, {
        skillIds: [],
      }),
    );
    expect(error.code).toBe("validation");
    expect(error.fieldErrors?.skillIds).toBeDefined();
  });
});

describe("simulateNavReferral", () => {
  it("creates a draft profile with the referral", () => {
    const state = okState(refer(deepFreeze(createState()), ids.thea));
    expect(profileOf(state, ids.thea)).toEqual({
      personId: ids.thea,
      skillIds: [],
      isDraft: true,
      navReferral: { referredAt: now, simulated: true },
    });
  });

  it("announces the referral to the referred person only", () => {
    const state = okState(refer(createState(), ids.thea));
    expect(state.frame.activity).toHaveLength(1);
    expect(state.frame.activity[0]).toMatchObject({
      featureId: "marketplace",
      actor: ids.admin,
      text: "Du er henvist fra NAV (simulert)",
      audience: { personIds: [ids.thea], groups: [] },
      target: { route: "/profil" },
    });
  });

  it("never makes the draft a matching candidate", () => {
    const state = okState(
      refer(createState({ requests: [request("oppdrag-1")] }), ids.thea),
    );
    const draft = profileOf(state, ids.thea);
    expect(draft && isEligibleForMatching(draft, state)).toBe(false);
    expect(requestIn(state, "oppdrag-1")?.status).toBe("open");
    expect(requestIn(state, "oppdrag-1")?.shortlist).toEqual([]);
  });

  it("is allowed for administrators only", () => {
    for (const actor of [ids.owner1, ids.thea, ids.mats]) {
      expect(errorOf(refer(createState(), ids.thea, actor)).code).toBe(
        "not-allowed",
      );
    }
  });

  it("needs a person who seeks work and has no profile", () => {
    expect(errorOf(refer(createState(), ids.owner1)).code).toBe(
      "invalid-status",
    );
    expect(
      errorOf(refer(createState({ workers: [worker(ids.mats)] }), ids.mats))
        .code,
    ).toBe("invalid-status");
    expect(
      errorOf(refer(createState({ workers: [navDraft(ids.thea)] }), ids.thea))
        .code,
    ).toBe("invalid-status");
    expect(errorOf(refer(createState(), "person-99")).code).toBe("not-found");
  });
});
