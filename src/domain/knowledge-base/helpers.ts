import type { DemoState } from "../frame/types";
import type { Answer, ContentTarget, Question, Review } from "./types";

export function findTarget(
  state: DemoState,
  target: ContentTarget,
): Question | Answer | undefined {
  return target.targetKind === "question"
    ? state.knowledgeBase.questions.find((item) => item.id === target.targetId)
    : state.knowledgeBase.answers.find((item) => item.id === target.targetId);
}

export function openReviewFor(
  state: DemoState,
  target: ContentTarget,
): Review | undefined {
  return state.knowledgeBase.reviews.find(
    (review) =>
      review.targetKind === target.targetKind &&
      review.targetId === target.targetId &&
      review.outcome === undefined,
  );
}
