import { type ZodType, z } from "zod";
import type {
  Conversation,
  CrawlCatalogEntry,
  CrawlRun,
  LogEvent,
  MarketplaceState,
  ShortlistEntry,
  TaskRequest,
  WorkerProfile,
} from "../../domain/marketplace/types";
import {
  actorSchema,
  idSchema,
  isoDateSchema,
  isoDateTimeSchema,
} from "../../frame/store/schema";

export const experienceLevelSchema = z.enum(["junior", "mid", "senior"]);

export const requestStatusSchema = z.enum([
  "open",
  "shortlisted",
  "offered",
  "agreed",
  "in-progress",
  "completed",
  "cancelled",
  "under-review",
]);

export const exclusionReasonSchema = z.enum([
  "declined",
  "offer-expired",
  "withdrew",
  "shortlist-rejected",
]);

export const outcomeSchema = z.enum([
  "as-planned",
  "extended",
  "permanent",
  "not-completed",
]);

export const logEventKindSchema = z.enum([
  "published",
  "edited",
  "duration-notice",
  "shortlisted",
  "shortlist-entry-removed",
  "interview-invited",
  "offered",
  "offer-accepted",
  "offer-declined",
  "offer-expired",
  "shortlist-rejected",
  "returned-to-open",
  "started",
  "completed",
  "withdrew",
  "cancelled",
  "message-sent",
  "status-changed",
]);

export const workerProfileSchema = z.object({
  personId: idSchema,
  skillIds: z.array(idSchema),
  experienceLevel: experienceLevelSchema.optional(),
  availableFrom: isoDateSchema.optional(),
  wishes: z.string().optional(),
  isDraft: z.boolean(),
  navReferral: z
    .object({ referredAt: isoDateTimeSchema, simulated: z.literal(true) })
    .optional(),
  eligibleSince: isoDateTimeSchema.optional(),
  lastShortlistedAt: isoDateTimeSchema.optional(),
}) satisfies ZodType<WorkerProfile>;

export const shortlistEntrySchema = z.object({
  workerId: idSchema,
  rank: z.number().int().min(1),
  addedAt: isoDateTimeSchema,
  matchedSkillIds: z.array(idSchema),
  missingSkillIds: z.array(idSchema),
  interviewInvitedAt: isoDateTimeSchema.optional(),
  offeredAt: isoDateTimeSchema.optional(),
  state: z.enum(["active", "offered", "removed"]),
  removedReason: z
    .union([exclusionReasonSchema, z.literal("accepted-elsewhere")])
    .optional(),
}) satisfies ZodType<ShortlistEntry>;

export const logEventSchema = z.object({
  id: idSchema,
  at: isoDateTimeSchema,
  actor: actorSchema,
  kind: logEventKindSchema,
  text: z.string(),
  workerId: idSchema.optional(),
  fromStatus: requestStatusSchema.optional(),
  toStatus: requestStatusSchema.optional(),
  simulated: z.literal(true).optional(),
}) satisfies ZodType<LogEvent>;

export const estimatedDurationSchema = z.object({
  amount: z.number().int().min(1),
  unit: z.enum(["weeks", "months"]),
});

export const taskRequestSchema = z.object({
  id: idSchema,
  businessId: idSchema,
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(4000),
  requiredSkillIds: z.array(idSchema).min(1),
  acceptedSuggestionIds: z.array(idSchema),
  additionalRequirements: z.string().optional(),
  desiredStartDate: isoDateSchema,
  estimatedDuration: estimatedDurationSchema,
  hoursPerWeek: z.number().int().min(1).max(60),
  workLocation: z.enum(["remote", "onsite"]),
  status: requestStatusSchema,
  createdAt: isoDateTimeSchema,
  shortlist: z.array(shortlistEntrySchema),
  excludedWorkerIds: z.array(
    z.object({
      workerId: idSchema,
      reason: exclusionReasonSchema,
      at: isoDateTimeSchema,
    }),
  ),
  offeredWorkerId: idSchema.optional(),
  agreement: z
    .object({
      workerId: idSchema,
      ownerAgreedAt: isoDateTimeSchema,
      workerAgreedAt: isoDateTimeSchema,
    })
    .optional(),
  actualStartDate: isoDateSchema.optional(),
  outcome: outcomeSchema.optional(),
  rejection: z
    .object({ reason: z.string().min(1).max(1000), at: isoDateTimeSchema })
    .optional(),
  cancellation: z
    .object({
      reason: z.string().min(1).max(1000),
      at: isoDateTimeSchema,
      by: idSchema,
    })
    .optional(),
  log: z.array(logEventSchema),
}) satisfies ZodType<TaskRequest>;

export const conversationSchema = z.object({
  id: idSchema,
  requestId: idSchema,
  ownerId: idSchema,
  workerId: idSchema,
  messages: z.array(
    z.object({
      id: idSchema,
      at: isoDateTimeSchema,
      authorId: idSchema,
      text: z.string().min(1).max(2000),
    }),
  ),
}) satisfies ZodType<Conversation>;

export const crawlCatalogEntrySchema = z.object({
  businessId: idSchema,
  rounds: z.array(z.array(idSchema)),
}) satisfies ZodType<CrawlCatalogEntry>;

export const crawlRunSchema = z.object({
  id: idSchema,
  at: isoDateTimeSchema,
  by: idSchema,
  crawledBusinessIds: z.array(idSchema),
  skippedBusinessIds: z.array(idSchema),
  simulated: z.literal(true),
}) satisfies ZodType<CrawlRun>;

export const marketplaceStateSchema = z.object({
  workerProfiles: z.array(workerProfileSchema),
  requests: z.array(taskRequestSchema),
  conversations: z.array(conversationSchema),
  crawlCatalog: z.array(crawlCatalogEntrySchema),
  crawlRuns: z.array(crawlRunSchema),
}) satisfies ZodType<MarketplaceState>;
