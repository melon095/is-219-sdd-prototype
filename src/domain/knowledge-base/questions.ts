import {
  actorOf,
  addActivity,
  fail,
  readText,
  succeed,
  validationFailure,
} from "../frame/commandHelpers";
import type { CommandHandler, DemoState } from "../frame/types";
import { questionPostedActivity } from "./activity";
import { canEditQuestion, canPost, memberBusinessOf } from "./permissions";
import type {
  EditQuestionInput,
  PostQuestionInput,
  Question,
  QuestionFields,
} from "./types";

type FieldsResult =
  | { fields: QuestionFields; errors: undefined }
  | { fields: undefined; errors: Record<string, string> };

function readFields(
  input: Record<string, unknown>,
  state: DemoState,
): FieldsResult {
  const errors: Record<string, string> = {};
  const topicId = typeof input.topicId === "string" ? input.topicId : "";
  if (!state.knowledgeBase.topics.some((topic) => topic.id === topicId)) {
    errors.topicId = "Velg et tema";
  }
  const title = readText(input.title);
  if (title.length < 1 || title.length > 120) {
    errors.title = "Skriv en tittel på opptil 120 tegn";
  }
  const description = readText(input.description);
  if (description.length < 1 || description.length > 4000) {
    errors.description = "Beskriv spørsmålet med opptil 4000 tegn";
  }
  if (Object.keys(errors).length > 0) {
    return { fields: undefined, errors };
  }
  return { fields: { topicId, title, description }, errors: undefined };
}

export const postQuestion: CommandHandler = (state, command, context) => {
  const actor = actorOf(state, context);
  const business = memberBusinessOf(actor, state);
  if (!canPost(actor, state) || business === undefined) {
    return fail(
      "not-allowed",
      "Bare medlemmer i E-Waves kan stille spørsmål i kunnskapsbanken.",
    );
  }
  const parsed = readFields(command, state);
  if (parsed.fields === undefined) {
    return validationFailure(parsed.errors);
  }
  const input = command as unknown as PostQuestionInput;
  const question: Question = {
    id: context.newId(),
    topicId: input.topicId,
    title: parsed.fields.title,
    description: parsed.fields.description,
    authorId: actor.id,
    businessId: business.id,
    createdAt: context.now,
    moderation: "current",
  };
  const next: DemoState = {
    ...state,
    knowledgeBase: {
      ...state.knowledgeBase,
      questions: [...state.knowledgeBase.questions, question],
    },
  };
  return succeed(
    addActivity(next, [questionPostedActivity(question, context)]),
  );
};

export const editQuestion: CommandHandler = (state, command, context) => {
  const input = command as unknown as EditQuestionInput;
  const question = state.knowledgeBase.questions.find(
    (item) => item.id === input.questionId,
  );
  if (question === undefined || question.moderation === "removed") {
    return fail("not-found", "Vi finner ikke spørsmålet.");
  }
  if (!canEditQuestion(actorOf(state, context), question)) {
    return fail("not-allowed", "Du kan bare endre dine egne spørsmål.");
  }
  const parsed = readFields(command, state);
  if (parsed.fields === undefined) {
    return validationFailure(parsed.errors);
  }
  const edited: Question = {
    ...question,
    ...parsed.fields,
    editedAt: context.now,
  };
  return succeed({
    ...state,
    knowledgeBase: {
      ...state.knowledgeBase,
      questions: state.knowledgeBase.questions.map((item) =>
        item.id === edited.id ? edited : item,
      ),
    },
  });
};
