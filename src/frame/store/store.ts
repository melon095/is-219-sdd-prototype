import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useSyncExternalStore,
} from "react";
import type { ZodType } from "zod";
import type { ApplyCommand } from "../../domain/frame/commands";
import { runSystemSteps } from "../../domain/frame/commands";
import type {
  Command,
  CommandResult,
  DemoState,
  Id,
  IsoDateTime,
  SystemStep,
} from "../../domain/frame/types";
import {
  loadState,
  loadUser,
  STATE_KEY,
  type StorageLike,
  type StoredState,
  saveState,
  saveUser,
  USER_KEY,
} from "./persistence";
import { loadSeedState } from "./seed";

export type CreateStoreOptions = {
  applyCommand: ApplyCommand;
  systemSteps: SystemStep[];
  now: () => IsoDateTime;
  newId: () => Id;
  storage: StorageLike;
  storedStateSchema: ZodType<StoredState>;
};

export type Store = {
  getState: () => DemoState;
  getSelectedUserId: () => Id;
  getStorageAvailable: () => boolean;
  subscribe: (listener: () => void) => () => void;
  dispatch: (command: Command) => CommandResult;
  selectUser: (userId: Id) => void;
  reset: () => void;
  startClock: () => void;
  stopClock: () => void;
};

const clockIntervalMs = 60_000;

export function createStore({
  applyCommand,
  systemSteps,
  now,
  newId,
  storage,
  storedStateSchema,
}: CreateStoreOptions): Store {
  const listeners = new Set<() => void>();
  let state: DemoState;
  let selectedUserId: Id;
  let storageAvailable = true;
  let clock: ReturnType<typeof setInterval> | undefined;

  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  function noteStorage(result: { storageAvailable: boolean }) {
    storageAvailable = storageAvailable && result.storageAvailable;
  }

  function freshSeed(): DemoState {
    return loadSeedState(new Date(now()));
  }

  function applySystemSteps(): boolean {
    const next = runSystemSteps(state, systemSteps, now());
    if (next === state) {
      return false;
    }
    state = next;
    noteStorage(saveState(storage, state));
    return true;
  }

  function loadFromStorage() {
    const loaded = loadState({
      storage,
      storedStateSchema,
      loadSeed: freshSeed,
    });
    state = loaded.state;
    noteStorage(loaded);
    const user = loadUser(storage, state);
    selectedUserId = user.userId;
    noteStorage(user);
  }

  loadFromStorage();
  applySystemSteps();

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (event.key === STATE_KEY || event.key === USER_KEY) {
        loadFromStorage();
        notify();
      }
    });
  }

  return {
    getState: () => state,
    getSelectedUserId: () => selectedUserId,
    getStorageAvailable: () => storageAvailable,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch: (command) => {
      const result = applyCommand(state, command, {
        actorId: selectedUserId,
        now: now(),
        newId,
      });
      if (result.ok) {
        state = result.state;
        noteStorage(saveState(storage, state));
        notify();
      }
      return result;
    },
    selectUser: (userId) => {
      selectedUserId = userId;
      noteStorage(saveUser(storage, userId));
      notify();
    },
    reset: () => {
      state = freshSeed();
      noteStorage(saveState(storage, state));
      notify();
    },
    startClock: () => {
      if (clock !== undefined) {
        return;
      }
      clock = setInterval(() => {
        if (applySystemSteps()) {
          notify();
        }
      }, clockIntervalMs);
    },
    stopClock: () => {
      if (clock !== undefined) {
        clearInterval(clock);
        clock = undefined;
      }
    },
  };
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({
  store,
  children,
}: {
  store: Store;
  children?: ReactNode;
}) {
  return createElement(StoreContext.Provider, { value: store }, children);
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (store === null) {
    throw new Error("useStore må brukes innenfor en StoreProvider.");
  }
  return store;
}

export function useDemoState(): DemoState {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

export function useSelectedUserId(): Id {
  const store = useStore();
  return useSyncExternalStore(
    store.subscribe,
    store.getSelectedUserId,
    store.getSelectedUserId,
  );
}

export function useStorageAvailable(): boolean {
  const store = useStore();
  return useSyncExternalStore(
    store.subscribe,
    store.getStorageAvailable,
    store.getStorageAvailable,
  );
}

export function useDispatch(): Store["dispatch"] {
  return useStore().dispatch;
}
