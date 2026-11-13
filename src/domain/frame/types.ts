import type { KnowledgeBaseState } from "../knowledge-base/types";
import type { MarketplaceState } from "../marketplace/types";

export type Id = string;

export type IsoDate = string;

export type IsoDateTime = string;

export type Actor = Id | "system";

export type Person = {
  id: Id;
  name: string;
  isVaroddAdmin: boolean;
  seeksWork: boolean;
  description: string;
};

export type Business = {
  id: Id;
  name: string;
  description: string;
  ownerId: Id;
  employeeIds: Id[];
  isEWavesMember: boolean;
  crawlOptIn: boolean;
  crawlSuggestions: Id[];
  crawlSuggestionsUpdatedAt?: IsoDateTime;
};

export type Skill = {
  id: Id;
  name: string;
};

export type Audience = {
  personIds: Id[];
  groups: string[];
  requiredGroup?: string;
};

export type ActivityEntry = {
  id: Id;
  at: IsoDateTime;
  featureId: string;
  actor: Actor;
  text: string;
  target: { route: string };
  audience: Audience;
};

export type FrameState = {
  people: Person[];
  businesses: Business[];
  skills: Skill[];
  activity: ActivityEntry[];
};

export type DemoMeta = {
  seedId: string;
  anchorDate: IsoDate;
  loadedAt: IsoDateTime;
};

export type DemoState = {
  meta: DemoMeta;
  frame: FrameState;
  marketplace: MarketplaceState;
  knowledgeBase: KnowledgeBaseState;
};

export type CommandContext = {
  actorId: Id;
  now: IsoDateTime;
  newId: () => Id;
};

export type Command = { type: string } & Record<string, unknown>;

export type Notice = {
  kind: "info" | "warning";
  message: string;
};

export type CommandErrorCode =
  | "not-allowed"
  | "not-found"
  | "invalid-status"
  | "validation"
  | "excluded-worker";

export type CommandError = {
  code: CommandErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
};

export type CommandResult =
  | { ok: true; state: DemoState; notices: Notice[] }
  | { ok: false; error: CommandError };

export type CommandHandler = (
  state: DemoState,
  command: Command,
  context: CommandContext,
) => CommandResult;

export type SystemStep = (state: DemoState, now: IsoDateTime) => DemoState;
