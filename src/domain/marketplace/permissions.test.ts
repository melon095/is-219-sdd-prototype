import { describe, expect, it } from "vitest";
import type { Person } from "../frame/types";
import {
  canAcceptOffer,
  canEditRequest,
  canInviteToInterview,
  canMakeOffer,
  canPublishRequest,
  canRejectShortlist,
  canReturnToOpen,
  inviteBlocker,
  offerBlocker,
} from "./permissions";
import {
  createState,
  entry,
  ids,
  request,
  testPeople,
  worker,
} from "./testState";

function personOf(id: string): Person {
  const found = testPeople.find((item) => item.id === id);
  if (found === undefined) {
    throw new Error(`Mangler ${id}`);
  }
  return found;
}

const shortlisted = request("oppdrag-1", {
  status: "shortlisted",
  shortlist: [
    entry(ids.mats, { rank: 1 }),
    entry(ids.amina, {
      rank: 2,
      interviewInvitedAt: "2026-11-03T09:00:00+01:00",
    }),
    entry(ids.henrik, { rank: 3, state: "removed", removedReason: "withdrew" }),
  ],
});

const offered = request("oppdrag-2", {
  status: "offered",
  offeredWorkerId: ids.mats,
  shortlist: [
    entry(ids.mats, {
      state: "offered",
      offeredAt: "2026-11-03T09:00:00+01:00",
    }),
    entry(ids.amina, { rank: 2 }),
  ],
});

const state = createState({
  workers: [worker(ids.mats), worker(ids.amina), worker(ids.henrik)],
  requests: [shortlisted, offered, request("oppdrag-3")],
});

describe("canInviteToInterview", () => {
  it("lar eieren invitere en aktiv kandidat som ikke er invitert", () => {
    expect(
      canInviteToInterview(personOf(ids.owner1), shortlisted, state, ids.mats),
    ).toBe(true);
    expect(
      canInviteToInterview(personOf(ids.owner1), offered, state, ids.amina),
    ).toBe(true);
  });

  it("avviser alle andre enn eieren", () => {
    for (const id of [ids.owner2, ids.employee1, ids.admin, ids.mats]) {
      expect(
        canInviteToInterview(personOf(id), shortlisted, state, ids.mats),
      ).toBe(false);
    }
    expect(
      inviteBlocker(personOf(ids.admin), shortlisted, state, ids.mats)?.code,
    ).toBe("not-allowed");
  });

  it("avviser feil status, fjernede kandidater og allerede inviterte", () => {
    const owner = personOf(ids.owner1);
    expect(
      canInviteToInterview(owner, request("oppdrag-3"), state, ids.mats),
    ).toBe(false);
    expect(canInviteToInterview(owner, shortlisted, state, ids.henrik)).toBe(
      false,
    );
    expect(canInviteToInterview(owner, shortlisted, state, ids.lena)).toBe(
      false,
    );
    expect(canInviteToInterview(owner, shortlisted, state, ids.amina)).toBe(
      false,
    );
    expect(canInviteToInterview(owner, offered, state, ids.mats)).toBe(false);
    expect(inviteBlocker(owner, shortlisted, state, ids.amina)?.code).toBe(
      "invalid-status",
    );
  });
});

describe("canMakeOffer", () => {
  it("lar eieren gi tilbud til en aktiv kandidat mens kortlisten er klar", () => {
    expect(
      canMakeOffer(personOf(ids.owner1), shortlisted, state, ids.mats),
    ).toBe(true);
    expect(
      canMakeOffer(personOf(ids.owner1), shortlisted, state, ids.amina),
    ).toBe(true);
  });

  it("avviser andre personer, andre statuser og fjernede kandidater", () => {
    expect(
      canMakeOffer(personOf(ids.owner2), shortlisted, state, ids.mats),
    ).toBe(false);
    expect(canMakeOffer(personOf(ids.owner1), offered, state, ids.amina)).toBe(
      false,
    );
    expect(
      canMakeOffer(personOf(ids.owner1), shortlisted, state, ids.henrik),
    ).toBe(false);
    expect(
      offerBlocker(personOf(ids.owner1), offered, state, ids.amina)?.code,
    ).toBe("invalid-status");
  });
});

describe("canRejectShortlist", () => {
  it("lar bare eieren avvise en kortliste som er klar", () => {
    expect(canRejectShortlist(personOf(ids.owner1), shortlisted, state)).toBe(
      true,
    );
    expect(canRejectShortlist(personOf(ids.admin), shortlisted, state)).toBe(
      false,
    );
    expect(canRejectShortlist(personOf(ids.owner1), offered, state)).toBe(
      false,
    );
  });
});

describe("canAcceptOffer", () => {
  it("lar bare personen som har fått tilbudet godta det", () => {
    expect(canAcceptOffer(personOf(ids.mats), offered, state)).toBe(true);
    expect(canAcceptOffer(personOf(ids.amina), offered, state)).toBe(false);
    expect(canAcceptOffer(personOf(ids.owner1), offered, state)).toBe(false);
    expect(canAcceptOffer(personOf(ids.mats), shortlisted, state)).toBe(false);
  });
});

describe("canEditRequest", () => {
  it("lar bare eieren redigere mens oppdraget er åpent", () => {
    const open = request("oppdrag-3");
    expect(canEditRequest(personOf(ids.owner1), open, state)).toBe(true);
    expect(canEditRequest(personOf(ids.owner2), open, state)).toBe(false);
    expect(canEditRequest(personOf(ids.admin), open, state)).toBe(false);
    expect(canEditRequest(personOf(ids.owner1), shortlisted, state)).toBe(
      false,
    );
  });
});

describe("canReturnToOpen", () => {
  it("lar bare administratorer åpne et oppdrag til vurdering igjen", () => {
    const review = request("oppdrag-4", { status: "under-review" });
    expect(canReturnToOpen(personOf(ids.admin), review)).toBe(true);
    expect(canReturnToOpen(personOf(ids.owner1), review)).toBe(false);
    expect(canReturnToOpen(personOf(ids.admin), shortlisted)).toBe(false);
  });
});

describe("canPublishRequest", () => {
  it("lar bare eieren av bedriften publisere", () => {
    expect(canPublishRequest(personOf(ids.owner1), "bedrift-1", state)).toBe(
      true,
    );
    expect(canPublishRequest(personOf(ids.owner1), "bedrift-2", state)).toBe(
      false,
    );
    expect(canPublishRequest(personOf(ids.employee1), "bedrift-1", state)).toBe(
      false,
    );
    expect(canPublishRequest(personOf(ids.owner1), "finnes-ikke", state)).toBe(
      false,
    );
  });
});
