import { describe, expect, it } from "vitest";
import type { CommandResult, DemoState } from "../frame/types";
import { acceptOffer, inviteToInterview, makeOffer } from "./offers";
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

function shortlistedState(): DemoState {
  return createState({
    requests: [
      request("oppdrag-1", {
        status: "shortlisted",
        shortlist: [
          entry(ids.mats, { rank: 1 }),
          entry(ids.amina, { rank: 2 }),
          entry(ids.lena, { rank: 3 }),
        ],
      }),
    ],
    workers: [worker(ids.mats), worker(ids.amina), worker(ids.lena)],
  });
}

function invite(
  state: DemoState,
  workerId: string,
  actorId: string = ids.owner1,
  requestId = "oppdrag-1",
): CommandResult {
  return inviteToInterview(
    state,
    { type: "inviteToInterview", requestId, workerId },
    createContext(actorId, "2026-11-16T10:00:00+01:00", "ny"),
  );
}

function offer(
  state: DemoState,
  workerId: string,
  actorId: string = ids.owner1,
  requestId = "oppdrag-1",
): CommandResult {
  return makeOffer(
    state,
    { type: "makeOffer", requestId, workerId },
    createContext(actorId, "2026-11-16T10:00:00+01:00", "ny"),
  );
}

function accept(
  state: DemoState,
  actorId: string,
  requestId = "oppdrag-1",
): CommandResult {
  return acceptOffer(
    state,
    { type: "acceptOffer", requestId },
    createContext(actorId, "2026-11-16T12:00:00+01:00", "ny"),
  );
}

function errorCode(result: CommandResult): string {
  if (result.ok) {
    throw new Error("Forventet en feil");
  }
  return result.error.code;
}

function okState(result: CommandResult): DemoState {
  if (!result.ok) {
    throw new Error(`Forventet suksess: ${result.error.message}`);
  }
  return result.state;
}

describe("inviteToInterview", () => {
  it("sets interviewInvitedAt and leaves the status alone", () => {
    const state = okState(invite(deepFreeze(shortlistedState()), ids.mats));
    const updated = requestIn(state, "oppdrag-1");
    expect(updated?.status).toBe("shortlisted");
    const invited = updated?.shortlist.find(
      (item) => item.workerId === ids.mats,
    );
    expect(invited?.interviewInvitedAt).toBe("2026-11-16T10:00:00+01:00");
    expect(
      updated?.shortlist.find((item) => item.workerId === ids.amina)
        ?.interviewInvitedAt,
    ).toBeUndefined();
  });

  it("logs interview-invited and announces to the worker and the owner", () => {
    const state = okState(invite(shortlistedState(), ids.mats));
    const log = requestIn(state, "oppdrag-1")?.log ?? [];
    expect(log.map((event) => event.kind)).toEqual(["interview-invited"]);
    expect(log[0]).toMatchObject({ actor: ids.owner1, workerId: ids.mats });
    const audiences = state.frame.activity.map(
      (item) => item.audience.personIds,
    );
    expect(audiences).toContainEqual([ids.mats]);
    expect(audiences).toContainEqual([ids.owner1]);
    expect(
      state.frame.activity.some((item) =>
        item.text.includes("Du er invitert til intervju"),
      ),
    ).toBe(true);
  });

  it("works while an offer is outstanding to someone else", () => {
    const base = okState(offer(shortlistedState(), ids.mats));
    const result = invite(base, ids.amina);
    expect(result.ok).toBe(true);
    expect(requestIn(okState(result), "oppdrag-1")?.status).toBe("offered");
  });

  it("is allowed for the owner only", () => {
    for (const actor of [ids.owner2, ids.employee1, ids.admin, ids.mats]) {
      expect(errorCode(invite(shortlistedState(), ids.mats, actor))).toBe(
        "not-allowed",
      );
    }
  });

  it("needs status shortlisted or offered and an active entry", () => {
    for (const status of [
      "open",
      "agreed",
      "in-progress",
      "under-review",
    ] as const) {
      const state = createState({
        requests: [
          request("oppdrag-1", { status, shortlist: [entry(ids.mats)] }),
        ],
      });
      expect(errorCode(invite(state, ids.mats))).toBe("invalid-status");
    }
    expect(errorCode(invite(shortlistedState(), ids.omar))).toBe(
      "invalid-status",
    );
    const removed = createState({
      requests: [
        request("oppdrag-1", {
          status: "shortlisted",
          shortlist: [
            entry(ids.mats, { state: "removed", removedReason: "declined" }),
            entry(ids.amina),
          ],
        }),
      ],
    });
    expect(errorCode(invite(removed, ids.mats))).toBe("invalid-status");
  });

  it("does not invite the same worker twice", () => {
    const once = okState(invite(shortlistedState(), ids.mats));
    expect(errorCode(invite(once, ids.mats))).toBe("invalid-status");
  });

  it("returns not-found for an unknown request", () => {
    expect(
      errorCode(invite(shortlistedState(), ids.mats, ids.owner1, "oppdrag-99")),
    ).toBe("not-found");
  });
});

describe("makeOffer", () => {
  it("offers to one worker and moves the status to offered", () => {
    const state = okState(offer(deepFreeze(shortlistedState()), ids.mats));
    const updated = requestIn(state, "oppdrag-1");
    expect(updated?.status).toBe("offered");
    expect(updated?.offeredWorkerId).toBe(ids.mats);
    const offered = updated?.shortlist.find(
      (item) => item.workerId === ids.mats,
    );
    expect(offered?.state).toBe("offered");
    expect(offered?.offeredAt).toBe("2026-11-16T10:00:00+01:00");
    expect(
      updated?.shortlist
        .filter((item) => item.workerId !== ids.mats)
        .map((item) => item.state),
    ).toEqual(["active", "active"]);
  });

  it("logs offered and status-changed and announces to the worker and the owner", () => {
    const state = okState(offer(shortlistedState(), ids.mats));
    const log = requestIn(state, "oppdrag-1")?.log ?? [];
    expect(log.map((event) => event.kind)).toEqual([
      "offered",
      "status-changed",
    ]);
    expect(log[0]).toMatchObject({ actor: ids.owner1, workerId: ids.mats });
    expect(log[1]).toMatchObject({
      fromStatus: "shortlisted",
      toStatus: "offered",
    });
    const audiences = state.frame.activity.map(
      (item) => item.audience.personIds,
    );
    expect(audiences).toContainEqual([ids.mats]);
    expect(audiences).toContainEqual([ids.owner1]);
    expect(
      state.frame.activity.some((item) =>
        item.text.includes("Du har fått et tilbud"),
      ),
    ).toBe(true);
  });

  it("is allowed for the owner only", () => {
    for (const actor of [ids.owner2, ids.employee1, ids.admin, ids.mats]) {
      expect(errorCode(offer(shortlistedState(), ids.mats, actor))).toBe(
        "not-allowed",
      );
    }
  });

  it("needs status shortlisted and an active entry", () => {
    const offered = okState(offer(shortlistedState(), ids.mats));
    expect(errorCode(offer(offered, ids.amina))).toBe("invalid-status");
    expect(errorCode(offer(shortlistedState(), ids.omar))).toBe(
      "invalid-status",
    );
    const open = createState({ requests: [request("oppdrag-1")] });
    expect(errorCode(offer(open, ids.mats))).toBe("invalid-status");
  });

  it("returns not-found for an unknown request", () => {
    expect(
      errorCode(offer(shortlistedState(), ids.mats, ids.owner1, "oppdrag-99")),
    ).toBe("not-found");
  });
});

function acceptanceState(): DemoState {
  return createState({
    requests: [
      request("oppdrag-1", {
        createdAt: "2026-11-01T09:00:00+01:00",
        status: "offered",
        offeredWorkerId: ids.mats,
        shortlist: [
          entry(ids.mats, {
            rank: 1,
            state: "offered",
            offeredAt: "2026-11-14T10:00:00+01:00",
          }),
          entry(ids.amina, { rank: 2 }),
        ],
      }),
      request("oppdrag-2", {
        createdAt: "2026-11-02T09:00:00+01:00",
        businessId: "bedrift-2",
        requiredSkillIds: ["ferdighet-3"],
        status: "shortlisted",
        shortlist: [
          entry(ids.mats, {
            rank: 1,
            matchedSkillIds: ["ferdighet-3"],
            missingSkillIds: [],
          }),
          entry(ids.henrik, {
            rank: 2,
            matchedSkillIds: ["ferdighet-3"],
            missingSkillIds: [],
          }),
        ],
      }),
      request("oppdrag-3", {
        createdAt: "2026-11-03T09:00:00+01:00",
        requiredSkillIds: ["ferdighet-3"],
        status: "offered",
        offeredWorkerId: ids.mats,
        shortlist: [
          entry(ids.mats, {
            rank: 1,
            state: "offered",
            offeredAt: "2026-11-15T10:00:00+01:00",
          }),
          entry(ids.henrik, { rank: 2 }),
        ],
      }),
      request("oppdrag-4", {
        createdAt: "2026-11-04T09:00:00+01:00",
        businessId: "bedrift-2",
        requiredSkillIds: ["ferdighet-6"],
        status: "offered",
        offeredWorkerId: ids.mats,
        shortlist: [
          entry(ids.mats, {
            rank: 1,
            state: "offered",
            offeredAt: "2026-11-15T11:00:00+01:00",
          }),
        ],
      }),
    ],
    workers: [
      worker(ids.mats, {
        skillIds: ["ferdighet-1", "ferdighet-2", "ferdighet-3"],
      }),
      worker(ids.amina),
      worker(ids.lena),
      worker(ids.henrik, { skillIds: ["ferdighet-3"] }),
      worker(ids.omar, { skillIds: ["ferdighet-3"] }),
    ],
  });
}

describe("acceptOffer", () => {
  it("agrees the request and records both parties' agreement", () => {
    const state = okState(accept(deepFreeze(acceptanceState()), ids.mats));
    const updated = requestIn(state, "oppdrag-1");
    expect(updated?.status).toBe("agreed");
    expect(updated?.agreement).toEqual({
      workerId: ids.mats,
      ownerAgreedAt: "2026-11-14T10:00:00+01:00",
      workerAgreedAt: "2026-11-16T12:00:00+01:00",
    });
    expect(updated?.offeredWorkerId).toBeUndefined();
    expect(
      updated?.shortlist.find((item) => item.workerId === ids.mats)?.state,
    ).toBe("offered");
    expect(
      updated?.shortlist.find((item) => item.workerId === ids.amina)?.state,
    ).toBe("active");
  });

  it("logs offer-accepted and status-changed and announces to owner and worker", () => {
    const state = okState(accept(acceptanceState(), ids.mats));
    const log = requestIn(state, "oppdrag-1")?.log ?? [];
    expect(log.map((event) => event.kind)).toEqual([
      "offer-accepted",
      "status-changed",
    ]);
    expect(log[0]).toMatchObject({ actor: ids.mats, workerId: ids.mats });
    expect(log[1]).toMatchObject({ fromStatus: "offered", toStatus: "agreed" });
    const forThis = state.frame.activity.filter(
      (item) => item.target.route === "/oppdrag/oppdrag-1",
    );
    expect(
      forThis.some((item) => item.audience.personIds.includes(ids.owner1)),
    ).toBe(true);
    expect(
      forThis.some((item) => item.audience.personIds.includes(ids.mats)),
    ).toBe(true);
  });

  it("removes the worker's active entries elsewhere without excluding them, and fills again", () => {
    const state = okState(accept(acceptanceState(), ids.mats));
    const other = requestIn(state, "oppdrag-2");
    expect(
      other?.shortlist.find((item) => item.workerId === ids.mats),
    ).toMatchObject({ state: "removed", removedReason: "accepted-elsewhere" });
    expect(other?.excludedWorkerIds).toEqual([]);
    expect(
      other?.shortlist
        .filter((item) => item.state === "active")
        .map((item) => item.workerId),
    ).toEqual([ids.henrik, ids.omar]);
    expect(other?.status).toBe("shortlisted");
    const kinds = other?.log.map((event) => event.kind) ?? [];
    expect(kinds[0]).toBe("shortlist-entry-removed");
    expect(other?.log[0]?.actor).toBe("system");
  });

  it("counts the worker's other offers as declined and fills those requests again", () => {
    const state = okState(accept(acceptanceState(), ids.mats));
    const other = requestIn(state, "oppdrag-3");
    expect(other?.excludedWorkerIds).toEqual([
      {
        workerId: ids.mats,
        reason: "declined",
        at: "2026-11-16T12:00:00+01:00",
      },
    ]);
    expect(
      other?.shortlist.find((item) => item.workerId === ids.mats),
    ).toMatchObject({ state: "removed", removedReason: "declined" });
    expect(other?.offeredWorkerId).toBeUndefined();
    expect(other?.status).toBe("shortlisted");
    expect(
      other?.shortlist
        .filter((item) => item.state === "active")
        .map((item) => item.workerId),
    ).toEqual([ids.henrik, ids.omar]);
    const kinds = other?.log.map((event) => event.kind) ?? [];
    expect(kinds.slice(0, 2)).toEqual(["offer-declined", "status-changed"]);
    expect(other?.log[0]?.actor).toBe("system");
  });

  it("returns the other request to open when no active entry and no candidate remain", () => {
    const state = okState(accept(acceptanceState(), ids.mats));
    const other = requestIn(state, "oppdrag-4");
    expect(other?.status).toBe("open");
    expect(other?.excludedWorkerIds[0]).toMatchObject({
      workerId: ids.mats,
      reason: "declined",
    });
  });

  it("makes the worker busy so they are not listed again", () => {
    const state = okState(accept(acceptanceState(), ids.mats));
    const lists = state.marketplace.requests
      .filter((item) => item.id !== "oppdrag-1")
      .flatMap((item) => item.shortlist)
      .filter((item) => item.workerId === ids.mats && item.state !== "removed");
    expect(lists).toEqual([]);
  });

  it("is allowed for the offered worker only", () => {
    expect(errorCode(accept(acceptanceState(), ids.amina))).toBe("not-allowed");
    expect(errorCode(accept(acceptanceState(), ids.owner1))).toBe(
      "not-allowed",
    );
    expect(errorCode(accept(acceptanceState(), ids.admin))).toBe("not-allowed");
  });

  it("needs the request to be offered", () => {
    expect(errorCode(accept(shortlistedState(), ids.mats))).toBe(
      "invalid-status",
    );
    expect(errorCode(accept(shortlistedState(), ids.omar))).toBe("not-allowed");
    const agreed = okState(accept(acceptanceState(), ids.mats));
    expect(errorCode(accept(agreed, ids.mats))).toBe("invalid-status");
  });

  it("returns not-found for an unknown request", () => {
    expect(errorCode(accept(acceptanceState(), ids.mats, "oppdrag-99"))).toBe(
      "not-found",
    );
  });
});
