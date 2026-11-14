import type {
  ActivityEntry,
  Business,
  DemoState,
  FrameState,
  IsoDate,
  IsoDateTime,
} from "../../domain/frame/types";
import type {
  Answer,
  Flag,
  KnowledgeBaseState,
  Question,
  Review,
} from "../../domain/knowledge-base/types";
import type {
  Conversation,
  CrawlRun,
  LogEvent,
  MarketplaceState,
  Message,
  ShortlistEntry,
  TaskRequest,
  WorkerProfile,
} from "../../domain/marketplace/types";
import seedData from "../../seed/seed-data.json";

export type SeedFile = {
  format: 1;
  seedId: string;
  anchorDate: IsoDate;
  frame: FrameState;
  marketplace: MarketplaceState;
  knowledgeBase: KnowledgeBaseState;
};

export const bundledSeed = seedData as SeedFile;

export const bundledSeedId: string = bundledSeed.seedId;

const dayInMs = 86_400_000;

const datePattern = /^(\d{4})-(\d{2})-(\d{2})(.*)$/s;

export function daysBetween(anchorDate: IsoDate, today: Date): number {
  const [year = 0, month = 1, day = 1] = anchorDate.split("-").map(Number);
  const anchorUtc = Date.UTC(year, month - 1, day);
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return Math.round((todayUtc - anchorUtc) / dayInMs);
}

function shiftDate<T extends string>(value: T, days: number): T {
  const match = datePattern.exec(value);
  if (match === null) {
    return value;
  }
  const [, year = "0", month = "0", day = "0", rest = ""] = match;
  const moved = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day) + days),
  );
  return `${moved.toISOString().slice(0, 10)}${rest}` as T;
}

function shiftOptional(
  value: IsoDateTime | undefined,
  days: number,
): IsoDateTime | undefined {
  return value === undefined ? undefined : shiftDate(value, days);
}

function withOptional<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined,
): T {
  return value === undefined ? target : { ...target, [key]: value };
}

function shiftBusiness(business: Business, days: number): Business {
  return withOptional(
    { ...business },
    "crawlSuggestionsUpdatedAt",
    shiftOptional(business.crawlSuggestionsUpdatedAt, days),
  );
}

function shiftActivity(entry: ActivityEntry, days: number): ActivityEntry {
  return { ...entry, at: shiftDate(entry.at, days) };
}

function shiftWorkerProfile(
  profile: WorkerProfile,
  days: number,
): WorkerProfile {
  let result: WorkerProfile = { ...profile };
  result = withOptional(
    result,
    "availableFrom",
    shiftOptional(profile.availableFrom, days),
  );
  result = withOptional(
    result,
    "navReferral",
    profile.navReferral === undefined
      ? undefined
      : {
          ...profile.navReferral,
          referredAt: shiftDate(profile.navReferral.referredAt, days),
        },
  );
  result = withOptional(
    result,
    "eligibleSince",
    shiftOptional(profile.eligibleSince, days),
  );
  result = withOptional(
    result,
    "lastShortlistedAt",
    shiftOptional(profile.lastShortlistedAt, days),
  );
  return result;
}

function shiftShortlistEntry(
  entry: ShortlistEntry,
  days: number,
): ShortlistEntry {
  let result: ShortlistEntry = {
    ...entry,
    addedAt: shiftDate(entry.addedAt, days),
  };
  result = withOptional(
    result,
    "interviewInvitedAt",
    shiftOptional(entry.interviewInvitedAt, days),
  );
  result = withOptional(
    result,
    "offeredAt",
    shiftOptional(entry.offeredAt, days),
  );
  return result;
}

function shiftLogEvent(event: LogEvent, days: number): LogEvent {
  return { ...event, at: shiftDate(event.at, days) };
}

function shiftRequest(request: TaskRequest, days: number): TaskRequest {
  let result: TaskRequest = {
    ...request,
    desiredStartDate: shiftDate(request.desiredStartDate, days),
    createdAt: shiftDate(request.createdAt, days),
    shortlist: request.shortlist.map((entry) =>
      shiftShortlistEntry(entry, days),
    ),
    excludedWorkerIds: request.excludedWorkerIds.map((excluded) => ({
      ...excluded,
      at: shiftDate(excluded.at, days),
    })),
    log: request.log.map((event) => shiftLogEvent(event, days)),
  };
  result = withOptional(
    result,
    "agreement",
    request.agreement === undefined
      ? undefined
      : {
          ...request.agreement,
          ownerAgreedAt: shiftDate(request.agreement.ownerAgreedAt, days),
          workerAgreedAt: shiftDate(request.agreement.workerAgreedAt, days),
        },
  );
  result = withOptional(
    result,
    "actualStartDate",
    shiftOptional(request.actualStartDate, days),
  );
  result = withOptional(
    result,
    "rejection",
    request.rejection === undefined
      ? undefined
      : { ...request.rejection, at: shiftDate(request.rejection.at, days) },
  );
  result = withOptional(
    result,
    "cancellation",
    request.cancellation === undefined
      ? undefined
      : {
          ...request.cancellation,
          at: shiftDate(request.cancellation.at, days),
        },
  );
  return result;
}

function shiftMessage(message: Message, days: number): Message {
  return { ...message, at: shiftDate(message.at, days) };
}

function shiftConversation(
  conversation: Conversation,
  days: number,
): Conversation {
  return {
    ...conversation,
    messages: conversation.messages.map((message) =>
      shiftMessage(message, days),
    ),
  };
}

function shiftCrawlRun(run: CrawlRun, days: number): CrawlRun {
  return { ...run, at: shiftDate(run.at, days) };
}

function shiftQuestion(question: Question, days: number): Question {
  return withOptional(
    { ...question, createdAt: shiftDate(question.createdAt, days) },
    "editedAt",
    shiftOptional(question.editedAt, days),
  );
}

function shiftAnswer(answer: Answer, days: number): Answer {
  return withOptional(
    { ...answer, createdAt: shiftDate(answer.createdAt, days) },
    "editedAt",
    shiftOptional(answer.editedAt, days),
  );
}

function shiftFlag(flag: Flag, days: number): Flag {
  return { ...flag, at: shiftDate(flag.at, days) };
}

function shiftReview(review: Review, days: number): Review {
  return withOptional(
    { ...review, openedAt: shiftDate(review.openedAt, days) },
    "reviewedAt",
    shiftOptional(review.reviewedAt, days),
  );
}

function shiftKnowledgeBase(
  knowledgeBase: KnowledgeBaseState,
  days: number,
): KnowledgeBaseState {
  return {
    topics: knowledgeBase.topics.map((topic) => ({ ...topic })),
    questions: knowledgeBase.questions.map((question) =>
      shiftQuestion(question, days),
    ),
    answers: knowledgeBase.answers.map((answer) => shiftAnswer(answer, days)),
    flags: knowledgeBase.flags.map((flag) => shiftFlag(flag, days)),
    reviews: knowledgeBase.reviews.map((review) => shiftReview(review, days)),
    chatbotQuestions: knowledgeBase.chatbotQuestions.map((question) => ({
      ...question,
    })),
    nearDuplicateExamples: knowledgeBase.nearDuplicateExamples.map(
      (example) => ({ ...example }),
    ),
  };
}

export function shiftSeedDates(seed: SeedFile, days: number): SeedFile {
  return {
    format: seed.format,
    seedId: seed.seedId,
    anchorDate: shiftDate(seed.anchorDate, days),
    frame: {
      people: seed.frame.people.map((person) => ({ ...person })),
      businesses: seed.frame.businesses.map((business) =>
        shiftBusiness(business, days),
      ),
      skills: seed.frame.skills.map((skill) => ({ ...skill })),
      activity: seed.frame.activity.map((entry) => shiftActivity(entry, days)),
    },
    marketplace: {
      workerProfiles: seed.marketplace.workerProfiles.map((profile) =>
        shiftWorkerProfile(profile, days),
      ),
      requests: seed.marketplace.requests.map((request) =>
        shiftRequest(request, days),
      ),
      conversations: seed.marketplace.conversations.map((conversation) =>
        shiftConversation(conversation, days),
      ),
      crawlCatalog: seed.marketplace.crawlCatalog.map((entry) => ({
        ...entry,
        rounds: entry.rounds.map((round) => [...round]),
      })),
      crawlRuns: seed.marketplace.crawlRuns.map((run) =>
        shiftCrawlRun(run, days),
      ),
    },
    knowledgeBase: shiftKnowledgeBase(seed.knowledgeBase, days),
  };
}

export function loadSeedState(today: Date): DemoState {
  const shifted = shiftSeedDates(
    bundledSeed,
    daysBetween(bundledSeed.anchorDate, today),
  );
  return {
    meta: {
      seedId: shifted.seedId,
      anchorDate: shifted.anchorDate,
      loadedAt: today.toISOString(),
    },
    frame: shifted.frame,
    marketplace: shifted.marketplace,
    knowledgeBase: shifted.knowledgeBase,
  };
}
