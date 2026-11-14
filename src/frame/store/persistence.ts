import type { ZodType } from "zod";
import type { DemoState, Id } from "../../domain/frame/types";
import { bundledSeedId } from "./seed";

export const STATE_KEY = "varodd-prototype:state";

export const USER_KEY = "varodd-prototype:user";

export const NOTICE_KEY = "varodd-prototype:notice";

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export type StoredState = {
  format: 1;
  seedId: string;
  state: DemoState;
};

export type LoadStateOptions = {
  storage: StorageLike;
  storedStateSchema: ZodType<StoredState>;
  loadSeed: () => DemoState;
};

function readItem(
  storage: StorageLike,
  key: string,
): { value: string | null; storageAvailable: boolean } {
  try {
    return { value: storage.getItem(key), storageAvailable: true };
  } catch {
    return { value: null, storageAvailable: false };
  }
}

function writeItem(
  storage: StorageLike,
  key: string,
  value: string,
): { storageAvailable: boolean } {
  try {
    storage.setItem(key, value);
    return { storageAvailable: true };
  } catch {
    return { storageAvailable: false };
  }
}

function parseJson(text: string | null): unknown {
  if (text === null) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function parseStoredState(
  text: string | null,
  schema: ZodType<StoredState>,
): DemoState | undefined {
  const parsed = schema.safeParse(parseJson(text));
  if (!parsed.success || parsed.data.seedId !== bundledSeedId) {
    return undefined;
  }
  return parsed.data.state;
}

export function saveState(
  storage: StorageLike,
  state: DemoState,
): { storageAvailable: boolean } {
  const stored: StoredState = {
    format: 1,
    seedId: state.meta.seedId,
    state,
  };
  return writeItem(storage, STATE_KEY, JSON.stringify(stored));
}

export function saveUser(
  storage: StorageLike,
  userId: Id,
): { storageAvailable: boolean } {
  return writeItem(storage, USER_KEY, JSON.stringify(userId));
}

export function saveNoticeConfirmed(storage: StorageLike): {
  storageAvailable: boolean;
} {
  return writeItem(storage, NOTICE_KEY, "true");
}

export function loadNoticeConfirmed(storage: StorageLike): boolean {
  return parseJson(readItem(storage, NOTICE_KEY).value) === true;
}

export function loadState({
  storage,
  storedStateSchema,
  loadSeed,
}: LoadStateOptions): { state: DemoState; storageAvailable: boolean } {
  const read = readItem(storage, STATE_KEY);
  const stored = parseStoredState(read.value, storedStateSchema);
  if (stored !== undefined) {
    return { state: stored, storageAvailable: read.storageAvailable };
  }
  const state = loadSeed();
  const saved = saveState(storage, state);
  return {
    state,
    storageAvailable: read.storageAvailable && saved.storageAvailable,
  };
}

export function loadUser(
  storage: StorageLike,
  state: DemoState,
): { userId: Id; storageAvailable: boolean } {
  const read = readItem(storage, USER_KEY);
  const stored = parseJson(read.value);
  const fallback = state.frame.businesses[0]?.ownerId ?? "";
  if (
    typeof stored === "string" &&
    state.frame.people.some((person) => person.id === stored)
  ) {
    return { userId: stored, storageAvailable: read.storageAvailable };
  }
  return { userId: fallback, storageAvailable: read.storageAvailable };
}
