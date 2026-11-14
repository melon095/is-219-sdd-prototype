import type { DemoState, Id } from "../frame/types";
import type { Answer, Question, QuestionStatus } from "./types";

export function questionStatus(
  question: Question,
  state: DemoState,
): QuestionStatus {
  const counts = state.knowledgeBase.answers.some(
    (answer) =>
      answer.questionId === question.id &&
      (answer.moderation === "current" || answer.moderation === "cleared"),
  );
  return counts ? "answered" : "open";
}

export function visibleQuestions(state: DemoState): Question[] {
  return state.knowledgeBase.questions.filter(
    (question) => question.moderation !== "removed",
  );
}

export function visibleAnswers(questionId: Id, state: DemoState): Answer[] {
  return state.knowledgeBase.answers
    .filter(
      (answer) =>
        answer.questionId === questionId && answer.moderation !== "removed",
    )
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}
