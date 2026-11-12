import { describe, expect, it } from "vitest";
import { loadSeedState } from "../../frame/store/seed";
import { createApplyCommand } from "../frame/commands";
import type { Command, DemoState } from "../frame/types";
import { marketplaceCommandHandlers } from "./commands";
import { expireOverdueOffers } from "./offers";

const applyCommand = createApplyCommand({
  handlers: marketplaceCommandHandlers,
  systemSteps: [expireOverdueOffers],
});

type Step = {
  actorId: string;
  at: string;
  command: (state: DemoState) => Command;
};

function conversationId(
  state: DemoState,
  requestId: string,
  workerId: string,
): string {
  const found = state.marketplace.conversations.find(
    (item) => item.requestId === requestId && item.workerId === workerId,
  );
  if (found === undefined) {
    throw new Error(`Mangler samtale for ${requestId} og ${workerId}`);
  }
  return found.id;
}

const requestFields = {
  title: "Hjelp med innhold til vinterkampanjen",
  description: "Vi trenger hjelp med innhold og kampanjer i vinter.",
  requiredSkillIds: ["ferdighet-6", "ferdighet-5"],
  acceptedSuggestionIds: [],
  desiredStartDate: "2026-12-14",
  estimatedDuration: { amount: 6, unit: "weeks" },
  hoursPerWeek: 10,
  workLocation: "remote",
};

const steps: Step[] = [
  {
    actorId: "person-7",
    at: "2026-11-16T09:00:00+01:00",
    command: () => ({
      type: "editRequest",
      requestId: "oppdrag-7",
      ...requestFields,
      title: "Oversette produktbeskrivelser (revidert)",
      requiredSkillIds: ["ferdighet-14", "ferdighet-10"],
      desiredStartDate: "2026-11-23",
    }),
  },
  {
    actorId: "person-1",
    at: "2026-11-16T09:10:00+01:00",
    command: () => ({
      type: "publishRequest",
      businessId: "bedrift-1",
      ...requestFields,
    }),
  },
  {
    actorId: "person-1",
    at: "2026-11-16T09:20:00+01:00",
    command: () => ({
      type: "inviteToInterview",
      requestId: "oppdrag-4",
      workerId: "person-11",
    }),
  },
  {
    actorId: "person-1",
    at: "2026-11-16T09:30:00+01:00",
    command: (state) => ({
      type: "sendMessage",
      conversationId: conversationId(state, "oppdrag-4", "person-11"),
      text: "Hei Lena! Har du tid til en prat?",
    }),
  },
  {
    actorId: "person-1",
    at: "2026-11-16T09:40:00+01:00",
    command: () => ({
      type: "makeOffer",
      requestId: "oppdrag-4",
      workerId: "person-11",
    }),
  },
  {
    actorId: "person-11",
    at: "2026-11-16T09:50:00+01:00",
    command: () => ({ type: "declineOffer", requestId: "oppdrag-4" }),
  },
  {
    actorId: "person-1",
    at: "2026-11-16T10:00:00+01:00",
    command: () => ({
      type: "makeOffer",
      requestId: "oppdrag-4",
      workerId: "person-9",
    }),
  },
  {
    actorId: "person-9",
    at: "2026-11-16T10:10:00+01:00",
    command: () => ({ type: "acceptOffer", requestId: "oppdrag-4" }),
  },
  {
    actorId: "person-1",
    at: "2026-11-16T10:20:00+01:00",
    command: () => ({
      type: "recordStart",
      requestId: "oppdrag-4",
      actualStartDate: "2026-11-17",
    }),
  },
  {
    actorId: "person-3",
    at: "2026-11-16T10:30:00+01:00",
    command: () => ({
      type: "rejectShortlist",
      requestId: "oppdrag-6",
      reason: "Ingen av dem har erfaring med honning.",
    }),
  },
  {
    actorId: "person-15",
    at: "2026-11-16T10:40:00+01:00",
    command: () => ({ type: "returnToOpen", requestId: "oppdrag-6" }),
  },
  {
    actorId: "person-4",
    at: "2026-11-16T10:50:00+01:00",
    command: () => ({ type: "simulateOfferExpiry", requestId: "oppdrag-5" }),
  },
  {
    actorId: "person-13",
    at: "2026-11-16T11:00:00+01:00",
    command: () => ({
      type: "registerWorkerProfile",
      skillIds: ["ferdighet-14", "ferdighet-10"],
      experienceLevel: "mid",
      availableFrom: "2026-11-20",
    }),
  },
  {
    actorId: "person-13",
    at: "2026-11-16T11:10:00+01:00",
    command: () => ({
      type: "updateWorkerProfile",
      skillIds: ["ferdighet-14", "ferdighet-10", "ferdighet-5"],
      experienceLevel: "senior",
      availableFrom: "2026-11-20",
      wishes: "Jeg vil gjerne skrive tekster.",
    }),
  },
  {
    actorId: "person-15",
    at: "2026-11-16T11:20:00+01:00",
    command: () => ({ type: "simulateNavReferral", personId: "person-14" }),
  },
  {
    actorId: "person-12",
    at: "2026-11-16T11:30:00+01:00",
    command: () => ({ type: "withdraw", requestId: "oppdrag-2" }),
  },
  {
    actorId: "person-1",
    at: "2026-11-16T11:40:00+01:00",
    command: () => ({
      type: "completeRequest",
      requestId: "oppdrag-4",
      outcome: "permanent",
    }),
  },
  {
    actorId: "person-3",
    at: "2026-11-16T11:50:00+01:00",
    command: () => ({
      type: "cancelRequest",
      requestId: "oppdrag-3",
      reason: "Vi fant ut at vi tar regnskapet selv.",
    }),
  },
  {
    actorId: "person-1",
    at: "2026-11-16T12:00:00+01:00",
    command: () => ({
      type: "makeOffer",
      requestId: "oppdrag-8",
      workerId: "person-8",
    }),
  },
  {
    actorId: "person-1",
    at: "2026-11-24T12:30:00+01:00",
    command: (state) => ({
      type: "sendMessage",
      conversationId: conversationId(state, "oppdrag-8", "person-10"),
      text: "Hei Henrik! Kan du fortsatt hjelpe oss?",
    }),
  },
];

function assertPrefixes(before: DemoState, after: DemoState, label: string) {
  for (const previous of before.marketplace.requests) {
    const next = after.marketplace.requests.find(
      (item) => item.id === previous.id,
    );
    expect(next, `${label}: ${previous.id} finnes fortsatt`).toBeDefined();
    expect(
      next?.log.slice(0, previous.log.length),
      `${label}: loggen til ${previous.id} er en uendret start`,
    ).toEqual(previous.log);
  }
  expect(
    after.frame.activity.slice(0, before.frame.activity.length),
    `${label}: aktivitetsstrømmen er en uendret start`,
  ).toEqual(before.frame.activity);
}

describe("log and activity immutability", () => {
  it("only ever adds to request logs and the activity feed, for every command type", () => {
    let state = loadSeedState(new Date(2026, 10, 16, 12));
    let counter = 0;
    const exercised = new Set<string>();

    for (const step of steps) {
      const command = step.command(state);
      const result = applyCommand(state, command, {
        actorId: step.actorId,
        now: step.at,
        newId: () => {
          counter += 1;
          return `ny-${counter}`;
        },
      });
      if (!result.ok) {
        throw new Error(`${command.type} feilet: ${result.error.message}`);
      }
      assertPrefixes(state, result.state, command.type);
      exercised.add(command.type);
      state = result.state;
    }

    expect([...exercised].sort()).toEqual(
      Object.keys(marketplaceCommandHandlers).sort(),
    );
  });

  it("keeps the logs unchanged when overdue offers expire during a command", () => {
    let state = loadSeedState(new Date(2026, 10, 16, 12));
    const result = applyCommand(
      state,
      {
        type: "makeOffer",
        requestId: "oppdrag-8",
        workerId: "person-8",
      },
      {
        actorId: "person-1",
        now: "2026-11-16T09:00:00+01:00",
        newId: () => "ny-1",
      },
    );
    if (!result.ok) {
      throw new Error(result.error.message);
    }
    state = result.state;
    const later = applyCommand(
      state,
      { type: "simulateNavReferral", personId: "person-14" },
      {
        actorId: "person-15",
        now: "2026-11-30T09:00:00+01:00",
        newId: () => "ny-2",
      },
    );
    if (!later.ok) {
      throw new Error(later.error.message);
    }
    assertPrefixes(state, later.state, "systemsteg");
    const expired = later.state.marketplace.requests
      .find((item) => item.id === "oppdrag-8")
      ?.log.some((event) => event.kind === "offer-expired");
    expect(expired).toBe(true);
  });
});
