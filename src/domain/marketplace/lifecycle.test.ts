import { describe, expect, it } from "vitest";
import { peopleWorkingAt } from "../frame/people";
import type { CommandHandler, CommandResult, DemoState } from "../frame/types";
import {
  cancelRequest,
  completeRequest,
  recordStart,
  withdraw,
} from "./lifecycle";
import { fillShortlist, isBusy } from "./matching";
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
import type { RequestStatus, TaskRequest } from "./types";
import { canSendMessage } from "./visibility";

const now = "2026-11-16T10:00:00+01:00";

function call(
  handler: CommandHandler,
  state: DemoState,
  actorId: string,
  command: Record<string, unknown>,
): CommandResult {
  return handler(state, { type: "x", ...command }, createContext(actorId, now));
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

function start(
  state: DemoState,
  actorId: string,
  extra: Record<string, unknown> = {},
  requestId = "oppdrag-1",
): CommandResult {
  return call(recordStart, state, actorId, {
    requestId,
    actualStartDate: "2026-11-17",
    ...extra,
  });
}

function leave(
  state: DemoState,
  actorId: string,
  requestId = "oppdrag-1",
): CommandResult {
  return call(withdraw, state, actorId, { requestId });
}

function complete(
  state: DemoState,
  actorId: string,
  outcome: unknown = "as-planned",
  requestId = "oppdrag-1",
): CommandResult {
  return call(completeRequest, state, actorId, { requestId, outcome });
}

function cancel(
  state: DemoState,
  actorId: string,
  reason: unknown = "Vi trenger ikke hjelp lenger.",
  requestId = "oppdrag-1",
): CommandResult {
  return call(cancelRequest, state, actorId, { requestId, reason });
}

const agreement = {
  workerId: ids.mats,
  ownerAgreedAt: "2026-11-10T09:00:00+01:00",
  workerAgreedAt: "2026-11-11T09:00:00+01:00",
};

function agreedRequest(overrides: Partial<TaskRequest> = {}): TaskRequest {
  return request("oppdrag-1", {
    status: "agreed",
    agreement,
    shortlist: [
      entry(ids.mats, {
        rank: 1,
        state: "offered",
        offeredAt: "2026-11-10T09:00:00+01:00",
      }),
      entry(ids.amina, { rank: 2 }),
    ],
    ...overrides,
  });
}

function waitingRequest(): TaskRequest {
  return request("oppdrag-2", {
    businessId: "bedrift-2",
    createdAt: "2026-11-02T09:00:00+01:00",
  });
}

function stateWith(
  requests: TaskRequest[],
  workerIds: string[] = [ids.mats, ids.amina],
): DemoState {
  return createState({
    requests,
    workers: workerIds.map((id) => worker(id)),
    conversations: [
      conversation("samtale-1", "oppdrag-1", ids.mats),
      conversation("samtale-2", "oppdrag-1", ids.amina),
    ],
  });
}

function newActivity(state: DemoState, text: string) {
  return state.frame.activity.filter((item) => item.text.includes(text));
}

function sorted(list: string[]): string[] {
  return [...list].sort();
}

describe("recordStart", () => {
  it("records the start date and moves the request to in-progress", () => {
    const state = okState(
      start(deepFreeze(stateWith([agreedRequest()])), ids.owner1),
    );
    const updated = requestIn(state, "oppdrag-1");
    expect(updated?.status).toBe("in-progress");
    expect(updated?.actualStartDate).toBe("2026-11-17");
    expect(updated?.agreement?.workerId).toBe(ids.mats);
  });

  it("logs started and status-changed by the owner", () => {
    const log = requestIn(
      okState(start(stateWith([agreedRequest()]), ids.owner1)),
      "oppdrag-1",
    )?.log;
    expect(log?.map((event) => event.kind)).toEqual([
      "started",
      "status-changed",
    ]);
    expect(log?.[0]).toMatchObject({
      actor: ids.owner1,
      workerId: ids.mats,
      at: now,
    });
    expect(log?.[0]?.text).toContain("Kari Nordmann");
    expect(log?.[1]).toMatchObject({
      fromStatus: "agreed",
      toStatus: "in-progress",
    });
  });

  it("announces to the owner and the agreed worker only", () => {
    const state = okState(start(stateWith([agreedRequest()]), ids.owner1));
    const entries = newActivity(state, "i gang");
    expect(entries).toHaveLength(1);
    expect(sorted(entries[0]?.audience.personIds ?? [])).toEqual(
      sorted([ids.owner1, ids.mats]),
    );
    expect(entries[0]?.target.route).toBe("/oppdrag/oppdrag-1");
    expect(entries[0]?.featureId).toBe("marketplace");
  });

  it("is allowed for the owner only", () => {
    for (const actor of [
      ids.mats,
      ids.amina,
      ids.owner2,
      ids.employee1,
      ids.admin,
    ]) {
      expect(errorCode(start(stateWith([agreedRequest()]), actor))).toBe(
        "not-allowed",
      );
    }
  });

  it("needs status agreed", () => {
    for (const status of [
      "open",
      "shortlisted",
      "offered",
      "in-progress",
      "completed",
      "cancelled",
      "under-review",
    ] as RequestStatus[]) {
      expect(
        errorCode(
          start(
            stateWith([agreedRequest({ status, agreement: undefined })]),
            ids.owner1,
          ),
        ),
      ).toBe("invalid-status");
    }
  });

  it("needs a valid start date", () => {
    for (const actualStartDate of [undefined, "", "17.11.2026", "2026-13-40"]) {
      const result = start(stateWith([agreedRequest()]), ids.owner1, {
        actualStartDate,
      });
      expect(errorCode(result)).toBe("validation");
      if (!result.ok) {
        expect(result.error.fieldErrors?.actualStartDate).toBeTruthy();
      }
    }
  });

  it("returns not-found for an unknown request", () => {
    expect(
      errorCode(start(stateWith([agreedRequest()]), ids.owner1, {}, "nope")),
    ).toBe("not-found");
  });
});

describe("withdraw", () => {
  it("excludes the worker, removes the entry and clears the agreement", () => {
    const state = okState(
      leave(deepFreeze(stateWith([agreedRequest()])), ids.mats),
    );
    const updated = requestIn(state, "oppdrag-1");
    expect(updated?.agreement).toBeUndefined();
    expect(updated?.excludedWorkerIds).toEqual([
      { workerId: ids.mats, reason: "withdrew", at: now },
    ]);
    const entryOf = updated?.shortlist.find(
      (item) => item.workerId === ids.mats,
    );
    expect(entryOf).toMatchObject({
      state: "removed",
      removedReason: "withdrew",
    });
    expect(
      isBusy(
        worker(ids.mats),
        createState({ requests: [updated as TaskRequest] }),
      ),
    ).toBe(false);
  });

  it("returns to shortlisted when other active entries remain", () => {
    const state = okState(leave(stateWith([agreedRequest()]), ids.mats));
    const updated = requestIn(state, "oppdrag-1");
    expect(updated?.status).toBe("shortlisted");
    expect(
      updated?.shortlist
        .filter((item) => item.state === "active")
        .map((item) => item.workerId),
    ).toEqual([ids.amina]);
  });

  it("logs withdrew and status-changed, then the refilled status change", () => {
    const log = requestIn(
      okState(leave(stateWith([agreedRequest()]), ids.mats)),
      "oppdrag-1",
    )?.log;
    expect(log?.map((event) => event.kind)).toEqual([
      "withdrew",
      "status-changed",
      "status-changed",
    ]);
    expect(log?.[0]).toMatchObject({ actor: ids.mats, workerId: ids.mats });
    expect(log?.[0]?.text).toContain("Mats Johansen");
    expect(log?.[1]).toMatchObject({
      actor: ids.mats,
      fromStatus: "agreed",
      toStatus: "open",
    });
    expect(log?.[2]).toMatchObject({
      actor: "system",
      fromStatus: "open",
      toStatus: "shortlisted",
    });
  });

  it("goes to open when no active entry remains and nobody else is eligible", () => {
    const only = agreedRequest({
      shortlist: [
        entry(ids.mats, {
          rank: 1,
          state: "offered",
          offeredAt: "2026-11-10T09:00:00+01:00",
        }),
      ],
    });
    const state = okState(leave(stateWith([only], [ids.mats]), ids.mats));
    const updated = requestIn(state, "oppdrag-1");
    expect(updated?.status).toBe("open");
    expect(updated?.log.map((event) => event.kind)).toEqual([
      "withdrew",
      "status-changed",
    ]);
  });

  it("fills the request with another eligible worker", () => {
    const state = okState(
      leave(
        stateWith([agreedRequest()], [ids.mats, ids.amina, ids.lena]),
        ids.mats,
      ),
    );
    const updated = requestIn(state, "oppdrag-1");
    expect(
      updated?.shortlist
        .filter((item) => item.state === "active")
        .map((item) => item.workerId),
    ).toEqual([ids.amina, ids.lena]);
  });

  it("fills other requests the freed worker might match", () => {
    const state = okState(
      leave(stateWith([agreedRequest(), waitingRequest()]), ids.mats),
    );
    const other = requestIn(state, "oppdrag-2");
    expect(other?.status).toBe("shortlisted");
    expect(
      other?.shortlist.some(
        (item) => item.workerId === ids.mats && item.state === "active",
      ),
    ).toBe(true);
  });

  it("never lists the worker for this request again", () => {
    const state = okState(
      leave(stateWith([agreedRequest()], [ids.mats, ids.amina]), ids.mats),
    );
    const updated = requestIn(state, "oppdrag-1") as TaskRequest;
    const refilled = requestIn(
      fillShortlist(updated, state, createContext("system", now, "etter")),
      "oppdrag-1",
    );
    expect(
      refilled?.shortlist.filter(
        (item) => item.workerId === ids.mats && item.state !== "removed",
      ),
    ).toEqual([]);
  });

  it("stops the worker from sending messages on this request", () => {
    const before = stateWith([agreedRequest()]);
    const talk = before.marketplace.conversations[0];
    const person = before.frame.people.find((item) => item.id === ids.mats);
    if (talk === undefined || person === undefined) {
      throw new Error("Mangler testdata");
    }
    expect(
      canSendMessage(
        person,
        talk,
        requestIn(before, "oppdrag-1") as TaskRequest,
      ),
    ).toBe(true);
    const after = okState(leave(before, ids.mats));
    expect(
      canSendMessage(
        person,
        talk,
        requestIn(after, "oppdrag-1") as TaskRequest,
      ),
    ).toBe(false);
  });

  it("announces to the owner and the worker", () => {
    const state = okState(leave(stateWith([agreedRequest()]), ids.mats));
    const entries = newActivity(state, "trukket seg");
    expect(entries).toHaveLength(1);
    expect(sorted(entries[0]?.audience.personIds ?? [])).toEqual(
      sorted([ids.owner1, ids.mats]),
    );
  });

  it("is allowed for the agreed worker only", () => {
    for (const actor of [
      ids.amina,
      ids.owner1,
      ids.owner2,
      ids.admin,
      ids.employee1,
    ]) {
      expect(errorCode(leave(stateWith([agreedRequest()]), actor))).toBe(
        "not-allowed",
      );
    }
  });

  it("needs status agreed", () => {
    for (const status of [
      "in-progress",
      "completed",
      "cancelled",
    ] as RequestStatus[]) {
      expect(
        errorCode(leave(stateWith([agreedRequest({ status })]), ids.mats)),
      ).toBe("invalid-status");
    }
  });

  it("returns not-found for an unknown request", () => {
    expect(
      errorCode(leave(stateWith([agreedRequest()]), ids.mats, "nope")),
    ).toBe("not-found");
  });
});

function inProgressRequest(overrides: Partial<TaskRequest> = {}): TaskRequest {
  return agreedRequest({
    status: "in-progress",
    actualStartDate: "2026-11-17",
    ...overrides,
  });
}

describe("completeRequest", () => {
  it("completes with each allowed outcome", () => {
    for (const outcome of ["as-planned", "extended", "permanent"] as const) {
      const state = okState(
        complete(
          deepFreeze(stateWith([inProgressRequest()])),
          ids.owner1,
          outcome,
        ),
      );
      const updated = requestIn(state, "oppdrag-1");
      expect(updated?.status).toBe("completed");
      expect(updated?.outcome).toBe(outcome);
      expect(updated?.agreement?.workerId).toBe(ids.mats);
    }
  });

  it("logs completed and status-changed by the owner", () => {
    const log = requestIn(
      okState(complete(stateWith([inProgressRequest()]), ids.owner1)),
      "oppdrag-1",
    )?.log;
    expect(log?.map((event) => event.kind)).toEqual([
      "completed",
      "status-changed",
    ]);
    expect(log?.[0]).toMatchObject({
      actor: ids.owner1,
      workerId: ids.mats,
      at: now,
    });
    expect(log?.[1]).toMatchObject({
      fromStatus: "in-progress",
      toStatus: "completed",
    });
  });

  it("frees the worker so matching runs for other requests", () => {
    const before = stateWith([inProgressRequest(), waitingRequest()]);
    const worker1 = before.marketplace.workerProfiles[0];
    expect(worker1 && isBusy(worker1, before)).toBe(true);
    const state = okState(complete(before, ids.owner1));
    const other = requestIn(state, "oppdrag-2");
    expect(
      other?.shortlist.some(
        (item) => item.workerId === ids.mats && item.state === "active",
      ),
    ).toBe(true);
    expect(other?.status).toBe("shortlisted");
  });

  it("puts the worker among the people working at the business with permanent", () => {
    const permanent = okState(
      complete(stateWith([inProgressRequest()]), ids.owner1, "permanent"),
    );
    const business = permanent.frame.businesses[0];
    if (business === undefined) {
      throw new Error("Mangler bedrift");
    }
    expect(
      peopleWorkingAt(business, permanent).map((person) => person.id),
    ).toContain(ids.mats);
    for (const outcome of ["as-planned", "extended"]) {
      const other = okState(
        complete(stateWith([inProgressRequest()]), ids.owner1, outcome),
      );
      expect(
        peopleWorkingAt(business, other).map((person) => person.id),
      ).not.toContain(ids.mats);
    }
  });

  it("announces to the owner and the worker", () => {
    const state = okState(
      complete(stateWith([inProgressRequest()]), ids.owner1),
    );
    const entries = newActivity(state, "fullført");
    expect(entries).toHaveLength(1);
    expect(sorted(entries[0]?.audience.personIds ?? [])).toEqual(
      sorted([ids.owner1, ids.mats]),
    );
  });

  it("is allowed for the owner only", () => {
    for (const actor of [
      ids.mats,
      ids.amina,
      ids.owner2,
      ids.employee1,
      ids.admin,
    ]) {
      expect(errorCode(complete(stateWith([inProgressRequest()]), actor))).toBe(
        "not-allowed",
      );
    }
  });

  it("needs status in-progress", () => {
    for (const status of [
      "open",
      "shortlisted",
      "offered",
      "agreed",
      "completed",
      "cancelled",
      "under-review",
    ] as RequestStatus[]) {
      expect(
        errorCode(
          complete(stateWith([inProgressRequest({ status })]), ids.owner1),
        ),
      ).toBe("invalid-status");
    }
  });

  it("needs one of the three outcomes", () => {
    for (const outcome of [null, "", "not-completed", "annet"]) {
      const result = complete(
        stateWith([inProgressRequest()]),
        ids.owner1,
        outcome,
      );
      expect(errorCode(result)).toBe("validation");
      if (!result.ok) {
        expect(result.error.fieldErrors?.outcome).toBeTruthy();
      }
    }
  });

  it("returns not-found for an unknown request", () => {
    expect(
      errorCode(
        complete(
          stateWith([inProgressRequest()]),
          ids.owner1,
          "as-planned",
          "nope",
        ),
      ),
    ).toBe("not-found");
  });
});

describe("cancelRequest", () => {
  const cancellable: RequestStatus[] = [
    "open",
    "shortlisted",
    "offered",
    "agreed",
    "in-progress",
    "under-review",
  ];

  function requestFor(status: RequestStatus): TaskRequest {
    if (status === "agreed") {
      return agreedRequest();
    }
    if (status === "in-progress") {
      return inProgressRequest();
    }
    if (status === "offered") {
      return agreedRequest({
        status: "offered",
        agreement: undefined,
        offeredWorkerId: ids.mats,
      });
    }
    if (status === "shortlisted") {
      return agreedRequest({
        status: "shortlisted",
        agreement: undefined,
        shortlist: [
          entry(ids.mats, { rank: 1 }),
          entry(ids.amina, { rank: 2 }),
        ],
      });
    }
    return agreedRequest({
      status,
      agreement: undefined,
      shortlist: [],
    });
  }

  it("cancels from every status except completed and cancelled", () => {
    for (const status of cancellable) {
      for (const actor of [ids.owner1, ids.admin]) {
        const state = okState(
          cancel(deepFreeze(stateWith([requestFor(status)])), actor),
        );
        const updated = requestIn(state, "oppdrag-1");
        expect(updated?.status).toBe("cancelled");
        expect(updated?.cancellation).toEqual({
          reason: "Vi trenger ikke hjelp lenger.",
          at: now,
          by: actor,
        });
      }
    }
  });

  it("logs cancelled and status-changed", () => {
    const log = requestIn(
      okState(cancel(stateWith([requestFor("shortlisted")]), ids.admin)),
      "oppdrag-1",
    )?.log;
    expect(log?.map((event) => event.kind)).toEqual([
      "cancelled",
      "status-changed",
    ]);
    expect(log?.[0]).toMatchObject({ actor: ids.admin, at: now });
    expect(log?.[0]?.text).toContain("Marte Vik");
    expect(log?.[1]).toMatchObject({
      fromStatus: "shortlisted",
      toStatus: "cancelled",
    });
  });

  it("sets outcome not-completed and frees the worker from agreed and in-progress", () => {
    for (const status of ["agreed", "in-progress"] as const) {
      const state = okState(
        cancel(stateWith([requestFor(status), waitingRequest()]), ids.owner1),
      );
      expect(requestIn(state, "oppdrag-1")?.outcome).toBe("not-completed");
      const other = requestIn(state, "oppdrag-2");
      expect(
        other?.shortlist.some(
          (item) => item.workerId === ids.mats && item.state === "active",
        ),
      ).toBe(true);
    }
  });

  it("sets no outcome from the other statuses", () => {
    for (const status of [
      "open",
      "shortlisted",
      "offered",
      "under-review",
    ] as const) {
      const state = okState(
        cancel(stateWith([requestFor(status)]), ids.owner1),
      );
      expect(requestIn(state, "oppdrag-1")?.outcome).toBeUndefined();
    }
  });

  it("clears the offered worker and leaves the shortlist entries as they are", () => {
    const before = stateWith([requestFor("offered")]);
    const after = requestIn(okState(cancel(before, ids.owner1)), "oppdrag-1");
    expect(after?.offeredWorkerId).toBeUndefined();
    expect(after?.shortlist).toEqual(requestIn(before, "oppdrag-1")?.shortlist);
    expect(after?.excludedWorkerIds).toEqual([]);
  });

  it("leaves the shortlist of a shortlisted request as it is", () => {
    const before = stateWith([requestFor("shortlisted")]);
    const after = okState(cancel(before, ids.owner1));
    expect(requestIn(after, "oppdrag-1")?.shortlist).toEqual(
      requestIn(before, "oppdrag-1")?.shortlist,
    );
  });

  it("announces to the owner, every active worker and the agreed worker", () => {
    const shortlisted = okState(
      cancel(stateWith([requestFor("shortlisted")]), ids.admin),
    );
    const first = newActivity(shortlisted, "avlyst");
    expect(first).toHaveLength(1);
    expect(sorted(first[0]?.audience.personIds ?? [])).toEqual(
      sorted([ids.owner1, ids.mats, ids.amina]),
    );

    const agreed = okState(
      cancel(stateWith([requestFor("agreed")]), ids.owner1),
    );
    const second = newActivity(agreed, "avlyst");
    expect(second).toHaveLength(1);
    expect(sorted(second[0]?.audience.personIds ?? [])).toEqual(
      sorted([ids.owner1, ids.mats, ids.amina]),
    );

    const inProgress = okState(
      cancel(stateWith([requestFor("in-progress")]), ids.owner1),
    );
    expect(
      sorted(newActivity(inProgress, "avlyst")[0]?.audience.personIds ?? []),
    ).toEqual(sorted([ids.owner1, ids.mats, ids.amina]));

    const open = okState(cancel(stateWith([requestFor("open")]), ids.owner1));
    expect(newActivity(open, "avlyst")[0]?.audience.personIds).toEqual([
      ids.owner1,
    ]);
  });

  it("includes the worker with an outstanding offer in the announcement", () => {
    const state = okState(
      cancel(stateWith([requestFor("offered")]), ids.owner1),
    );
    expect(
      sorted(newActivity(state, "avlyst")[0]?.audience.personIds ?? []),
    ).toEqual(sorted([ids.owner1, ids.mats, ids.amina]));
  });

  it("is allowed for the owner and an admin only", () => {
    for (const actor of [ids.mats, ids.amina, ids.owner2, ids.employee1]) {
      expect(
        errorCode(cancel(stateWith([requestFor("shortlisted")]), actor)),
      ).toBe("not-allowed");
    }
  });

  it("is not possible after completed or cancelled", () => {
    for (const status of ["completed", "cancelled"] as RequestStatus[]) {
      expect(
        errorCode(
          cancel(stateWith([inProgressRequest({ status })]), ids.owner1),
        ),
      ).toBe("invalid-status");
    }
  });

  it("needs a reason of 1 to 1000 characters", () => {
    for (const reason of [null, "", "   ", "a".repeat(1001)]) {
      const result = cancel(
        stateWith([requestFor("shortlisted")]),
        ids.owner1,
        reason,
      );
      expect(errorCode(result)).toBe("validation");
      if (!result.ok) {
        expect(result.error.fieldErrors?.reason).toBeTruthy();
      }
    }
    expect(
      cancel(
        stateWith([requestFor("shortlisted")]),
        ids.owner1,
        "a".repeat(1000),
      ).ok,
    ).toBe(true);
  });

  it("returns not-found for an unknown request", () => {
    expect(
      errorCode(
        cancel(
          stateWith([requestFor("shortlisted")]),
          ids.owner1,
          "Grunn",
          "nope",
        ),
      ),
    ).toBe("not-found");
  });
});
