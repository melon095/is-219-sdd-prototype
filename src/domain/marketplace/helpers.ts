import { personById } from "../frame/people";
import type {
  ActivityEntry,
  CommandContext,
  CommandError,
  CommandErrorCode,
  CommandResult,
  DemoState,
  Id,
  Notice,
  Person,
} from "../frame/types";
import type { LogEvent, ShortlistEntry, TaskRequest } from "./types";

export const maxShortlistSize = 3;

export const workersGroup = "marketplace.workers";

export function fail(
  code: CommandErrorCode,
  message: string,
  fieldErrors?: Record<string, string>,
): CommandResult {
  return {
    ok: false,
    error:
      fieldErrors === undefined
        ? { code, message }
        : { code, message, fieldErrors },
  };
}

export function failWith(error: CommandError): CommandResult {
  return fail(error.code, error.message, error.fieldErrors);
}

export function validationFailure(
  errors: Record<string, string>,
): CommandResult {
  return fail(
    "validation",
    "Sjekk feltene som er merket, og prøv igjen.",
    errors,
  );
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !datePattern.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function actorOf(state: DemoState, context: CommandContext): Person {
  return (
    personById(context.actorId, state) ?? {
      id: context.actorId,
      name: "",
      isVaroddAdmin: false,
      seeksWork: false,
      description: "",
    }
  );
}

export function succeed(
  state: DemoState,
  notices: Notice[] = [],
): CommandResult {
  return { ok: true, state, notices };
}

export function findRequest(
  state: DemoState,
  requestId: Id,
): TaskRequest | undefined {
  return state.marketplace.requests.find((item) => item.id === requestId);
}

export function ownerIdOf(
  state: DemoState,
  request: TaskRequest,
): Id | undefined {
  return state.frame.businesses.find(
    (business) => business.id === request.businessId,
  )?.ownerId;
}

export function businessNameOf(state: DemoState, request: TaskRequest): string {
  return (
    state.frame.businesses.find(
      (business) => business.id === request.businessId,
    )?.name ?? "Bedriften"
  );
}

export function replaceRequest(
  state: DemoState,
  request: TaskRequest,
): DemoState {
  return {
    ...state,
    marketplace: {
      ...state.marketplace,
      requests: state.marketplace.requests.map((item) =>
        item.id === request.id ? request : item,
      ),
    },
  };
}

export function addActivity(
  state: DemoState,
  entries: ActivityEntry[],
): DemoState {
  if (entries.length === 0) {
    return state;
  }
  return {
    ...state,
    frame: { ...state.frame, activity: [...state.frame.activity, ...entries] },
  };
}

export function appendLog(
  request: TaskRequest,
  events: LogEvent[],
): TaskRequest {
  return { ...request, log: [...request.log, ...events] };
}

export function liveEntry(
  request: TaskRequest,
  workerId: Id,
): ShortlistEntry | undefined {
  return request.shortlist.find(
    (item) => item.workerId === workerId && item.state !== "removed",
  );
}

export function omitKey<T extends object, K extends keyof T>(
  value: T,
  key: K,
): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(value).filter(([name]) => name !== key),
  ) as Omit<T, K>;
}

export function byCreatedAt(a: TaskRequest, b: TaskRequest): number {
  const difference = Date.parse(a.createdAt) - Date.parse(b.createdAt);
  if (difference !== 0) {
    return difference;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
