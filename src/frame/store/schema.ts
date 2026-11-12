import { type ZodType, z } from "zod";
import type {
  ActivityEntry,
  Audience,
  Business,
  DemoMeta,
  FrameState,
  Person,
  Skill,
} from "../../domain/frame/types";

export const idSchema = z.string().min(1);

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const actorSchema = z.string().min(1);

export const personSchema = z.object({
  id: idSchema,
  name: z.string(),
  isVaroddAdmin: z.boolean(),
  seeksWork: z.boolean(),
  description: z.string(),
}) satisfies ZodType<Person>;

export const businessSchema = z.object({
  id: idSchema,
  name: z.string(),
  description: z.string(),
  ownerId: idSchema,
  employeeIds: z.array(idSchema),
  isEWavesMember: z.boolean(),
  crawlOptIn: z.boolean(),
  crawlSuggestions: z.array(idSchema),
  crawlSuggestionsUpdatedAt: isoDateTimeSchema.optional(),
}) satisfies ZodType<Business>;

export const skillSchema = z.object({
  id: idSchema,
  name: z.string(),
}) satisfies ZodType<Skill>;

export const audienceSchema = z.object({
  personIds: z.array(idSchema),
  groups: z.array(z.string()),
}) satisfies ZodType<Audience>;

export const activityEntrySchema = z.object({
  id: idSchema,
  at: isoDateTimeSchema,
  featureId: z.string(),
  actor: actorSchema,
  text: z.string(),
  target: z.object({ route: z.string() }),
  audience: audienceSchema,
}) satisfies ZodType<ActivityEntry>;

export const frameStateSchema = z.object({
  people: z.array(personSchema),
  businesses: z.array(businessSchema),
  skills: z.array(skillSchema),
  activity: z.array(activityEntrySchema),
}) satisfies ZodType<FrameState>;

export const demoMetaSchema = z.object({
  seedId: z.string(),
  anchorDate: isoDateSchema,
  loadedAt: isoDateTimeSchema,
}) satisfies ZodType<DemoMeta>;

export type FeatureSchemas = Record<string, ZodType>;

export function buildDemoStateSchema<F extends FeatureSchemas>(
  featureSchemas: F,
) {
  return z.object({
    meta: demoMetaSchema,
    frame: frameStateSchema,
    ...featureSchemas,
  });
}

export function buildStoredStateSchema<F extends FeatureSchemas>(
  featureSchemas: F,
) {
  return z.object({
    format: z.literal(1),
    seedId: z.string(),
    state: buildDemoStateSchema(featureSchemas),
  });
}

export function buildSeedFileSchema<F extends FeatureSchemas>(
  featureSchemas: F,
) {
  return z.object({
    format: z.literal(1),
    seedId: z.string(),
    anchorDate: isoDateSchema,
    frame: frameStateSchema,
    ...featureSchemas,
  });
}
