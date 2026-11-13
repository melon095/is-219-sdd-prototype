import { describe, expect, it } from "vitest";
import type { CommandResult, DemoState } from "../frame/types";
import { rejectShortlist, returnToOpen } from "./requests";
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

const shortlisted = request("oppdrag-1", {
  status: "shortlisted",
  shortlist: [
    entry(ids.mats, { rank: 1 }),
    entry(ids.amina, { rank: 2 }),
    entry(ids.lena, { rank: 3, state: "removed", removedReason: "declined" }),
  ],
  excludedWorkerIds: [
    { workerId: ids.lena, reason: "declined", at: "2026-11-05T09:00:00+01:00" },
  ],
});

const baseState = (): DemoState =>
  createState({
    requests: [shortlisted],
    workers: [
      worker(ids.mats),
      worker(ids.amina),
      worker(ids.lena),
      worker(ids.henrik),
    ],
  });

function reject(
  reason: unknown,
  state: DemoState = baseState(),
  actorId: string = ids.owner1,
): CommandResult {
  return rejectShortlist(
    state,
    { type: "rejectShortlist", requestId: "oppdrag-1", reason },
    createContext(actorId, "2026-11-16T10:00:00+01:00", "ny"),
  );
}

function ret(state: DemoState, actorId: string = ids.admin): CommandResult {
  return returnToOpen(
    state,
    { type: "returnToOpen", requestId: "oppdrag-1" },
    createContext(actorId, "2026-11-17T10:00:00+01:00", "ret"),
  );
}

describe("rejectShortlist", () => {
  it("excludes every active worker, removes their entries and moves to under-review", () => {
    const result = reject("Ingen av dem passer.", deepFreeze(baseState()));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const updated = requestIn(result.state, "oppdrag-1");
    expect(updated?.status).toBe("under-review");
    expect(updated?.rejection).toEqual({
      reason: "Ingen av dem passer.",
      at: "2026-11-16T10:00:00+01:00",
    });
    expect(updated?.shortlist.map((item) => item.state)).toEqual([
      "removed",
      "removed",
      "removed",
    ]);
    expect(
      updated?.shortlist.slice(0, 2).map((item) => item.removedReason),
    ).toEqual(["shortlist-rejected", "shortlist-rejected"]);
    expect(updated?.shortlist[2]?.removedReason).toBe("declined");
    expect(updated?.excludedWorkerIds.map((item) => item.workerId)).toEqual([
      ids.lena,
      ids.mats,
      ids.amina,
    ]);
    expect(
      updated?.excludedWorkerIds.slice(1).map((item) => item.reason),
    ).toEqual(["shortlist-rejected", "shortlist-rejected"]);
  });

  it("logs shortlist-rejected and status-changed without running matching", () => {
    const result = reject("Ingen av dem passer.");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const log = requestIn(result.state, "oppdrag-1")?.log ?? [];
    expect(log.map((event) => event.kind)).toEqual([
      "shortlist-rejected",
      "status-changed",
    ]);
    expect(log[0]?.actor).toBe(ids.owner1);
    expect(log[1]).toMatchObject({
      fromStatus: "shortlisted",
      toStatus: "under-review",
    });
    expect(
      requestIn(result.state, "oppdrag-1")?.shortlist.some(
        (item) => item.state !== "removed",
      ),
    ).toBe(false);
  });

  it("announces to the owner and the removed workers", () => {
    const result = reject("Ingen av dem passer.");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const activity = result.state.frame.activity;
    expect(activity).toHaveLength(1);
    expect(activity[0]?.audience.personIds).toEqual([
      ids.owner1,
      ids.mats,
      ids.amina,
    ]);
    expect(activity[0]?.target.route).toBe("/oppdrag/oppdrag-1");
  });

  it("requires a reason of 1–1000 characters", () => {
    for (const reason of ["", "   ", undefined, "a".repeat(1001)]) {
      const result = reject(reason);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("validation");
        expect(result.error.fieldErrors?.reason).toBeTruthy();
      }
    }
    expect(reject("a".repeat(1000)).ok).toBe(true);
  });

  it("lets only the owner reject, and only while shortlisted", () => {
    for (const actor of [ids.admin, ids.owner2, ids.employee1, ids.mats]) {
      const result = reject("Grunn", baseState(), actor);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("not-allowed");
      }
    }
    for (const status of [
      "open",
      "offered",
      "agreed",
      "under-review",
    ] as const) {
      const state = createState({
        requests: [request("oppdrag-1", { status })],
      });
      const result = reject("Grunn", state);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("invalid-status");
      }
    }
  });

  it("returns not-found for an unknown request", () => {
    const result = rejectShortlist(
      baseState(),
      { type: "rejectShortlist", requestId: "oppdrag-99", reason: "Grunn" },
      createContext(ids.owner1),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-found");
    }
  });
});

describe("returnToOpen", () => {
  function rejectedState(): DemoState {
    const result = reject("Ingen av dem passer.");
    if (!result.ok) {
      throw new Error("Forventet at avvisningen lyktes");
    }
    return result.state;
  }

  it("opens the request again and never lists the excluded workers", () => {
    const result = ret(deepFreeze(rejectedState()));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const updated = requestIn(result.state, "oppdrag-1");
    expect(updated?.status).toBe("shortlisted");
    const active = updated?.shortlist.filter((item) => item.state === "active");
    expect(active?.map((item) => item.workerId)).toEqual([ids.henrik]);
    const everListed = updated?.shortlist
      .filter((item) => item.state !== "removed")
      .map((item) => item.workerId);
    expect(everListed).not.toContain(ids.mats);
    expect(everListed).not.toContain(ids.amina);
    expect(everListed).not.toContain(ids.lena);
  });

  it("stays open when only excluded workers could match", () => {
    const state = createState({
      requests: [shortlisted],
      workers: [worker(ids.mats), worker(ids.amina), worker(ids.lena)],
    });
    const rejected = reject("Grunn", state);
    if (!rejected.ok) {
      throw new Error("Forventet at avvisningen lyktes");
    }
    const result = ret(rejected.state);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(requestIn(result.state, "oppdrag-1")?.status).toBe("open");
  });

  it("logs returned-to-open and status-changed, then the matching events", () => {
    const result = ret(rejectedState());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const log = requestIn(result.state, "oppdrag-1")?.log ?? [];
    expect(log.map((event) => event.kind)).toEqual([
      "shortlist-rejected",
      "status-changed",
      "returned-to-open",
      "status-changed",
      "shortlisted",
      "status-changed",
    ]);
    expect(log[2]?.actor).toBe(ids.admin);
    expect(log[3]).toMatchObject({
      fromStatus: "under-review",
      toStatus: "open",
    });
  });

  it("announces Oppdraget er åpent igjen to the owner and the workers group", () => {
    const result = ret(rejectedState());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const entryFound = result.state.frame.activity.find((item) =>
      item.text.includes("Oppdraget er åpent igjen"),
    );
    expect(entryFound?.audience).toEqual({
      personIds: [ids.owner1],
      groups: ["marketplace.workers"],
    });
  });

  it("lets only an admin return a request that is under review", () => {
    for (const actor of [ids.owner1, ids.owner2, ids.mats]) {
      const result = ret(rejectedState(), actor);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("not-allowed");
      }
    }
    const result = ret(baseState());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("invalid-status");
    }
  });
});
