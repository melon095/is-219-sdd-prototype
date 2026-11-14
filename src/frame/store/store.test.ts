import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApplyCommand } from "../../domain/frame/commands";
import type {
  CommandResult,
  DemoState,
  SystemStep,
} from "../../domain/frame/types";
import { knowledgeBaseStateSchema } from "../../features/knowledge-base/schema";
import { marketplaceStateSchema } from "../../features/marketplace/schema";
import { STATE_KEY, type StorageLike, USER_KEY } from "./persistence";
import { buildStoredStateSchema } from "./schema";
import { bundledSeedId, loadSeedState } from "./seed";
import {
  createStore,
  StoreProvider,
  useDemoState,
  useDispatch,
  useSelectedUserId,
  useStorageAvailable,
} from "./store";

const storedStateSchema = buildStoredStateSchema({
  marketplace: marketplaceStateSchema,
  knowledgeBase: knowledgeBaseStateSchema,
});

const nowValue = "2026-11-20T09:00:00.000Z";
const now = () => nowValue;
const newId = () => "ny-id";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const setItem = vi.fn((key: string, value: string) => {
    data.set(key, value);
  });
  const storage: StorageLike & {
    data: Map<string, string>;
    setItem: typeof setItem;
  } = {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem,
  };
  return storage;
}

function withSkill(state: DemoState, id: string): DemoState {
  return {
    ...state,
    frame: {
      ...state.frame,
      skills: [...state.frame.skills, { id, name: `Ferdighet ${id}` }],
    },
  };
}

function storedJson(state: DemoState): string {
  return JSON.stringify({ format: 1, seedId: bundledSeedId, state });
}

const seedState = loadSeedState(new Date(nowValue));

const succeed: ApplyCommand = (state, command) => ({
  ok: true,
  state: withSkill(state, String(command.id)),
  notices: [],
});

const fail: ApplyCommand = () => ({
  ok: false,
  error: { code: "validation", message: "Nei." },
});

function makeStore(
  overrides: Partial<Parameters<typeof createStore>[0]> = {},
  storage = memoryStorage(),
) {
  const store = createStore({
    applyCommand: succeed,
    systemSteps: [],
    now,
    newId,
    storage,
    storedStateSchema,
    ...overrides,
  });
  return { store, storage };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("createStore on creation", () => {
  it("loads the stored state and selected user", () => {
    const stored = withSkill(seedState, "lagret");
    const storage = memoryStorage({
      [STATE_KEY]: storedJson(stored),
      [USER_KEY]: JSON.stringify("person-8"),
    });
    const { store } = makeStore({}, storage);
    expect(store.getState()).toEqual(stored);
    expect(store.getSelectedUserId()).toBe("person-8");
    expect(store.getStorageAvailable()).toBe(true);
  });

  it("falls back to the seed and the first owner when nothing is stored", () => {
    const { store } = makeStore();
    expect(store.getState()).toEqual(seedState);
    expect(store.getSelectedUserId()).toBe(
      seedState.frame.businesses[0]?.ownerId,
    );
  });

  it("runs the system steps with now() and saves when they change something", () => {
    const step = vi.fn<SystemStep>((state, at) => ({
      ...state,
      meta: { ...state.meta, loadedAt: `${at.slice(0, 19)}+00:00` },
    }));
    const storage = memoryStorage({ [STATE_KEY]: storedJson(seedState) });
    const { store } = makeStore({ systemSteps: [step] }, storage);
    expect(step).toHaveBeenCalledWith(seedState, nowValue);
    expect(store.getState().meta.loadedAt).toBe("2026-11-20T09:00:00+00:00");
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.data.get(STATE_KEY)).toBe(storedJson(store.getState()));
  });

  it("does not save when the system steps change nothing", () => {
    const step: SystemStep = (state) => state;
    const storage = memoryStorage({ [STATE_KEY]: storedJson(seedState) });
    makeStore({ systemSteps: [step] }, storage);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("reports when storage is not available", () => {
    const broken = memoryStorage();
    broken.getItem = () => {
      throw new Error("Ingen lagring");
    };
    broken.setItem.mockImplementation(() => {
      throw new Error("Ingen lagring");
    });
    const { store } = makeStore({}, broken);
    expect(store.getStorageAvailable()).toBe(false);
    expect(store.getState()).toEqual(seedState);
  });
});

describe("dispatch", () => {
  it("calls applyCommand with the selected user, now, and newId", () => {
    const apply = vi.fn<ApplyCommand>(succeed);
    const { store } = makeStore({ applyCommand: apply });
    store.selectUser("person-3");
    store.dispatch({ type: "leggTil", id: "x" });
    expect(apply).toHaveBeenCalledWith(
      seedState,
      { type: "leggTil", id: "x" },
      { actorId: "person-3", now: nowValue, newId },
    );
  });

  it("stores the new state, saves it, notifies, and returns the result", () => {
    const { store, storage } = makeStore();
    const listener = vi.fn();
    store.subscribe(listener);
    storage.setItem.mockClear();
    const result = store.dispatch({ type: "leggTil", id: "x" });
    expect(result.ok).toBe(true);
    expect(store.getState()).toEqual(withSkill(seedState, "x"));
    expect(storage.data.get(STATE_KEY)).toBe(storedJson(store.getState()));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("neither saves nor notifies on failure, and returns the failure", () => {
    const { store, storage } = makeStore({ applyCommand: fail });
    const listener = vi.fn();
    store.subscribe(listener);
    storage.setItem.mockClear();
    const result: CommandResult = store.dispatch({ type: "leggTil" });
    expect(result).toEqual({
      ok: false,
      error: { code: "validation", message: "Nei." },
    });
    expect(store.getState()).toEqual(seedState);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it("runs the system steps through applyCommand, not separately", () => {
    const step = vi.fn<SystemStep>((state) => state);
    const apply = vi.fn<ApplyCommand>(succeed);
    const { store } = makeStore({ applyCommand: apply, systemSteps: [step] });
    step.mockClear();
    store.dispatch({ type: "leggTil", id: "x" });
    expect(step).not.toHaveBeenCalled();
    expect(apply).toHaveBeenCalledTimes(1);
  });
});

describe("selectUser", () => {
  it("saves the user and notifies", () => {
    const { store, storage } = makeStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.selectUser("person-15");
    expect(store.getSelectedUserId()).toBe("person-15");
    expect(storage.data.get(USER_KEY)).toBe('"person-15"');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("lets a subscriber unsubscribe", () => {
    const { store } = makeStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.selectUser("person-15");
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("reset", () => {
  it("loads fresh seed data, saves it, and keeps the selected user", () => {
    const { store, storage } = makeStore();
    store.selectUser("person-8");
    store.dispatch({ type: "leggTil", id: "x" });
    expect(store.getState()).not.toEqual(seedState);
    const listener = vi.fn();
    store.subscribe(listener);
    store.reset();
    expect(store.getState()).toEqual(seedState);
    expect(store.getSelectedUserId()).toBe("person-8");
    expect(storage.data.get(STATE_KEY)).toBe(storedJson(seedState));
    expect(storage.data.get(USER_KEY)).toBe('"person-8"');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("storage events", () => {
  it("reloads the state when another tab changes it", () => {
    const { store, storage } = makeStore();
    const listener = vi.fn();
    store.subscribe(listener);
    const fromOtherTab = withSkill(seedState, "annen-fane");
    storage.data.set(STATE_KEY, storedJson(fromOtherTab));
    window.dispatchEvent(new StorageEvent("storage", { key: STATE_KEY }));
    expect(store.getState()).toEqual(fromOtherTab);
    expect(listener).toHaveBeenCalled();
  });

  it("reloads the user when another tab changes it", () => {
    const { store, storage } = makeStore();
    storage.data.set(USER_KEY, JSON.stringify("person-10"));
    window.dispatchEvent(new StorageEvent("storage", { key: USER_KEY }));
    expect(store.getSelectedUserId()).toBe("person-10");
  });

  it("ignores other keys", () => {
    const { store, storage } = makeStore();
    const listener = vi.fn();
    store.subscribe(listener);
    storage.data.set(STATE_KEY, storedJson(withSkill(seedState, "annen")));
    window.dispatchEvent(new StorageEvent("storage", { key: "noe-annet" }));
    expect(store.getState()).toEqual(seedState);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("clock", () => {
  it("runs the system steps every 60 000 ms until stopped", () => {
    vi.useFakeTimers();
    let ticks = 0;
    const step: SystemStep = (state) => {
      ticks += 1;
      return withSkill(state, `tikk-${ticks}`);
    };
    const { store, storage } = makeStore({ systemSteps: [step] });
    const listener = vi.fn();
    store.subscribe(listener);
    const ticksAfterLoad = ticks;
    storage.setItem.mockClear();
    store.startClock();
    vi.advanceTimersByTime(59_999);
    expect(ticks).toBe(ticksAfterLoad);
    vi.advanceTimersByTime(1);
    expect(ticks).toBe(ticksAfterLoad + 1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    expect(ticks).toBe(ticksAfterLoad + 2);
    store.stopClock();
    vi.advanceTimersByTime(180_000);
    expect(ticks).toBe(ticksAfterLoad + 2);
  });

  it("does not notify when a tick changes nothing", () => {
    vi.useFakeTimers();
    const { store } = makeStore({ systemSteps: [(state) => state] });
    const listener = vi.fn();
    store.subscribe(listener);
    store.startClock();
    vi.advanceTimersByTime(120_000);
    expect(listener).not.toHaveBeenCalled();
    store.stopClock();
  });
});

describe("React hooks", () => {
  function wrapperFor(store: ReturnType<typeof createStore>) {
    return ({ children }: { children: ReactNode }) =>
      createElement(StoreProvider, { store }, children);
  }

  it("expose the state, the user, dispatch, and storage availability", () => {
    const { store } = makeStore();
    const { result } = renderHook(
      () => ({
        state: useDemoState(),
        userId: useSelectedUserId(),
        dispatch: useDispatch(),
        storageAvailable: useStorageAvailable(),
      }),
      { wrapper: wrapperFor(store) },
    );
    expect(result.current.state).toEqual(seedState);
    expect(result.current.userId).toBe(seedState.frame.businesses[0]?.ownerId);
    expect(result.current.storageAvailable).toBe(true);
    act(() => {
      result.current.dispatch({ type: "leggTil", id: "hook" });
    });
    expect(result.current.state).toEqual(withSkill(seedState, "hook"));
    act(() => store.selectUser("person-9"));
    expect(result.current.userId).toBe("person-9");
  });

  it("throw a clear error outside the provider", () => {
    expect(() => renderHook(() => useDemoState())).toThrow(/StoreProvider/);
  });
});
