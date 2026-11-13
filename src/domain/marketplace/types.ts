import type { Actor, Id, IsoDate, IsoDateTime } from "../frame/types";

export type ExperienceLevel = "junior" | "mid" | "senior";

export type NavReferral = {
  referredAt: IsoDateTime;
  simulated: true;
};

export type WorkerProfile = {
  personId: Id;
  skillIds: Id[];
  experienceLevel?: ExperienceLevel;
  availableFrom?: IsoDate;
  wishes?: string;
  isDraft: boolean;
  navReferral?: NavReferral;
  eligibleSince?: IsoDateTime;
  lastShortlistedAt?: IsoDateTime;
};

export type RequestStatus =
  | "open"
  | "shortlisted"
  | "offered"
  | "agreed"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "under-review";

export type ExclusionReason =
  | "declined"
  | "offer-expired"
  | "withdrew"
  | "shortlist-rejected";

export type ShortlistEntryState = "active" | "offered" | "removed";

export type ShortlistEntry = {
  workerId: Id;
  rank: number;
  addedAt: IsoDateTime;
  matchedSkillIds: Id[];
  missingSkillIds: Id[];
  interviewInvitedAt?: IsoDateTime;
  offeredAt?: IsoDateTime;
  state: ShortlistEntryState;
  removedReason?: ExclusionReason | "accepted-elsewhere";
};

export type Outcome = "as-planned" | "extended" | "permanent" | "not-completed";

export type DurationUnit = "weeks" | "months";

export type EstimatedDuration = {
  amount: number;
  unit: DurationUnit;
};

export type WorkLocation = "remote" | "onsite";

export type ExcludedWorker = {
  workerId: Id;
  reason: ExclusionReason;
  at: IsoDateTime;
};

export type Agreement = {
  workerId: Id;
  ownerAgreedAt: IsoDateTime;
  workerAgreedAt: IsoDateTime;
};

export type Rejection = {
  reason: string;
  at: IsoDateTime;
};

export type Cancellation = {
  reason: string;
  at: IsoDateTime;
  by: Id;
};

export type LogEventKind =
  | "published"
  | "edited"
  | "duration-notice"
  | "shortlisted"
  | "shortlist-entry-removed"
  | "interview-invited"
  | "offered"
  | "offer-accepted"
  | "offer-declined"
  | "offer-expired"
  | "shortlist-rejected"
  | "returned-to-open"
  | "started"
  | "completed"
  | "withdrew"
  | "cancelled"
  | "message-sent"
  | "status-changed";

export type LogEvent = {
  id: Id;
  at: IsoDateTime;
  actor: Actor;
  kind: LogEventKind;
  text: string;
  workerId?: Id;
  fromStatus?: RequestStatus;
  toStatus?: RequestStatus;
  simulated?: true;
};

export type TaskRequest = {
  id: Id;
  businessId: Id;
  title: string;
  description: string;
  requiredSkillIds: Id[];
  acceptedSuggestionIds: Id[];
  additionalRequirements?: string;
  desiredStartDate: IsoDate;
  estimatedDuration: EstimatedDuration;
  hoursPerWeek: number;
  workLocation: WorkLocation;
  status: RequestStatus;
  createdAt: IsoDateTime;
  shortlist: ShortlistEntry[];
  excludedWorkerIds: ExcludedWorker[];
  offeredWorkerId?: Id;
  agreement?: Agreement;
  actualStartDate?: IsoDate;
  outcome?: Outcome;
  rejection?: Rejection;
  cancellation?: Cancellation;
  log: LogEvent[];
};

export type Message = {
  id: Id;
  at: IsoDateTime;
  authorId: Id;
  text: string;
};

export type Conversation = {
  id: Id;
  requestId: Id;
  ownerId: Id;
  workerId: Id;
  messages: Message[];
};

export type CrawlCatalogEntry = {
  businessId: Id;
  rounds: Id[][];
};

export type CrawlRun = {
  id: Id;
  at: IsoDateTime;
  by: Id;
  crawledBusinessIds: Id[];
  skippedBusinessIds: Id[];
  simulated: true;
};

export type MarketplaceState = {
  workerProfiles: WorkerProfile[];
  requests: TaskRequest[];
  conversations: Conversation[];
  crawlCatalog: CrawlCatalogEntry[];
  crawlRuns: CrawlRun[];
};

export type RequestFields = {
  title: string;
  description: string;
  requiredSkillIds: Id[];
  acceptedSuggestionIds: Id[];
  additionalRequirements?: string;
  desiredStartDate: IsoDate;
  estimatedDuration: EstimatedDuration;
  hoursPerWeek: number;
  workLocation: WorkLocation;
};

export type PublishRequestInput = RequestFields & { businessId: Id };

export type EditRequestInput = RequestFields & { requestId: Id };

export type InviteToInterviewInput = { requestId: Id; workerId: Id };

export type MakeOfferInput = { requestId: Id; workerId: Id };

export type AcceptOfferInput = { requestId: Id };

export type DeclineOfferInput = { requestId: Id };

export type SimulateOfferExpiryInput = { requestId: Id };

export type RejectShortlistInput = { requestId: Id; reason: string };

export type ReturnToOpenInput = { requestId: Id };

export type RecordStartInput = { requestId: Id; actualStartDate: IsoDate };

export type WithdrawInput = { requestId: Id };

export type CompleteRequestInput = {
  requestId: Id;
  outcome: "as-planned" | "extended" | "permanent";
};

export type CancelRequestInput = { requestId: Id; reason: string };

export type SendMessageInput = { conversationId: Id; text: string };

export type RegisterWorkerProfileInput = {
  skillIds: Id[];
  experienceLevel: ExperienceLevel;
  availableFrom: IsoDate;
  wishes?: string;
};

export type UpdateWorkerProfileInput = RegisterWorkerProfileInput;

export type SimulateNavReferralInput = { personId: Id };

export type SetCrawlOptInInput = { businessId: Id; optIn: boolean };

export type SimulateCrawlInput = Record<string, never>;
