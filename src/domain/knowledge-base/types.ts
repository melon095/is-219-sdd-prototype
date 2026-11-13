import type { Id, IsoDateTime } from "../frame/types";

export type Topic = {
  id: Id;
  name: string;
  description: string;
};

export type Moderation = "current" | "flagged" | "cleared" | "removed";

export type Question = {
  id: Id;
  topicId: Id;
  title: string;
  description: string;
  authorId: Id;
  businessId: Id;
  createdAt: IsoDateTime;
  editedAt?: IsoDateTime;
  moderation: Moderation;
};

export type Answer = {
  id: Id;
  questionId: Id;
  text: string;
  authorId: Id;
  businessId: Id;
  createdAt: IsoDateTime;
  editedAt?: IsoDateTime;
  moderation: Moderation;
};

export type FlagReason =
  | "outdated"
  | "incorrect"
  | "spam"
  | "off-topic"
  | "other";

export type TargetKind = "question" | "answer";

export type Flag = {
  id: Id;
  reviewId: Id;
  targetKind: TargetKind;
  targetId: Id;
  flaggedBy: Id;
  reason: FlagReason;
  note?: string;
  at: IsoDateTime;
};

export type ReviewOutcome = "cleared" | "removed";

export type Review = {
  id: Id;
  targetKind: TargetKind;
  targetId: Id;
  openedAt: IsoDateTime;
  flagIds: Id[];
  outcome?: ReviewOutcome;
  reviewedBy?: Id;
  reviewedAt?: IsoDateTime;
};

export type ChatbotAnswer = {
  text: string;
  sourceQuestionIds: Id[];
  sourceAnswerIds: Id[];
};

export type ChatbotQuestion = {
  id: Id;
  text: string;
  answer?: ChatbotAnswer;
};

export type NearDuplicateExample = {
  id: Id;
  title: string;
  description: string;
  matchesQuestionId: Id;
};

export type KnowledgeBaseState = {
  topics: Topic[];
  questions: Question[];
  answers: Answer[];
  flags: Flag[];
  reviews: Review[];
  chatbotQuestions: ChatbotQuestion[];
  nearDuplicateExamples: NearDuplicateExample[];
};

export type QuestionStatus = "open" | "answered";

export type ChatbotResponse =
  | { kind: "answer"; text: string; sources: Question[] }
  | { kind: "no-answer"; closest: Question[] };

export type QuestionFields = {
  topicId: Id;
  title: string;
  description: string;
};

export type PostQuestionInput = QuestionFields;

export type EditQuestionInput = QuestionFields & { questionId: Id };

export type PostAnswerInput = { questionId: Id; text: string };

export type EditAnswerInput = { answerId: Id; text: string };

export type FlagContentInput = {
  targetKind: TargetKind;
  targetId: Id;
  reason: FlagReason;
  note?: string;
};

export type ReviewDecision = "clear" | "remove";

export type ReviewContentInput = { reviewId: Id; decision: ReviewDecision };

export function emptyKnowledgeBaseState(): KnowledgeBaseState {
  return {
    topics: [],
    questions: [],
    answers: [],
    flags: [],
    reviews: [],
    chatbotQuestions: [],
    nearDuplicateExamples: [],
  };
}
