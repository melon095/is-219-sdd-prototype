import type { DemoState } from "../frame/types";
import type { Answer, ContentTarget, Flag, Question, Review } from "./types";

export function threadQuestion(
  state: DemoState,
  item: Question | Answer,
): Question | undefined {
  const questionId = "questionId" in item ? item.questionId : item.id;
  return state.knowledgeBase.questions.find(
    (candidate) => candidate.id === questionId,
  );
}

export function flagsOfReview(state: DemoState, review: Review): Flag[] {
  return review.flagIds.flatMap((flagId) => {
    const found = state.knowledgeBase.flags.find((flag) => flag.id === flagId);
    return found === undefined ? [] : [found];
  });
}

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
