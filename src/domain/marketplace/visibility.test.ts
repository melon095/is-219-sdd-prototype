import { describe, expect, it } from "vitest";
import type { Person } from "../frame/types";
import {
  conversation,
  createState,
  entry,
  ids,
  request,
  testPeople,
  worker,
} from "./testState";
import type { LogEvent } from "./types";
import {
  canSeeConversation,
  canSeeRequest,
  canSeeRequestTitle,
  canSendMessage,
  isActiveWorker,
  visibleLogEvents,
  visibleRequests,
} from "./visibility";

function personOf(id: string): Person {
  const found = testPeople.find((item) => item.id === id);
  if (found === undefined) {
    throw new Error(`Mangler ${id}`);
  }
  return found;
}

const openRequest = request("oppdrag-1", { status: "open" });
const otherOwnerRequest = request("oppdrag-2", {
  businessId: "bedrift-2",
  status: "shortlisted",
  shortlist: [entry(ids.amina)],
});
const shortlistedRequest = request("oppdrag-3", {
  status: "shortlisted",
  shortlist: [
    entry(ids.mats),
    entry(ids.lena, { state: "removed", removedReason: "declined" }),
  ],
});
const agreedRequest = request("oppdrag-4", {
  status: "agreed",
  shortlist: [entry(ids.henrik, { state: "offered" })],
  agreement: {
    workerId: ids.henrik,
    ownerAgreedAt: "2026-11-10T09:00:00+01:00",
    workerAgreedAt: "2026-11-11T09:00:00+01:00",
  },
});

const state = createState({
  requests: [openRequest, otherOwnerRequest, shortlistedRequest, agreedRequest],
  workers: [
    worker(ids.mats),
    worker(ids.amina),
    worker(ids.henrik),
    worker(ids.lena),
    worker(ids.omar),
    worker(ids.thea, { isDraft: true, skillIds: [] }),
  ],
});

function visibleIds(personId: string): string[] {
  return visibleRequests(personOf(personId), state).map((item) => item.id);
}

describe("request visibility", () => {
  it("shows an owner only their own business's requests in every status", () => {
    expect(visibleIds(ids.owner1)).toEqual([
      "oppdrag-1",
      "oppdrag-3",
      "oppdrag-4",
    ]);
    expect(visibleIds(ids.owner2)).toEqual(["oppdrag-2"]);
  });

  it("shows a worker every Open request plus their own shortlisted or agreed ones", () => {
    expect(visibleIds(ids.omar)).toEqual(["oppdrag-1"]);
    expect(visibleIds(ids.amina)).toEqual(["oppdrag-1", "oppdrag-2"]);
    expect(visibleIds(ids.mats)).toEqual(["oppdrag-1", "oppdrag-3"]);
    expect(visibleIds(ids.henrik)).toEqual(["oppdrag-1", "oppdrag-4"]);
  });

  it("hides a request from a worker whose entry was removed", () => {
    expect(canSeeRequest(personOf(ids.lena), shortlistedRequest, state)).toBe(
      false,
    );
  });

  it("shows nothing to a non-owner employee or to someone without a worker profile", () => {
    expect(visibleIds(ids.employee1)).toEqual([]);
    expect(visibleIds(ids.thea)).toEqual([]);
  });

  it("shows an admin every request", () => {
    expect(visibleIds(ids.admin)).toEqual([
      "oppdrag-1",
      "oppdrag-2",
      "oppdrag-3",
      "oppdrag-4",
    ]);
  });
});

describe("canSeeRequestTitle", () => {
  it("is true whenever the request can be seen", () => {
    for (const personId of [ids.owner1, ids.admin, ids.mats]) {
      const person = personOf(personId);
      expect(canSeeRequest(person, shortlistedRequest, state)).toBe(true);
      expect(canSeeRequestTitle(person, shortlistedRequest, state)).toBe(true);
    }
    expect(canSeeRequestTitle(personOf(ids.owner1), openRequest, state)).toBe(
      true,
    );
    expect(canSeeRequestTitle(personOf(ids.admin), openRequest, state)).toBe(
      true,
    );
  });

  it("is true for any person with a non-draft worker profile", () => {
    expect(canSeeRequest(personOf(ids.lena), shortlistedRequest, state)).toBe(
      false,
    );
    expect(
      canSeeRequestTitle(personOf(ids.lena), shortlistedRequest, state),
    ).toBe(true);
    expect(
      canSeeRequestTitle(personOf(ids.omar), otherOwnerRequest, state),
    ).toBe(true);
  });

  it("is false for another business's owner, employees, and draft or missing profiles", () => {
    expect(
      canSeeRequestTitle(personOf(ids.owner2), shortlistedRequest, state),
    ).toBe(false);
    expect(
      canSeeRequestTitle(personOf(ids.employee1), shortlistedRequest, state),
    ).toBe(false);
    expect(
      canSeeRequestTitle(personOf(ids.thea), shortlistedRequest, state),
    ).toBe(false);
  });
});

describe("isActiveWorker", () => {
  it("is true only for a non-draft worker profile", () => {
    expect(isActiveWorker(personOf(ids.mats), state)).toBe(true);
    expect(isActiveWorker(personOf(ids.thea), state)).toBe(false);
    expect(isActiveWorker(personOf(ids.owner1), state)).toBe(false);
  });
});

describe("visibleLogEvents", () => {
  function event(id: string, overrides: Partial<LogEvent>): LogEvent {
    return {
      id,
      at: "2026-11-02T09:00:00+01:00",
      actor: "system",
      kind: "shortlisted",
      text: "tekst",
      ...overrides,
    };
  }
  const log: LogEvent[] = [
    event("a", { kind: "published", actor: ids.owner1 }),
    event("b", { kind: "shortlisted", workerId: ids.mats }),
    event("c", { kind: "shortlisted", workerId: ids.amina }),
    event("d", { kind: "status-changed" }),
    event("e", { kind: "message-sent", workerId: ids.amina }),
  ];
  const withLog = request("oppdrag-5", { log });

  it("shows an owner and an admin every event", () => {
    expect(
      visibleLogEvents(personOf(ids.owner1), withLog, state).map((e) => e.id),
    ).toEqual(["a", "b", "c", "d", "e"]);
    expect(
      visibleLogEvents(personOf(ids.admin), withLog, state).map((e) => e.id),
    ).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("shows a worker only their own events and status changes", () => {
    expect(
      visibleLogEvents(personOf(ids.amina), withLog, state).map((e) => e.id),
    ).toEqual(["c", "d", "e"]);
    expect(
      visibleLogEvents(personOf(ids.mats), withLog, state).map((e) => e.id),
    ).toEqual(["b", "d"]);
  });
});

describe("conversations", () => {
  const talk = conversation("samtale-1", "oppdrag-3", ids.mats);

  it("is visible only to the owner, the worker and admins", () => {
    expect(canSeeConversation(personOf(ids.owner1), talk)).toBe(true);
    expect(canSeeConversation(personOf(ids.mats), talk)).toBe(true);
    expect(canSeeConversation(personOf(ids.admin), talk)).toBe(true);
    expect(canSeeConversation(personOf(ids.amina), talk)).toBe(false);
    expect(canSeeConversation(personOf(ids.owner2), talk)).toBe(false);
    expect(canSeeConversation(personOf(ids.employee1), talk)).toBe(false);
  });

  it("lets the owner and the worker send while the request is live", () => {
    expect(canSendMessage(personOf(ids.owner1), talk, shortlistedRequest)).toBe(
      true,
    );
    expect(canSendMessage(personOf(ids.mats), talk, shortlistedRequest)).toBe(
      true,
    );
  });

  it("does not let admins or other people send", () => {
    expect(canSendMessage(personOf(ids.admin), talk, shortlistedRequest)).toBe(
      false,
    );
    expect(canSendMessage(personOf(ids.amina), talk, shortlistedRequest)).toBe(
      false,
    );
  });

  it("stops sending when the request is completed or cancelled", () => {
    for (const status of ["completed", "cancelled"] as const) {
      const closed = { ...shortlistedRequest, status };
      expect(canSendMessage(personOf(ids.owner1), talk, closed)).toBe(false);
      expect(canSendMessage(personOf(ids.mats), talk, closed)).toBe(false);
    }
  });

  it("stops sending when the worker's entry is removed", () => {
    const removedTalk = conversation("samtale-2", "oppdrag-3", ids.lena);
    expect(
      canSendMessage(personOf(ids.owner1), removedTalk, shortlistedRequest),
    ).toBe(false);
    expect(
      canSendMessage(personOf(ids.lena), removedTalk, shortlistedRequest),
    ).toBe(false);
  });

  it("lets the agreed worker send even when no entry is live", () => {
    const agreedWithoutEntry = request("oppdrag-6", {
      status: "agreed",
      shortlist: [],
      agreement: {
        workerId: ids.henrik,
        ownerAgreedAt: "2026-11-10T09:00:00+01:00",
        workerAgreedAt: "2026-11-11T09:00:00+01:00",
      },
    });
    const agreedTalk = conversation("samtale-3", "oppdrag-6", ids.henrik);
    expect(
      canSendMessage(personOf(ids.henrik), agreedTalk, agreedWithoutEntry),
    ).toBe(true);
  });
});
