import { personById } from "./people";
import type {
  ActivityEntry,
  CommandContext,
  CommandError,
  CommandErrorCode,
  CommandResult,
  DemoState,
  Notice,
  Person,
} from "./types";

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

export function omitKey<T extends object, K extends keyof T>(
  value: T,
  key: K,
): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(value).filter(([name]) => name !== key),
  ) as Omit<T, K>;
}

export function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
