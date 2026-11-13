import { type ZodType, z } from "zod";
import type {
  Answer,
  ChatbotQuestion,
  Flag,
  KnowledgeBaseState,
  NearDuplicateExample,
  Question,
  Review,
  Topic,
} from "../../domain/knowledge-base/types";
import { idSchema, isoDateTimeSchema } from "../../frame/store/schema";

function trimmedLength(min: number, max: number) {
  return z.string().refine((value) => {
    const length = value.trim().length;
    return length >= min && length <= max;
  });
}

export const moderationSchema = z.enum([
  "current",
  "flagged",
  "cleared",
  "removed",
]);

export const flagReasonSchema = z.enum([
  "outdated",
  "incorrect",
  "spam",
  "off-topic",
  "other",
]);

export const targetKindSchema = z.enum(["question", "answer"]);

export const topicSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(40),
  description: z.string(),
}) satisfies ZodType<Topic>;

export const questionSchema = z.object({
  id: idSchema,
  topicId: idSchema,
  title: trimmedLength(1, 120),
  description: trimmedLength(1, 4000),
  authorId: idSchema,
  businessId: idSchema,
  createdAt: isoDateTimeSchema,
  editedAt: isoDateTimeSchema.optional(),
  moderation: moderationSchema,
}) satisfies ZodType<Question>;

export const answerSchema = z.object({
  id: idSchema,
  questionId: idSchema,
  text: trimmedLength(1, 4000),
  authorId: idSchema,
  businessId: idSchema,
  createdAt: isoDateTimeSchema,
  editedAt: isoDateTimeSchema.optional(),
  moderation: moderationSchema,
}) satisfies ZodType<Answer>;

export const flagSchema = z
  .object({
    id: idSchema,
    reviewId: idSchema,
    targetKind: targetKindSchema,
    targetId: idSchema,
    flaggedBy: idSchema,
    reason: flagReasonSchema,
    note: z.string().max(500).optional(),
    at: isoDateTimeSchema,
  })
  .refine(
    (flag) =>
      flag.reason !== "other" ||
      (flag.note !== undefined && flag.note.trim().length > 0),
    { path: ["note"] },
  ) satisfies ZodType<Flag>;

export const reviewSchema = z.object({
  id: idSchema,
  targetKind: targetKindSchema,
  targetId: idSchema,
  openedAt: isoDateTimeSchema,
  flagIds: z
    .array(idSchema)
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length),
  outcome: z.enum(["cleared", "removed"]).optional(),
  reviewedBy: idSchema.optional(),
  reviewedAt: isoDateTimeSchema.optional(),
}) satisfies ZodType<Review>;

export const chatbotQuestionSchema = z.object({
  id: idSchema,
  text: z.string().min(1).max(200),
  answer: z
    .object({
      text: z.string().min(1).max(1000),
      sourceQuestionIds: z.array(idSchema).min(1),
      sourceAnswerIds: z.array(idSchema),
    })
    .optional(),
}) satisfies ZodType<ChatbotQuestion>;

export const nearDuplicateExampleSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(4000),
  matchesQuestionId: idSchema,
}) satisfies ZodType<NearDuplicateExample>;

export const knowledgeBaseStateSchema = z.object({
  topics: z
    .array(topicSchema)
    .refine(
      (topics) =>
        new Set(topics.map((topic) => topic.name)).size === topics.length,
    ),
  questions: z.array(questionSchema),
  answers: z.array(answerSchema),
  flags: z.array(flagSchema),
  reviews: z.array(reviewSchema),
  chatbotQuestions: z.array(chatbotQuestionSchema),
  nearDuplicateExamples: z.array(nearDuplicateExampleSchema),
}) satisfies ZodType<KnowledgeBaseState>;
