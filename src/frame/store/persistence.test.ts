import { describe, expect, it } from "vitest";
import type { DemoState } from "../../domain/frame/types";
import { marketplaceStateSchema } from "../../features/marketplace/schema";
import {
  loadState,
  loadUser,
  STATE_KEY,
  type StorageLike,
  saveState,
  saveUser,
  USER_KEY,
} from "./persistence";
import { buildStoredStateSchema } from "./schema";
import { bundledSeedId, loadSeedState } from "./seed";

const storedStateSchema = buildStoredStateSchema({
  marketplace: marketplaceStateSchema,
});

const today = new Date(2026, 10, 20, 9, 0);

function memoryStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Map<string, string>;
} {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

function throwingStorage(): StorageLike {
  return {
    getItem: () => {
      throw new Error("Ingen lagring");
    },
    setItem: () => {
      throw new Error("Ingen lagring");
    },
  };
}

function changedState(): DemoState {
  const state = loadSeedState(today);
  return {
    ...state,
    frame: {
      ...state.frame,
      skills: [...state.frame.skills, { id: "ferdighet-99", name: "Testing" }],
    },
  };
}

function loadOptions(storage: StorageLike) {
  return {
    storage,
    storedStateSchema,
    loadSeed: () => loadSeedState(today),
  };
}

describe("keys", () => {
  it("uses the agreed storage keys", () => {
    expect(STATE_KEY).toBe("varodd-prototype:state");
    expect(USER_KEY).toBe("varodd-prototype:user");
  });
});

describe("loadState", () => {
  it("returns a valid stored state", () => {
    const stored = changedState();
    const storage = memoryStorage({
      [STATE_KEY]: JSON.stringify({
        format: 1,
        seedId: bundledSeedId,
        state: stored,
      }),
    });
    const result = loadState(loadOptions(storage));
    expect(result.storageAvailable).toBe(true);
    expect(result.state).toEqual(stored);
  });

  it("falls back to the seed and saves it when nothing is stored", () => {
    const storage = memoryStorage();
    const result = loadState(loadOptions(storage));
    expect(result.storageAvailable).toBe(true);
    expect(result.state).toEqual(loadSeedState(today));
    expect(JSON.parse(storage.data.get(STATE_KEY) ?? "null")).toEqual({
      format: 1,
      seedId: bundledSeedId,
      state: loadSeedState(today),
    });
  });

  it("falls back to the seed when the stored value cannot be parsed", () => {
    const storage = memoryStorage({ [STATE_KEY]: "{ikke json" });
    const result = loadState(loadOptions(storage));
    expect(result.state).toEqual(loadSeedState(today));
    expect(storage.data.get(STATE_KEY)).toContain(bundledSeedId);
  });

  it("falls back to the seed when the stored value fails the schema", () => {
    const stored = changedState();
    const broken = {
      format: 1,
      seedId: bundledSeedId,
      state: { ...stored, frame: { ...stored.frame, people: "ingen" } },
    };
    const storage = memoryStorage({ [STATE_KEY]: JSON.stringify(broken) });
    expect(loadState(loadOptions(storage)).state).toEqual(loadSeedState(today));
  });

  it("falls back to the seed when the format is different", () => {
    const storage = memoryStorage({
      [STATE_KEY]: JSON.stringify({
        format: 2,
        seedId: bundledSeedId,
        state: changedState(),
      }),
    });
    expect(loadState(loadOptions(storage)).state).toEqual(loadSeedState(today));
  });

  it("falls back to the seed when the seedId is not the bundled one", () => {
    const storage = memoryStorage({
      [STATE_KEY]: JSON.stringify({
        format: 1,
        seedId: "et-annet-frø",
        state: changedState(),
      }),
    });
    expect(loadState(loadOptions(storage)).state).toEqual(loadSeedState(today));
  });

  it("reports storageAvailable false and still returns the seed when storage throws", () => {
    const result = loadState(loadOptions(throwingStorage()));
    expect(result.storageAvailable).toBe(false);
    expect(result.state).toEqual(loadSeedState(today));
  });
});

describe("loadUser", () => {
  const state = loadSeedState(today);

  it("returns the stored person when it exists in the state", () => {
    const storage = memoryStorage({ [USER_KEY]: JSON.stringify("person-8") });
    expect(loadUser(storage, state)).toEqual({
      userId: "person-8",
      storageAvailable: true,
    });
  });

  it("returns the first business owner when nothing is stored", () => {
    const result = loadUser(memoryStorage(), state);
    expect(result.userId).toBe(state.frame.businesses[0]?.ownerId);
    expect(result.storageAvailable).toBe(true);
  });

  it("returns the first business owner when the stored person is unknown", () => {
    const storage = memoryStorage({ [USER_KEY]: JSON.stringify("person-999") });
    expect(loadUser(storage, state).userId).toBe(
      state.frame.businesses[0]?.ownerId,
    );
  });

  it("returns the first business owner when the stored value is not JSON", () => {
    const storage = memoryStorage({ [USER_KEY]: "person-8" });
    expect(loadUser(storage, state).userId).toBe(
      state.frame.businesses[0]?.ownerId,
    );
  });

  it("reports storageAvailable false when storage throws", () => {
    expect(loadUser(throwingStorage(), state)).toEqual({
      userId: state.frame.businesses[0]?.ownerId,
      storageAvailable: false,
    });
  });
});

describe("saveState", () => {
  it("writes the stored shape as JSON", () => {
    const storage = memoryStorage();
    const state = changedState();
    expect(saveState(storage, state)).toEqual({ storageAvailable: true });
    expect(JSON.parse(storage.data.get(STATE_KEY) ?? "null")).toEqual({
      format: 1,
      seedId: state.meta.seedId,
      state,
    });
  });

  it("never throws", () => {
    expect(saveState(throwingStorage(), changedState())).toEqual({
      storageAvailable: false,
    });
  });
});

describe("saveUser", () => {
  it("writes the person id as a JSON string", () => {
    const storage = memoryStorage();
    expect(saveUser(storage, "person-3")).toEqual({ storageAvailable: true });
    expect(storage.data.get(USER_KEY)).toBe('"person-3"');
  });

  it("never throws", () => {
    expect(saveUser(throwingStorage(), "person-3")).toEqual({
      storageAvailable: false,
    });
  });
});
