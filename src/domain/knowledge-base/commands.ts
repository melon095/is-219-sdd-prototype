import type { CommandHandler } from "../frame/types";
import { editAnswer, postAnswer } from "./answers";
import { flagContent, reviewContent } from "./moderation";
import { editQuestion, postQuestion } from "./questions";

export const knowledgeBaseCommandHandlers: Record<string, CommandHandler> = {
  postQuestion,
  editQuestion,
  postAnswer,
  editAnswer,
  flagContent,
  reviewContent,
};
