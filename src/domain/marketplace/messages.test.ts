import { describe, expect, it } from "vitest";
import type { CommandResult, DemoState } from "../frame/types";
import { sendMessage } from "./messages";
import {
  conversation,
  createContext,
  createState,
  deepFreeze,
  entry,
  ids,
  request,
  requestIn,
} from "./testState";

function baseState(
  status: "shortlisted" | "completed" = "shortlisted",
): DemoState {
  return createState({
    requests: [
      request("oppdrag-1", {
        status,
        shortlist: [
          entry(ids.mats),
          entry(ids.lena, { state: "removed", removedReason: "declined" }),
        ],
      }),
    ],
    conversations: [
      conversation("samtale-1", "oppdrag-1", ids.mats),
      conversation("samtale-2", "oppdrag-1", ids.lena),
    ],
  });
}

function send(
  state: DemoState,
  actorId: string,
  text: unknown,
  conversationId = "samtale-1",
): CommandResult {
  return sendMessage(
    state,
    { type: "sendMessage", conversationId, text },
    createContext(actorId, "2026-11-16T10:00:00+01:00", "ny"),
  );
}

function errorCode(result: CommandResult): string {
  if (result.ok) {
    throw new Error("Forventet en feil");
  }
  return result.error.code;
}

describe("sendMessage", () => {
  it("adds the message with id, time, author and text", () => {
    const result = send(deepFreeze(baseState()), ids.owner1, "Hei Mats!");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.state.marketplace.conversations[0]?.messages).toEqual([
      {
        id: "ny-1",
        at: "2026-11-16T10:00:00+01:00",
        authorId: ids.owner1,
        text: "Hei Mats!",
      },
    ]);
    expect(result.state.marketplace.conversations[1]?.messages).toEqual([]);
  });

  it("lets the worker answer", () => {
    const first = send(baseState(), ids.owner1, "Hei Mats!");
    if (!first.ok) {
      throw new Error("Forventet suksess");
    }
    const second = send(first.state, ids.mats, "Hei Kari!");
    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }
    expect(
      second.state.marketplace.conversations[0]?.messages.map(
        (message) => message.authorId,
      ),
    ).toEqual([ids.owner1, ids.mats]);
  });

  it("logs message-sent naming both people but never the text", () => {
    const result = send(baseState(), ids.owner1, "Hemmelig tekst");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const log = requestIn(result.state, "oppdrag-1")?.log ?? [];
    expect(log).toHaveLength(1);
    expect(log[0]?.kind).toBe("message-sent");
    expect(log[0]?.actor).toBe(ids.owner1);
    expect(log[0]?.text).toContain("Kari Nordmann");
    expect(log[0]?.text).toContain("Mats Johansen");
    expect(log[0]?.text).not.toContain("Hemmelig tekst");
    expect(log[0]?.workerId).toBe(ids.mats);
  });

  it("announces Ny melding to the other participant only", () => {
    const fromOwner = send(baseState(), ids.owner1, "Hei");
    expect(fromOwner.ok).toBe(true);
    if (!fromOwner.ok) {
      return;
    }
    expect(fromOwner.state.frame.activity).toHaveLength(1);
    expect(fromOwner.state.frame.activity[0]?.text).toContain("Ny melding");
    expect(fromOwner.state.frame.activity[0]?.audience).toEqual({
      personIds: [ids.mats],
      groups: [],
    });
    expect(fromOwner.state.frame.activity[0]?.target.route).toBe(
      "/oppdrag/oppdrag-1",
    );
    const fromWorker = send(baseState(), ids.mats, "Hei");
    expect(fromWorker.ok).toBe(true);
    if (!fromWorker.ok) {
      return;
    }
    expect(fromWorker.state.frame.activity[0]?.audience.personIds).toEqual([
      ids.owner1,
    ]);
  });

  it("requires text of 1–2000 characters", () => {
    for (const text of ["", "   ", undefined, "a".repeat(2001)]) {
      const result = send(baseState(), ids.owner1, text);
      expect(errorCode(result)).toBe("validation");
      if (!result.ok) {
        expect(result.error.fieldErrors?.text).toBeTruthy();
      }
    }
    expect(send(baseState(), ids.owner1, "a".repeat(2000)).ok).toBe(true);
  });

  it("does not let admins or other people write", () => {
    for (const actor of [ids.admin, ids.amina, ids.owner2, ids.employee1]) {
      expect(errorCode(send(baseState(), actor, "Hei"))).toBe("not-allowed");
    }
  });

  it("does not allow messages after the request is completed", () => {
    expect(errorCode(send(baseState("completed"), ids.owner1, "Hei"))).toBe(
      "invalid-status",
    );
  });

  it("does not allow messages when the worker's entry is removed", () => {
    expect(errorCode(send(baseState(), ids.owner1, "Hei", "samtale-2"))).toBe(
      "invalid-status",
    );
    expect(errorCode(send(baseState(), ids.lena, "Hei", "samtale-2"))).toBe(
      "invalid-status",
    );
  });

  it("returns not-found for an unknown conversation", () => {
    expect(errorCode(send(baseState(), ids.owner1, "Hei", "samtale-99"))).toBe(
      "not-found",
    );
  });
});
