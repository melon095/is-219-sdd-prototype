import { describe, expect, it } from "vitest";
import {
  fillRequests,
  fillShortlist,
  isBusy,
  isEligibleForMatching,
  rankCandidates,
} from "./matching";
import {
  conversation,
  createContext,
  createState,
  deepFreeze,
  entry,
  ids,
  request,
  requestIn,
  worker,
} from "./testState";

const context = createContext("system", "2026-11-16T10:00:00+01:00", "ny");

function rankedIds(
  req = request("oppdrag-1"),
  workers = [] as ReturnType<typeof worker>[],
) {
  return rankCandidates(req, workers).map((item) => item.worker.personId);
}

describe("isBusy and isEligibleForMatching", () => {
  it("treats the agreed worker on an agreed or in-progress request as busy", () => {
    const agreed = request("oppdrag-1", {
      status: "agreed",
      agreement: {
        workerId: ids.mats,
        ownerAgreedAt: "2026-11-10T09:00:00+01:00",
        workerAgreedAt: "2026-11-11T09:00:00+01:00",
      },
    });
    const inProgress = request("oppdrag-2", {
      status: "in-progress",
      agreement: {
        workerId: ids.amina,
        ownerAgreedAt: "2026-11-10T09:00:00+01:00",
        workerAgreedAt: "2026-11-11T09:00:00+01:00",
      },
    });
    const completed = request("oppdrag-3", {
      status: "completed",
      agreement: {
        workerId: ids.henrik,
        ownerAgreedAt: "2026-11-10T09:00:00+01:00",
        workerAgreedAt: "2026-11-11T09:00:00+01:00",
      },
    });
    const state = createState({ requests: [agreed, inProgress, completed] });
    expect(isBusy(worker(ids.mats), state)).toBe(true);
    expect(isBusy(worker(ids.amina), state)).toBe(true);
    expect(isBusy(worker(ids.henrik), state)).toBe(false);
    expect(isBusy(worker(ids.lena), state)).toBe(false);
  });

  it("requires a complete profile that is not a draft and not busy", () => {
    const state = createState({});
    expect(isEligibleForMatching(worker(ids.mats), state)).toBe(true);
    expect(
      isEligibleForMatching(worker(ids.mats, { isDraft: true }), state),
    ).toBe(false);
    expect(
      isEligibleForMatching(worker(ids.mats, { skillIds: [] }), state),
    ).toBe(false);
    expect(
      isEligibleForMatching(
        worker(ids.mats, { experienceLevel: undefined }),
        state,
      ),
    ).toBe(false);
    expect(
      isEligibleForMatching(
        worker(ids.mats, { availableFrom: undefined }),
        state,
      ),
    ).toBe(false);
  });

  it("is not eligible while busy", () => {
    const state = createState({
      requests: [
        request("oppdrag-1", {
          status: "agreed",
          agreement: {
            workerId: ids.mats,
            ownerAgreedAt: "2026-11-10T09:00:00+01:00",
            workerAgreedAt: "2026-11-11T09:00:00+01:00",
          },
        }),
      ],
    });
    expect(isEligibleForMatching(worker(ids.mats), state)).toBe(false);
  });
});

describe("rankCandidates", () => {
  it("accepts a worker with at least half of the required skills", () => {
    const req = request("oppdrag-1", {
      requiredSkillIds: [
        "ferdighet-1",
        "ferdighet-2",
        "ferdighet-3",
        "ferdighet-4",
      ],
    });
    const half = worker(ids.mats, { skillIds: ["ferdighet-1", "ferdighet-2"] });
    const less = worker(ids.amina, { skillIds: ["ferdighet-1"] });
    const ranked = rankCandidates(req, [half, less]);
    expect(ranked.map((item) => item.worker.personId)).toEqual([ids.mats]);
    expect(ranked[0]?.matchedSkillIds).toEqual(["ferdighet-1", "ferdighet-2"]);
    expect(ranked[0]?.missingSkillIds).toEqual(["ferdighet-3", "ferdighet-4"]);
  });

  it("requires availableFrom on or before the desired start date", () => {
    const req = request("oppdrag-1", { desiredStartDate: "2026-12-01" });
    const onTheDay = worker(ids.mats, { availableFrom: "2026-12-01" });
    const tooLate = worker(ids.amina, { availableFrom: "2026-12-02" });
    expect(rankedIds(req, [onTheDay, tooLate])).toEqual([ids.mats]);
  });

  it("ranks the higher share of required skills first", () => {
    const req = request("oppdrag-1", {
      requiredSkillIds: ["ferdighet-1", "ferdighet-2", "ferdighet-3"],
    });
    const two = worker(ids.mats, {
      skillIds: ["ferdighet-1", "ferdighet-2"],
      availableFrom: "2026-11-01",
    });
    const three = worker(ids.amina, {
      skillIds: ["ferdighet-1", "ferdighet-2", "ferdighet-3"],
      availableFrom: "2026-11-25",
    });
    expect(rankedIds(req, [two, three])).toEqual([ids.amina, ids.mats]);
  });

  it("ranks the earlier availableFrom first when the share is equal", () => {
    const late = worker(ids.mats, { availableFrom: "2026-11-25" });
    const early = worker(ids.amina, { availableFrom: "2026-11-18" });
    expect(rankedIds(undefined, [late, early])).toEqual([ids.amina, ids.mats]);
  });

  it("ranks the longer wait since last shortlisted first, never shortlisted oldest", () => {
    const recent = worker(ids.mats, {
      lastShortlistedAt: "2026-11-10T09:00:00+01:00",
    });
    const older = worker(ids.amina, {
      lastShortlistedAt: "2026-11-02T09:00:00+01:00",
    });
    const never = worker(ids.henrik);
    expect(rankedIds(undefined, [recent, older, never])).toEqual([
      ids.henrik,
      ids.amina,
      ids.mats,
    ]);
  });

  it("ranks the earlier eligibleSince first", () => {
    const later = worker(ids.mats, {
      eligibleSince: "2026-10-20T09:00:00+01:00",
    });
    const earlier = worker(ids.amina, {
      eligibleSince: "2026-10-05T09:00:00+01:00",
    });
    expect(rankedIds(undefined, [later, earlier])).toEqual([
      ids.amina,
      ids.mats,
    ]);
  });

  it("falls back to person ID order so the result is stable", () => {
    const a = worker("person-9");
    const b = worker("person-8");
    expect(rankedIds(undefined, [a, b])).toEqual(["person-8", "person-9"]);
    expect(rankedIds(undefined, [b, a])).toEqual(["person-8", "person-9"]);
  });

  it("ranks two workers identical except navReferral by person ID only", () => {
    const referred = worker("person-9", {
      navReferral: {
        referredAt: "2026-10-01T09:00:00+01:00",
        simulated: true,
      },
    });
    const plain = worker("person-8");
    expect(rankedIds(undefined, [referred, plain])).toEqual([
      "person-8",
      "person-9",
    ]);
    const plainHigher = worker("person-10");
    const referredLower = worker("person-1", {
      navReferral: {
        referredAt: "2026-10-01T09:00:00+01:00",
        simulated: true,
      },
    });
    expect(rankedIds(undefined, [plainHigher, referredLower])).toEqual([
      "person-1",
      "person-10",
    ]);
  });

  it("is not changed by experience level, hours, location or extra requirements", () => {
    const workers = [
      worker(ids.mats, { experienceLevel: "junior" }),
      worker(ids.amina, { experienceLevel: "senior" }),
      worker(ids.henrik, { experienceLevel: "mid" }),
    ];
    const base = rankedIds(request("oppdrag-1"), workers);
    const changed = rankedIds(
      request("oppdrag-1", {
        hoursPerWeek: 40,
        workLocation: "onsite",
        additionalRequirements: "Må ha minst fem års erfaring",
      }),
      workers.map((item) => ({
        ...item,
        experienceLevel:
          item.experienceLevel === "senior" ? "junior" : "senior",
      })),
    );
    expect(changed).toEqual(base);
  });
});

describe("fillShortlist", () => {
  it("adds ranked entries with rank, addedAt, matched and missing skills", () => {
    const req = request("oppdrag-1", {
      requiredSkillIds: ["ferdighet-1", "ferdighet-2", "ferdighet-3"],
    });
    const state = deepFreeze(
      createState({
        requests: [req],
        workers: [
          worker(ids.mats, { skillIds: ["ferdighet-1", "ferdighet-2"] }),
          worker(ids.amina, {
            skillIds: ["ferdighet-1", "ferdighet-2", "ferdighet-3"],
          }),
        ],
      }),
    );
    const next = fillShortlist(req, state, context);
    const filled = requestIn(next, "oppdrag-1");
    expect(filled?.shortlist.map((item) => item.workerId)).toEqual([
      ids.amina,
      ids.mats,
    ]);
    expect(filled?.shortlist[0]).toEqual({
      workerId: ids.amina,
      rank: 1,
      addedAt: context.now,
      matchedSkillIds: ["ferdighet-1", "ferdighet-2", "ferdighet-3"],
      missingSkillIds: [],
      state: "active",
    });
    expect(filled?.shortlist[1]?.rank).toBe(2);
    expect(filled?.shortlist[1]?.missingSkillIds).toEqual(["ferdighet-3"]);
  });

  it("stops at 3 entries that are active or offered", () => {
    const req = request("oppdrag-1");
    const state = createState({
      requests: [req],
      workers: [
        worker("person-8"),
        worker("person-9"),
        worker("person-10"),
        worker("person-11"),
        worker("person-12"),
      ],
    });
    const next = fillShortlist(req, state, context);
    expect(requestIn(next, "oppdrag-1")?.shortlist).toHaveLength(3);

    const withOffered = request("oppdrag-2", {
      status: "offered",
      offeredWorkerId: "person-8",
      shortlist: [entry("person-8", { state: "offered" })],
    });
    const second = fillShortlist(
      withOffered,
      createState({
        requests: [withOffered],
        workers: [
          worker("person-8"),
          worker("person-9"),
          worker("person-10"),
          worker("person-11"),
        ],
      }),
      context,
    );
    const active = requestIn(second, "oppdrag-2")?.shortlist.filter(
      (item) => item.state === "active",
    );
    expect(active).toHaveLength(2);
  });

  it("never lists drafts, incomplete, busy, excluded or already listed workers", () => {
    const busy = request("oppdrag-9", {
      status: "in-progress",
      agreement: {
        workerId: ids.omar,
        ownerAgreedAt: "2026-11-10T09:00:00+01:00",
        workerAgreedAt: "2026-11-11T09:00:00+01:00",
      },
    });
    const req = request("oppdrag-1", {
      excludedWorkerIds: [
        {
          workerId: ids.henrik,
          reason: "declined",
          at: "2026-11-05T09:00:00+01:00",
        },
      ],
      shortlist: [entry(ids.lena, { state: "active" })],
    });
    const state = createState({
      requests: [req, busy],
      workers: [
        worker(ids.mats, { isDraft: true }),
        worker(ids.amina, { skillIds: [] }),
        worker(ids.omar),
        worker(ids.henrik),
        worker(ids.lena),
        worker(ids.thea),
      ],
    });
    const next = fillShortlist(req, state, context);
    const added = requestIn(next, "oppdrag-1")?.shortlist.map(
      (item) => item.workerId,
    );
    expect(added).toEqual([ids.lena, ids.thea]);
  });

  it("never lists a removed worker who is excluded but may relist one who is not", () => {
    const req = request("oppdrag-1", {
      shortlist: [
        entry(ids.mats, {
          state: "removed",
          removedReason: "accepted-elsewhere",
        }),
      ],
    });
    const state = createState({
      requests: [req],
      workers: [worker(ids.mats)],
    });
    const next = fillShortlist(req, state, context);
    const mats = requestIn(next, "oppdrag-1")?.shortlist.filter(
      (item) => item.workerId === ids.mats,
    );
    expect(mats).toHaveLength(2);
    expect(mats?.[1]?.state).toBe("active");
    expect(mats?.[1]?.rank).toBe(2);
  });

  it("sets lastShortlistedAt on added workers only", () => {
    const req = request("oppdrag-1");
    const state = createState({
      requests: [req],
      workers: [worker(ids.mats), worker(ids.amina, { skillIds: [] })],
    });
    const next = fillShortlist(req, state, context);
    const profiles = next.marketplace.workerProfiles;
    expect(
      profiles.find((p) => p.personId === ids.mats)?.lastShortlistedAt,
    ).toBe(context.now);
    expect(
      profiles.find((p) => p.personId === ids.amina)?.lastShortlistedAt,
    ).toBeUndefined();
  });

  it("creates a conversation with the owner unless one exists", () => {
    const req = request("oppdrag-1");
    const state = createState({
      requests: [req],
      workers: [worker(ids.mats), worker(ids.amina)],
      conversations: [conversation("samtale-1", "oppdrag-1", ids.mats)],
    });
    const next = fillShortlist(req, state, createContext("system"));
    const conversations = next.marketplace.conversations;
    expect(conversations).toHaveLength(2);
    expect(conversations[0]?.id).toBe("samtale-1");
    expect(conversations[1]).toMatchObject({
      requestId: "oppdrag-1",
      ownerId: ids.owner1,
      workerId: ids.amina,
      messages: [],
    });
  });

  it("turns an open request with an active entry into shortlisted", () => {
    const req = request("oppdrag-1");
    const state = createState({ requests: [req], workers: [worker(ids.mats)] });
    const next = fillShortlist(req, state, context);
    expect(requestIn(next, "oppdrag-1")?.status).toBe("shortlisted");
    const kinds = requestIn(next, "oppdrag-1")?.log.map((event) => event.kind);
    expect(kinds).toEqual(["shortlisted", "status-changed"]);
  });

  it("keeps an open request open when it has only removed entries and no candidate", () => {
    const req = request("oppdrag-1", {
      shortlist: [
        entry(ids.mats, { state: "removed", removedReason: "declined" }),
      ],
      excludedWorkerIds: [
        {
          workerId: ids.mats,
          reason: "declined",
          at: "2026-11-05T09:00:00+01:00",
        },
      ],
    });
    const state = createState({ requests: [req], workers: [worker(ids.mats)] });
    const next = fillShortlist(req, state, context);
    expect(requestIn(next, "oppdrag-1")?.status).toBe("open");
    expect(requestIn(next, "oppdrag-1")?.log).toEqual([]);
  });

  it("turns a shortlisted request with no active entry into open", () => {
    const req = request("oppdrag-1", {
      status: "shortlisted",
      shortlist: [
        entry(ids.mats, { state: "removed", removedReason: "declined" }),
      ],
      excludedWorkerIds: [
        {
          workerId: ids.mats,
          reason: "declined",
          at: "2026-11-05T09:00:00+01:00",
        },
      ],
    });
    const state = createState({ requests: [req], workers: [worker(ids.mats)] });
    const next = fillShortlist(req, state, context);
    const result = requestIn(next, "oppdrag-1");
    expect(result?.status).toBe("open");
    expect(result?.log.map((event) => event.kind)).toEqual(["status-changed"]);
    expect(result?.log[0]).toMatchObject({
      fromStatus: "shortlisted",
      toStatus: "open",
    });
  });

  it("keeps the offered status while filling", () => {
    const req = request("oppdrag-1", {
      status: "offered",
      offeredWorkerId: ids.mats,
      shortlist: [entry(ids.mats, { state: "offered" })],
    });
    const state = createState({
      requests: [req],
      workers: [worker(ids.mats), worker(ids.amina)],
    });
    const next = fillShortlist(req, state, context);
    const result = requestIn(next, "oppdrag-1");
    expect(result?.status).toBe("offered");
    expect(result?.shortlist).toHaveLength(2);
  });

  it("does nothing for any other status", () => {
    for (const status of [
      "agreed",
      "in-progress",
      "completed",
      "cancelled",
      "under-review",
    ] as const) {
      const req = request("oppdrag-1", { status });
      const state = createState({
        requests: [req],
        workers: [worker(ids.mats)],
      });
      expect(fillShortlist(req, state, context)).toEqual(state);
    }
  });

  it("logs and announces with the system actor to the owner and the workers added", () => {
    const req = request("oppdrag-1");
    const state = createState({
      requests: [req],
      workers: [worker(ids.mats), worker(ids.amina)],
    });
    const next = fillShortlist(req, state, context);
    const log = requestIn(next, "oppdrag-1")?.log ?? [];
    expect(log.every((event) => event.actor === "system")).toBe(true);
    expect(log[0]?.text).toContain("ble lagt til på kortlisten");
    const activity = next.frame.activity;
    expect(activity).toHaveLength(1);
    expect(activity[0]?.actor).toBe("system");
    expect(activity[0]?.audience.personIds).toEqual([
      ids.owner1,
      ids.mats,
      ids.amina,
    ]);
    expect(activity[0]?.target.route).toBe("/oppdrag/oppdrag-1");
  });

  it("does not change the input state", () => {
    const req = request("oppdrag-1");
    const state = deepFreeze(
      createState({ requests: [req], workers: [worker(ids.mats)] }),
    );
    expect(() => fillShortlist(req, state, context)).not.toThrow();
  });
});

describe("fillRequests", () => {
  it("fills requests oldest first so the result is always the same", () => {
    const newer = request("oppdrag-1", {
      createdAt: "2026-11-05T09:00:00+01:00",
    });
    const older = request("oppdrag-2", {
      createdAt: "2026-11-02T09:00:00+01:00",
    });
    const state = createState({
      requests: [newer, older],
      workers: [
        worker("person-8", { lastShortlistedAt: "2026-11-01T09:00:00+01:00" }),
      ],
    });
    const next = fillRequests(["oppdrag-1", "oppdrag-2"], state, context);
    const oldestLog = requestIn(next, "oppdrag-2")?.log ?? [];
    const newestLog = requestIn(next, "oppdrag-1")?.log ?? [];
    expect(oldestLog.length).toBeGreaterThan(0);
    expect(newestLog.length).toBeGreaterThan(0);
    const order = next.marketplace.conversations.map((item) => item.requestId);
    expect(order).toEqual(["oppdrag-2", "oppdrag-1"]);
  });

  it("ignores IDs that do not exist", () => {
    const state = createState({});
    expect(fillRequests(["finnes-ikke"], state, context)).toEqual(state);
  });
});
