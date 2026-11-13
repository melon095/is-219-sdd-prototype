import type { DemoState, Id } from "../frame/types";
import { visibleQuestions } from "./status";
import { matchScore, tokenize } from "./text";
import type { Question } from "./types";

const similarLimit = 3;

const similarMinimumShared = 2;

type Scored = { question: Question; score: number; titleScore: number };

function newestFirst(a: Question, b: Question): number {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

function rank(a: Scored, b: Scored): number {
  return (
    b.score - a.score ||
    b.titleScore - a.titleScore ||
    newestFirst(a.question, b.question)
  );
}

function answerWords(questionId: Id, state: DemoState): string[] {
  return state.knowledgeBase.answers
    .filter(
      (answer) =>
        answer.questionId === questionId && answer.moderation !== "removed",
    )
    .flatMap((answer) => tokenize(answer.text));
}

function scoreAll(
  queryWords: string[],
  state: DemoState,
  includeAnswers: boolean,
): Scored[] {
  return visibleQuestions(state).map((question) => {
    const titleWords = tokenize(question.title);
    const textWords = [
      ...titleWords,
      ...tokenize(question.description),
      ...(includeAnswers ? answerWords(question.id, state) : []),
    ];
    return {
      question,
      score: matchScore(queryWords, textWords),
      titleScore: matchScore(queryWords, titleWords),
    };
  });
}

export function searchQuestions(query: string, state: DemoState): Question[] {
  const queryWords = tokenize(query);
  if (queryWords.length === 0) {
    return [];
  }
  return scoreAll(queryWords, state, true)
    .filter((item) => item.score > 0)
    .sort(rank)
    .map((item) => item.question);
}

export function similarQuestions(
  title: string,
  description: string,
  state: DemoState,
): Question[] {
  const queryWords = tokenize(`${title} ${description}`);
  if (queryWords.length === 0) {
    return [];
  }
  return scoreAll(queryWords, state, false)
    .filter((item) => item.score >= similarMinimumShared)
    .sort(rank)
    .slice(0, similarLimit)
    .map((item) => item.question);
}

export function questionsByTopic(topicId: Id, state: DemoState): Question[] {
  return visibleQuestions(state)
    .filter((question) => question.topicId === topicId)
    .sort(newestFirst);
}
