import type {
  ActivityEntry,
  Business,
  CommandContext,
  DemoState,
  Person,
  Skill,
} from "../frame/types";
import type {
  Conversation,
  ShortlistEntry,
  TaskRequest,
  WorkerProfile,
} from "./types";

export const ids = {
  owner1: "person-1",
  employee1: "person-2",
  owner2: "person-3",
  mats: "person-8",
  amina: "person-9",
  henrik: "person-10",
  lena: "person-11",
  omar: "person-12",
  thea: "person-13",
  admin: "person-15",
};

function person(id: string, name: string, overrides: Partial<Person> = {}) {
  return {
    id,
    name,
    isVaroddAdmin: false,
    seeksWork: false,
    description: "",
    ...overrides,
  };
}

export const testPeople: Person[] = [
  person(ids.owner1, "Kari Nordmann"),
  person(ids.employee1, "Jonas Berg"),
  person(ids.owner2, "Per Hansen"),
  person(ids.mats, "Mats Johansen", { seeksWork: true }),
  person(ids.amina, "Amina Yusuf", { seeksWork: true }),
  person(ids.henrik, "Henrik Larsen", { seeksWork: true }),
  person(ids.lena, "Lena Eriksen", { seeksWork: true }),
  person(ids.omar, "Omar Ali", { seeksWork: true }),
  person(ids.thea, "Thea Bakke", { seeksWork: true }),
  person(ids.admin, "Marte Vik", { isVaroddAdmin: true }),
];

export const testBusinesses: Business[] = [
  {
    id: "bedrift-1",
    name: "Fjordlys Keramikk",
    description: "Keramikk",
    ownerId: ids.owner1,
    employeeIds: [ids.employee1],
    isEWavesMember: true,
    crawlOptIn: true,
    crawlSuggestions: [],
  },
  {
    id: "bedrift-2",
    name: "Sørlandet Honning",
    description: "Honning",
    ownerId: ids.owner2,
    employeeIds: [],
    isEWavesMember: false,
    crawlOptIn: false,
    crawlSuggestions: [],
  },
];

export const testSkills: Skill[] = [
  { id: "ferdighet-1", name: "Produktfotografering" },
  { id: "ferdighet-2", name: "Shopify-oppsett" },
  { id: "ferdighet-3", name: "Søkemotoroptimalisering" },
  { id: "ferdighet-4", name: "Regnskap" },
  { id: "ferdighet-5", name: "Innholdsproduksjon" },
  { id: "ferdighet-6", name: "Sosiale medier" },
];

export function worker(
  personId: string,
  overrides: Partial<WorkerProfile> = {},
): WorkerProfile {
  return {
    personId,
    skillIds: ["ferdighet-1", "ferdighet-2"],
    experienceLevel: "mid",
    availableFrom: "2026-11-20",
    isDraft: false,
    eligibleSince: "2026-10-01T09:00:00+01:00",
    ...overrides,
  };
}

export function request(
  id: string,
  overrides: Partial<TaskRequest> = {},
): TaskRequest {
  return {
    id,
    businessId: "bedrift-1",
    title: "Hjelp med nettbutikken",
    description: "Vi trenger hjelp.",
    requiredSkillIds: ["ferdighet-1", "ferdighet-2"],
    acceptedSuggestionIds: [],
    desiredStartDate: "2026-12-01",
    estimatedDuration: { amount: 6, unit: "weeks" },
    hoursPerWeek: 10,
    workLocation: "remote",
    status: "open",
    createdAt: "2026-11-01T09:00:00+01:00",
    shortlist: [],
    excludedWorkerIds: [],
    log: [],
    ...overrides,
  };
}

export function entry(
  workerId: string,
  overrides: Partial<ShortlistEntry> = {},
): ShortlistEntry {
  return {
    workerId,
    rank: 1,
    addedAt: "2026-11-02T09:00:00+01:00",
    matchedSkillIds: ["ferdighet-1", "ferdighet-2"],
    missingSkillIds: [],
    state: "active",
    ...overrides,
  };
}

export function conversation(
  id: string,
  requestId: string,
  workerId: string,
  overrides: Partial<Conversation> = {},
): Conversation {
  return {
    id,
    requestId,
    ownerId: ids.owner1,
    workerId,
    messages: [],
    ...overrides,
  };
}

export type StateOptions = {
  workers?: WorkerProfile[];
  requests?: TaskRequest[];
  conversations?: Conversation[];
  activity?: ActivityEntry[];
};

export function createState(options: StateOptions = {}): DemoState {
  return {
    meta: {
      seedId: "test",
      anchorDate: "2026-11-16",
      loadedAt: "2026-11-16T08:00:00+01:00",
    },
    frame: {
      people: testPeople,
      businesses: testBusinesses,
      skills: testSkills,
      activity: options.activity ?? [],
    },
    marketplace: {
      workerProfiles: options.workers ?? [],
      requests: options.requests ?? [],
      conversations: options.conversations ?? [],
      crawlCatalog: [],
      crawlRuns: [],
    },
  };
}

export function createContext(
  actorId: string,
  now = "2026-11-16T10:00:00+01:00",
  prefix = "ny",
): CommandContext {
  let counter = 0;
  return {
    actorId,
    now,
    newId: () => {
      counter += 1;
      return `${prefix}-${counter}`;
    },
  };
}

export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

export function requestIn(
  state: DemoState,
  requestId: string,
): TaskRequest | undefined {
  return state.marketplace.requests.find((item) => item.id === requestId);
}
