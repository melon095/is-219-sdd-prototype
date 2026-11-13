import type { CommandHandler } from "../frame/types";
import {
  actorOf,
  addActivity,
  fail,
  readText,
  succeed,
  validationFailure,
} from "../marketplace/helpers";
import { answerPostedActivity } from "./activity";
import { canEditAnswer, canPost, memberBusinessOf } from "./permissions";
import type { Answer, EditAnswerInput, PostAnswerInput } from "./types";

const textError = "Skriv et svar på opptil 4000 tegn";

function validText(value: unknown): string | undefined {
  const text = readText(value);
  return text.length >= 1 && text.length <= 4000 ? text : undefined;
}

export const postAnswer: CommandHandler = (state, command, context) => {
  const input = command as unknown as PostAnswerInput;
  const actor = actorOf(state, context);
  const business = memberBusinessOf(actor, state);
  if (!canPost(actor, state) || business === undefined) {
    return fail(
      "not-allowed",
      "Bare medlemmer i E-Waves kan svare i kunnskapsbanken.",
    );
  }
  const question = state.knowledgeBase.questions.find(
    (item) => item.id === input.questionId,
  );
  if (question === undefined || question.moderation === "removed") {
    return fail("not-found", "Vi finner ikke spørsmålet.");
  }
  const text = validText(input.text);
  if (text === undefined) {
    return validationFailure({ text: textError });
  }
  const answer: Answer = {
    id: context.newId(),
    questionId: question.id,
    text,
    authorId: actor.id,
    businessId: business.id,
    createdAt: context.now,
    moderation: "current",
  };
  const next = {
    ...state,
    knowledgeBase: {
      ...state.knowledgeBase,
      answers: [...state.knowledgeBase.answers, answer],
    },
  };
  return succeed(
    addActivity(next, [answerPostedActivity(question, business.name, context)]),
  );
};

export const editAnswer: CommandHandler = (state, command, context) => {
  const input = command as unknown as EditAnswerInput;
  const answer = state.knowledgeBase.answers.find(
    (item) => item.id === input.answerId,
  );
  if (answer === undefined || answer.moderation === "removed") {
    return fail("not-found", "Vi finner ikke svaret.");
  }
  if (!canEditAnswer(actorOf(state, context), answer)) {
    return fail("not-allowed", "Du kan bare endre dine egne svar.");
  }
  const text = validText(input.text);
  if (text === undefined) {
    return validationFailure({ text: textError });
  }
  const edited: Answer = { ...answer, text, editedAt: context.now };
  return succeed({
    ...state,
    knowledgeBase: {
      ...state.knowledgeBase,
      answers: state.knowledgeBase.answers.map((item) =>
        item.id === edited.id ? edited : item,
      ),
    },
  });
};
