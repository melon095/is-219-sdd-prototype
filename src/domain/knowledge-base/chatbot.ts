import type { DemoState, Id } from "../frame/types";
import { searchQuestions } from "./search";
import type {
  ChatbotQuestion,
  ChatbotResponse,
  Moderation,
  Question,
} from "./types";

const closestLimit = 3;

function isTrusted(moderation: Moderation): boolean {
  return moderation === "current" || moderation === "cleared";
}

function sourceQuestions(ids: Id[], state: DemoState): Question[] | undefined {
  const found = ids.map((id) =>
    state.knowledgeBase.questions.find((item) => item.id === id),
  );
  const trusted = found.flatMap((item) =>
    item !== undefined && isTrusted(item.moderation) ? [item] : [],
  );
  return trusted.length === ids.length ? trusted : undefined;
}

function sourceAnswersAreTrusted(ids: Id[], state: DemoState): boolean {
  return ids.every((id) => {
    const found = state.knowledgeBase.answers.find((item) => item.id === id);
    return found !== undefined && isTrusted(found.moderation);
  });
}

export function chatbotResponse(
  chatbotQuestion: ChatbotQuestion,
  state: DemoState,
): ChatbotResponse {
  const prepared = chatbotQuestion.answer;
  if (prepared !== undefined) {
    const sources = sourceQuestions(prepared.sourceQuestionIds, state);
    if (
      sources !== undefined &&
      sourceAnswersAreTrusted(prepared.sourceAnswerIds, state)
    ) {
      return { kind: "answer", text: prepared.text, sources };
    }
  }
  return {
    kind: "no-answer",
    closest: searchQuestions(chatbotQuestion.text, state).slice(
      0,
      closestLimit,
    ),
  };
}
