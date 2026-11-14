import { describe, expect, it } from "vitest";
import { loadSeedState } from "../../frame/store/seed";
import { knowledgeBaseCommandHandlers } from "../knowledge-base/commands";
import { searchQuestions, similarQuestions } from "../knowledge-base/search";
import { marketplaceCommandHandlers } from "../marketplace/commands";
import { expireOverdueOffers } from "../marketplace/offers";
import type { TaskRequest } from "../marketplace/types";
import { createApplyCommand } from "./commands";
import type { Command, DemoState } from "./types";

const now = "2026-11-16T12:00:00.000Z";
const limitMs = 100;

const applyCommand = createApplyCommand({
  handlers: marketplaceCommandHandlers,
  systemSteps: [expireOverdueOffers],
});

function seed(): DemoState {
  return loadSeedState(new Date(now));
}

function requestOf(state: DemoState, id: string): TaskRequest {
  const found = state.marketplace.requests.find((item) => item.id === id);
  if (found === undefined) {
    throw new Error(`Seed-dataene mangler ${id}`);
  }
  return found;
}

type Case = { actorId: string; command: (state: DemoState) => Command };

const cases: Record<string, Case> = {
  publishRequest: {
    actorId: "person-1",
    command: (state) => ({
      type: "publishRequest",
      businessId: "bedrift-1",
      title: "Hjelp med vinterkampanjen",
      description: "Vi trenger hjelp med innhold og kampanjer.",
      requiredSkillIds: requestOf(state, "oppdrag-4").requiredSkillIds,
      acceptedSuggestionIds: [],
      desiredStartDate: "2026-12-20",
      estimatedDuration: { amount: 6, unit: "weeks" },
      hoursPerWeek: 10,
      workLocation: "remote",
    }),
  },
  editRequest: {
    actorId: "person-7",
    command: (state) => {
      const { id, title, ...rest } = requestOf(state, "oppdrag-7");
      return {
        type: "editRequest",
        requestId: id,
        title: `${title} (endret)`,
        description: rest.description,
        requiredSkillIds: rest.requiredSkillIds,
        acceptedSuggestionIds: [],
        desiredStartDate: rest.desiredStartDate,
        estimatedDuration: rest.estimatedDuration,
        hoursPerWeek: rest.hoursPerWeek,
        workLocation: rest.workLocation,
      };
    },
  },
  inviteToInterview: {
    actorId: "person-1",
    command: () => ({
      type: "inviteToInterview",
      requestId: "oppdrag-4",
      workerId: "person-11",
    }),
  },
  makeOffer: {
    actorId: "person-1",
    command: () => ({
      type: "makeOffer",
      requestId: "oppdrag-4",
      workerId: "person-9",
    }),
  },
  acceptOffer: {
    actorId: "person-8",
    command: () => ({ type: "acceptOffer", requestId: "oppdrag-5" }),
  },
  declineOffer: {
    actorId: "person-8",
    command: () => ({ type: "declineOffer", requestId: "oppdrag-5" }),
  },
  simulateOfferExpiry: {
    actorId: "person-4",
    command: () => ({ type: "simulateOfferExpiry", requestId: "oppdrag-5" }),
  },
  rejectShortlist: {
    actorId: "person-1",
    command: () => ({
      type: "rejectShortlist",
      requestId: "oppdrag-8",
      reason: "Ingen av dem passer til oppdraget.",
    }),
  },
  returnToOpen: {
    actorId: "person-15",
    command: () => ({ type: "returnToOpen", requestId: "oppdrag-1" }),
  },
  sendMessage: {
    actorId: "person-1",
    command: () => ({
      type: "sendMessage",
      conversationId: "samtale-14",
      text: "Hei! Har du tid til en prat?",
    }),
  },
  recordStart: {
    actorId: "person-5",
    command: () => ({
      type: "recordStart",
      requestId: "oppdrag-2",
      actualStartDate: "2026-11-17",
    }),
  },
  withdraw: {
    actorId: "person-12",
    command: () => ({ type: "withdraw", requestId: "oppdrag-2" }),
  },
  completeRequest: {
    actorId: "person-4",
    command: () => ({
      type: "completeRequest",
      requestId: "oppdrag-11",
      outcome: "as-planned",
    }),
  },
  cancelRequest: {
    actorId: "person-1",
    command: () => ({
      type: "cancelRequest",
      requestId: "oppdrag-4",
      reason: "Oppdraget er ikke lenger aktuelt.",
    }),
  },
  registerWorkerProfile: {
    actorId: "person-13",
    command: (state) => ({
      type: "registerWorkerProfile",
      skillIds: requestOf(state, "oppdrag-7").requiredSkillIds,
      experienceLevel: "mid",
      availableFrom: "2026-11-16",
    }),
  },
  updateWorkerProfile: {
    actorId: "person-8",
    command: (state) => ({
      type: "updateWorkerProfile",
      skillIds: requestOf(state, "oppdrag-4").requiredSkillIds,
      experienceLevel: "senior",
      availableFrom: "2026-11-20",
    }),
  },
  simulateNavReferral: {
    actorId: "person-15",
    command: () => ({ type: "simulateNavReferral", personId: "person-14" }),
  },
  setCrawlOptIn: {
    actorId: "person-1",
    command: () => ({
      type: "setCrawlOptIn",
      businessId: "bedrift-1",
      optIn: false,
    }),
  },
  simulateCrawl: {
    actorId: "person-15",
    command: () => ({ type: "simulateCrawl" }),
  },
};

const knowledgeBaseCases: Record<string, Case> = {
  postQuestion: {
    actorId: "person-1",
    command: () => ({
      type: "postQuestion",
      topicId: "tema-1",
      title: "Hvordan setter vi opp rabattkoder?",
      description: "Vi vil gi kunder rabatt på den første bestillingen.",
    }),
  },
  editQuestion: {
    actorId: "person-1",
    command: () => ({
      type: "editQuestion",
      questionId: "sporsmal-3",
      topicId: "tema-2",
      title: "Nettbutikken er treg på mobil",
      description: "Siden bruker lang tid på å vise bildene.",
    }),
  },
  postAnswer: {
    actorId: "person-1",
    command: () => ({
      type: "postAnswer",
      questionId: "sporsmal-7",
      text: "Bruk en abonnementsapp og koble den til betalingen.",
    }),
  },
  editAnswer: {
    actorId: "person-3",
    command: () => ({
      type: "editAnswer",
      answerId: "svar-1",
      text: "Bruk en fraktavtale med et av de store transportselskapene.",
    }),
  },
  flagContent: {
    actorId: "person-3",
    command: () => ({
      type: "flagContent",
      targetKind: "answer",
      targetId: "svar-7",
      reason: "outdated",
    }),
  },
  reviewContent: {
    actorId: "person-15",
    command: () => ({
      type: "reviewContent",
      reviewId: "vurdering-3",
      decision: "clear",
    }),
  },
};

const applyKnowledgeBaseCommand = createApplyCommand({
  handlers: knowledgeBaseCommandHandlers,
  systemSteps: [],
});

describe("ytelse for kommandoene i kunnskapsbanken", () => {
  it("dekker alle 6 kommandoene i kunnskapsbanken", () => {
    expect(Object.keys(knowledgeBaseCases).sort()).toEqual(
      Object.keys(knowledgeBaseCommandHandlers).sort(),
    );
    expect(Object.keys(knowledgeBaseCases)).toHaveLength(6);
  });

  for (const [type, { actorId, command }] of Object.entries(
    knowledgeBaseCases,
  )) {
    it(`${type} tar under ${limitMs} ms`, () => {
      const state = seed();
      const input = command(state);
      let counter = 0;
      const context = {
        actorId,
        now,
        newId: () => {
          counter += 1;
          return `ytelse-${counter}`;
        },
      };

      const started = performance.now();
      const result = applyKnowledgeBaseCommand(state, input, context);
      const elapsed = performance.now() - started;

      expect(result.ok).toBe(true);
      expect(elapsed).toBeLessThan(limitMs);
    });
  }

  it("searchQuestions tar under 100 ms", () => {
    const state = seed();
    const started = performance.now();
    const found = searchQuestions("Mailchimp", state);
    const elapsed = performance.now() - started;
    expect(found.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(limitMs);
  });

  it("similarQuestions tar under 100 ms", () => {
    const state = seed();
    const example = state.knowledgeBase.nearDuplicateExamples[0];
    if (example === undefined) {
      throw new Error("Seed-dataene mangler et eksempel på lignende spørsmål");
    }
    const started = performance.now();
    const found = similarQuestions(example.title, example.description, state);
    const elapsed = performance.now() - started;
    expect(found.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(limitMs);
  });
});

describe("ytelse for kommandoene", () => {
  it("dekker alle 19 kommandoene i markedsplassen", () => {
    expect(Object.keys(cases).sort()).toEqual(
      Object.keys(marketplaceCommandHandlers).sort(),
    );
    expect(Object.keys(cases)).toHaveLength(19);
  });

  for (const [type, { actorId, command }] of Object.entries(cases)) {
    it(`${type} tar under ${limitMs} ms`, () => {
      const state = seed();
      const input = command(state);
      let counter = 0;
      const context = {
        actorId,
        now,
        newId: () => {
          counter += 1;
          return `ytelse-${counter}`;
        },
      };

      const started = performance.now();
      const result = applyCommand(state, input, context);
      const elapsed = performance.now() - started;

      expect(result.ok).toBe(true);
      expect(elapsed).toBeLessThan(limitMs);
    });
  }
});
