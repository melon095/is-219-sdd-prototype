import { loadSeedState } from "../../frame/store/seed";
import type { CommandContext, DemoState } from "../frame/types";
import type {
  Answer,
  Flag,
  KnowledgeBaseState,
  Question,
  Review,
  Topic,
} from "./types";

export const people = {
  kari: "person-1",
  jonas: "person-2",
  per: "person-3",
  anne: "person-4",
  ola: "person-5",
  silje: "person-6",
  ingrid: "person-7",
  mats: "person-8",
  marte: "person-15",
};

export const topics: Topic[] = [
  { id: "tema-1", name: "Nettbutikk", description: "Alt om nettbutikken." },
  { id: "tema-2", name: "Teknisk hjelp", description: "Når noe ikke virker." },
];

export function question(
  id: string,
  overrides: Partial<Question> = {},
): Question {
  return {
    id,
    topicId: "tema-1",
    title: "Hvordan setter jeg opp frakt i nettbutikken?",
    description: "Vi trenger en enkel løsning for frakt til hele landet.",
    authorId: people.jonas,
    businessId: "bedrift-1",
    createdAt: "2026-11-10T09:00:00+01:00",
    moderation: "current",
    ...overrides,
  };
}

export function answer(
  id: string,
  questionId: string,
  overrides: Partial<Answer> = {},
): Answer {
  return {
    id,
    questionId,
    text: "Bruk en fraktavtale med Posten.",
    authorId: people.per,
    businessId: "bedrift-2",
    createdAt: "2026-11-10T10:00:00+01:00",
    moderation: "current",
    ...overrides,
  };
}

export function flag(
  id: string,
  reviewId: string,
  targetKind: Flag["targetKind"],
  targetId: string,
  overrides: Partial<Flag> = {},
): Flag {
  return {
    id,
    reviewId,
    targetKind,
    targetId,
    flaggedBy: people.per,
    reason: "outdated",
    at: "2026-11-11T09:00:00+01:00",
    ...overrides,
  };
}

export function review(
  id: string,
  targetKind: Review["targetKind"],
  targetId: string,
  flagIds: string[],
  overrides: Partial<Review> = {},
): Review {
  return {
    id,
    targetKind,
    targetId,
    openedAt: "2026-11-11T09:00:00+01:00",
    flagIds,
    ...overrides,
  };
}

export function seedState(): DemoState {
  return loadSeedState(new Date(2026, 10, 16));
}

export function withKnowledgeBase(
  state: DemoState,
  knowledgeBase: Partial<KnowledgeBaseState>,
): DemoState {
  return {
    ...state,
    knowledgeBase: { ...state.knowledgeBase, ...knowledgeBase },
  };
}

export function kbState(knowledgeBase: Partial<KnowledgeBaseState>): DemoState {
  return withKnowledgeBase(seedState(), {
    topics,
    questions: [],
    answers: [],
    flags: [],
    reviews: [],
    chatbotQuestions: [],
    nearDuplicateExamples: [],
    ...knowledgeBase,
  });
}

export function context(
  actorId: string,
  now = "2026-11-16T10:00:00+01:00",
  prefix = "ny",
): CommandContext {
  let counter = 0;
  return {
    actorId,
    now,
    newId: () => {
      counter += 1;
      return `${prefix}-${counter}`;
    },
  };
}

export function personOf(state: DemoState, id: string) {
  const found = state.frame.people.find((item) => item.id === id);
  if (found === undefined) {
    throw new Error(`Mangler ${id}`);
  }
  return found;
}
