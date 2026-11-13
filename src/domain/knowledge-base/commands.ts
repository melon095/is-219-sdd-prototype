import type { CommandHandler } from "../frame/types";
import { editAnswer, postAnswer } from "./answers";
import { editQuestion, postQuestion } from "./questions";

export const knowledgeBaseCommandHandlers: Record<string, CommandHandler> = {
  postQuestion,
  editQuestion,
  postAnswer,
  editAnswer,
};
