import { describe, expect, it, vi } from "vitest";
import { createApplyCommand } from "./commands";
import type {
  CommandContext,
  CommandHandler,
  DemoState,
  SystemStep,
} from "./types";

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

function baseState(): DemoState {
  return {
    meta: {
      seedId: "seed",
      anchorDate: "2026-11-16",
      loadedAt: "2026-11-16T08:00:00+01:00",
    },
    frame: {
      people: [
        {
          id: "person-1",
          name: "Kari Nordmann",
          isVaroddAdmin: false,
          seeksWork: false,
          description: "",
        },
      ],
      businesses: [],
      skills: [],
      activity: [],
    },
    marketplace: {
      workerProfiles: [],
      requests: [],
      conversations: [],
      crawlCatalog: [],
      crawlRuns: [],
    },
  };
}

const context: CommandContext = {
  actorId: "person-1",
  now: "2026-11-16T12:00:00+01:00",
  newId: () => "id-1",
};

const addSkill: CommandHandler = (state, command) => ({
  ok: true,
  state: {
    ...state,
    frame: {
      ...state.frame,
      skills: [
        ...state.frame.skills,
        { id: String(command.id), name: String(command.name) },
      ],
    },
  },
  notices: [],
});

const alwaysFails: CommandHandler = () => ({
  ok: false,
  error: { code: "validation", message: "Noe mangler." },
});

const stampLoadedAt: SystemStep = (state, now) =>
  state.meta.loadedAt === now
    ? state
    : { ...state, meta: { ...state.meta, loadedAt: now } };

describe("createApplyCommand", () => {
  it("runs every system step with context.now before the handler", () => {
    const seen: string[] = [];
    const stepA: SystemStep = (state, now) => {
      seen.push(`a:${now}`);
      return state;
    };
    const stepB: SystemStep = (state, now) => {
      seen.push(`b:${now}`);
      return state;
    };
    const handler: CommandHandler = (state) => {
      seen.push("handler");
      return { ok: true, state, notices: [] };
    };
    const apply = createApplyCommand({
      handlers: { noop: handler },
      systemSteps: [stepA, stepB],
    });
    apply(deepFreeze(baseState()), { type: "noop" }, context);
    expect(seen).toEqual([
      "a:2026-11-16T12:00:00+01:00",
      "b:2026-11-16T12:00:00+01:00",
      "handler",
    ]);
  });

  it("hands the state returned by the system steps to the handler", () => {
    const apply = createApplyCommand({
      handlers: { addSkill },
      systemSteps: [stampLoadedAt],
    });
    const result = apply(
      deepFreeze(baseState()),
      { type: "addSkill", id: "ferdighet-1", name: "Regnskap" },
      context,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.meta.loadedAt).toBe("2026-11-16T12:00:00+01:00");
      expect(result.state.frame.skills).toEqual([
        { id: "ferdighet-1", name: "Regnskap" },
      ]);
    }
  });

  it("dispatches on command.type", () => {
    const first = vi.fn<CommandHandler>((state) => ({
      ok: true,
      state,
      notices: [],
    }));
    const second = vi.fn<CommandHandler>((state) => ({
      ok: true,
      state,
      notices: [],
    }));
    const apply = createApplyCommand({
      handlers: { first, second },
      systemSteps: [],
    });
    apply(deepFreeze(baseState()), { type: "second" }, context);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("returns not-found for an unknown command type", () => {
    const apply = createApplyCommand({ handlers: {}, systemSteps: [] });
    const result = apply(deepFreeze(baseState()), { type: "ukjent" }, context);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-found");
      expect(result.error.message).toMatch(/ukjent/);
    }
  });

  it("returns not-allowed when the actor is not a person in the state", () => {
    const handler = vi.fn<CommandHandler>((state) => ({
      ok: true,
      state,
      notices: [],
    }));
    const apply = createApplyCommand({
      handlers: { noop: handler },
      systemSteps: [],
    });
    const result = apply(
      deepFreeze(baseState()),
      { type: "noop" },
      { ...context, actorId: "person-99" },
    );
    expect(result).toEqual({
      ok: false,
      error: { code: "not-allowed", message: expect.any(String) },
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("passes a failed handler result through and leaves the state as it was", () => {
    const state = deepFreeze(baseState());
    const before = JSON.stringify(state);
    const apply = createApplyCommand({
      handlers: { fail: alwaysFails },
      systemSteps: [stampLoadedAt],
    });
    const result = apply(state, { type: "fail" }, context);
    expect(result).toEqual({
      ok: false,
      error: { code: "validation", message: "Noe mangler." },
    });
    expect(JSON.stringify(state)).toBe(before);
  });

  it("never mutates the input state on success", () => {
    const state = deepFreeze(baseState());
    const before = JSON.stringify(state);
    const apply = createApplyCommand({
      handlers: { addSkill },
      systemSteps: [stampLoadedAt],
    });
    const result = apply(
      state,
      { type: "addSkill", id: "ferdighet-1", name: "Regnskap" },
      context,
    );
    expect(result.ok).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
    if (result.ok) {
      expect(result.state).not.toBe(state);
    }
  });
});
