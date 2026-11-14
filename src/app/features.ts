import type { RouteObject } from "react-router";
import type { ZodType } from "zod";
import type {
  CommandHandler,
  DemoState,
  Person,
  SystemStep,
} from "../domain/frame/types";
import { knowledgeBaseFeature } from "../features/knowledge-base/feature";
import { marketplaceFeature } from "../features/marketplace/feature";
import type { StoredState } from "../frame/store/persistence";
import {
  buildDemoStateSchema,
  buildSeedFileSchema,
  buildStoredStateSchema,
} from "../frame/store/schema";

export type HomeCard = {
  title: string;
  text: string;
  actionLabel: string;
  route: string;
};

export type FeatureDefinition = {
  id: string;
  label: string;
  basePath: string;
  homeCard: (person: Person, state: DemoState) => HomeCard | null;
  routes: RouteObject[];
  audienceGroups: Record<string, (person: Person, state: DemoState) => boolean>;
  commandHandlers: Record<string, CommandHandler>;
  stateSchema: ZodType;
  systemSteps: SystemStep[];
};

export const features: FeatureDefinition[] = [
  marketplaceFeature,
  knowledgeBaseFeature,
];

export const allCommandHandlers: Record<string, CommandHandler> = Object.assign(
  {},
  ...features.map((feature) => feature.commandHandlers),
);

export const allAudienceGroups: Record<
  string,
  (person: Person, state: DemoState) => boolean
> = Object.assign({}, ...features.map((feature) => feature.audienceGroups));

export const allSystemSteps: SystemStep[] = features.flatMap(
  (feature) => feature.systemSteps,
);

const featureSchemas: Record<string, ZodType> = Object.fromEntries(
  features.map((feature) => [feature.id, feature.stateSchema]),
);

export const demoStateSchema = buildDemoStateSchema(featureSchemas);

export const storedStateSchema = buildStoredStateSchema(
  featureSchemas,
) as unknown as ZodType<StoredState>;

export const seedFileSchema = buildSeedFileSchema(featureSchemas);
