import { describe, expect, it } from "vitest";
import type { CommandResult, DemoState } from "../frame/types";
import { durationNotice, editRequest, publishRequest } from "./requests";
import {
  createContext,
  createState,
  deepFreeze,
  ids,
  request,
  requestIn,
  testBusinesses,
  worker,
} from "./testState";

const validFields = {
  title: "Hjelp med nettbutikken",
  description: "Vi trenger hjelp til å oppdatere produktsidene.",
  requiredSkillIds: ["ferdighet-1", "ferdighet-2"],
  acceptedSuggestionIds: [] as string[],
  desiredStartDate: "2026-12-01",
  estimatedDuration: { amount: 6, unit: "weeks" },
  hoursPerWeek: 10,
  workLocation: "remote",
};

function publish(
  overrides: Record<string, unknown>,
  state: DemoState = createState({}),
  actorId: string = ids.owner1,
): CommandResult {
  return publishRequest(
    state,
    {
      type: "publishRequest",
      businessId: "bedrift-1",
      ...validFields,
      ...overrides,
    },
    createContext(actorId, "2026-11-16T10:00:00+01:00", "ny"),
  );
}

function fieldErrorsOf(result: CommandResult): Record<string, string> {
  if (result.ok) {
    throw new Error("Forventet en feil");
  }
  expect(result.error.code).toBe("validation");
  return result.error.fieldErrors ?? {};
}

describe("durationNotice", () => {
  it("warns for weeks below 2 or above 26 and months above 6", () => {
    expect(durationNotice({ amount: 1, unit: "weeks" })?.kind).toBe("warning");
    expect(durationNotice({ amount: 27, unit: "weeks" })?.kind).toBe("warning");
    expect(durationNotice({ amount: 7, unit: "months" })?.kind).toBe("warning");
  });

  it("is silent inside the typical range", () => {
    expect(durationNotice({ amount: 2, unit: "weeks" })).toBeUndefined();
    expect(durationNotice({ amount: 26, unit: "weeks" })).toBeUndefined();
    expect(durationNotice({ amount: 1, unit: "months" })).toBeUndefined();
    expect(durationNotice({ amount: 6, unit: "months" })).toBeUndefined();
  });

  it("uses the Norwegian message", () => {
    expect(durationNotice({ amount: 1, unit: "weeks" })?.message).toBe(
      "Varigheten er utenfor det vanlige (2 uker til 6 måneder). Du kan fortsatt publisere oppdraget.",
    );
  });
});

describe("publishRequest permissions", () => {
  it("lets only the owner of the business publish", () => {
    for (const actor of [ids.employee1, ids.owner2, ids.mats, ids.admin]) {
      const result = publish({}, createState({}), actor);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("not-allowed");
      }
    }
  });

  it("returns not-found for an unknown business", () => {
    const result = publish({ businessId: "bedrift-99" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-found");
    }
  });
});

describe("publishRequest validation", () => {
  it("rejects a title outside 1–100 characters", () => {
    expect(fieldErrorsOf(publish({ title: "" })).title).toBeTruthy();
    expect(fieldErrorsOf(publish({ title: "   " })).title).toBeTruthy();
    expect(
      fieldErrorsOf(publish({ title: "a".repeat(101) })).title,
    ).toBeTruthy();
    expect(publish({ title: "a".repeat(100) }).ok).toBe(true);
  });

  it("rejects a description outside 1–4000 characters", () => {
    expect(
      fieldErrorsOf(publish({ description: "" })).description,
    ).toBeTruthy();
    expect(
      fieldErrorsOf(publish({ description: "a".repeat(4001) })).description,
    ).toBeTruthy();
    expect(publish({ description: "a".repeat(4000) }).ok).toBe(true);
  });

  it("requires at least one known skill", () => {
    expect(
      fieldErrorsOf(publish({ requiredSkillIds: [] })).requiredSkillIds,
    ).toBeTruthy();
    expect(
      fieldErrorsOf(publish({ requiredSkillIds: ["ferdighet-99"] }))
        .requiredSkillIds,
    ).toBeTruthy();
  });

  it("requires a desired start date", () => {
    expect(
      fieldErrorsOf(publish({ desiredStartDate: undefined })).desiredStartDate,
    ).toBeTruthy();
    expect(
      fieldErrorsOf(publish({ desiredStartDate: "i morgen" })).desiredStartDate,
    ).toBeTruthy();
  });

  it("requires a whole-number duration of at least 1", () => {
    for (const amount of [0, -1, 1.5]) {
      expect(
        fieldErrorsOf(publish({ estimatedDuration: { amount, unit: "weeks" } }))
          .estimatedDuration,
      ).toBeTruthy();
    }
    expect(
      fieldErrorsOf(publish({ estimatedDuration: { amount: 3, unit: "days" } }))
        .estimatedDuration,
    ).toBeTruthy();
    expect(
      fieldErrorsOf(publish({ estimatedDuration: undefined }))
        .estimatedDuration,
    ).toBeTruthy();
  });

  it("requires hours per week as a whole number from 1 to 60", () => {
    for (const hoursPerWeek of [0, 61, 1.5]) {
      expect(
        fieldErrorsOf(publish({ hoursPerWeek })).hoursPerWeek,
      ).toBeTruthy();
    }
    expect(publish({ hoursPerWeek: 1 }).ok).toBe(true);
    expect(publish({ hoursPerWeek: 60 }).ok).toBe(true);
  });

  it("requires a work location", () => {
    expect(
      fieldErrorsOf(publish({ workLocation: undefined })).workLocation,
    ).toBeTruthy();
    expect(
      fieldErrorsOf(publish({ workLocation: "hjemme" })).workLocation,
    ).toBeTruthy();
  });

  it("reports every invalid field at once", () => {
    const errors = fieldErrorsOf(
      publish({ title: "", hoursPerWeek: 0, workLocation: undefined }),
    );
    expect(Object.keys(errors).sort()).toEqual([
      "hoursPerWeek",
      "title",
      "workLocation",
    ]);
  });
});

describe("publishRequest effects", () => {
  it("stores an open request with the given fields", () => {
    const state = deepFreeze(createState({}));
    const result = publish(
      { additionalRequirements: "Gjerne erfaring" },
      state,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const stored = result.state.marketplace.requests[0];
    expect(stored).toMatchObject({
      id: "ny-1",
      businessId: "bedrift-1",
      title: "Hjelp med nettbutikken",
      requiredSkillIds: ["ferdighet-1", "ferdighet-2"],
      additionalRequirements: "Gjerne erfaring",
      desiredStartDate: "2026-12-01",
      estimatedDuration: { amount: 6, unit: "weeks" },
      hoursPerWeek: 10,
      workLocation: "remote",
      status: "open",
      createdAt: "2026-11-16T10:00:00+01:00",
      shortlist: [],
      excludedWorkerIds: [],
    });
    expect(stored?.log[0]).toMatchObject({
      kind: "published",
      actor: ids.owner1,
    });
    expect(result.notices).toEqual([]);
  });

  it("publishes with a notice and a log event when the duration is unusual", () => {
    const result = publish({ estimatedDuration: { amount: 1, unit: "weeks" } });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.notices).toHaveLength(1);
    expect(result.notices[0]?.kind).toBe("warning");
    expect(
      result.state.marketplace.requests[0]?.log.map((e) => e.kind),
    ).toEqual(["published", "duration-notice"]);
  });

  it("runs matching right after publishing", () => {
    const state = createState({
      workers: [worker(ids.mats), worker(ids.amina)],
    });
    const result = publish({}, state);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const stored = result.state.marketplace.requests[0];
    expect(stored?.status).toBe("shortlisted");
    expect(stored?.shortlist.map((item) => item.workerId)).toEqual([
      ids.mats,
      ids.amina,
    ]);
    expect(stored?.log.map((e) => e.kind)).toEqual([
      "published",
      "shortlisted",
      "shortlisted",
      "status-changed",
    ]);
  });

  it("leaves the request open when no worker is eligible", () => {
    const result = publish(
      {},
      createState({ workers: [worker(ids.mats, { skillIds: [] })] }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.state.marketplace.requests[0]?.status).toBe("open");
  });

  it("announces the new request to the owner and the workers group", () => {
    const result = publish({});
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const activity = result.state.frame.activity[0];
    expect(activity?.text).toContain("Nytt oppdrag");
    expect(activity?.audience).toEqual({
      personIds: [ids.owner1],
      groups: ["marketplace.workers"],
    });
    expect(activity?.actor).toBe(ids.owner1);
    expect(activity?.target.route).toBe("/oppdrag/ny-1");
  });

  it("ignores suggestions that are not kept in requiredSkillIds when matching", () => {
    const state = createState({
      workers: [worker(ids.mats, { skillIds: ["ferdighet-3"] })],
    });
    const result = publish(
      { requiredSkillIds: ["ferdighet-1"], acceptedSuggestionIds: [] },
      state,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.state.marketplace.requests[0]?.status).toBe("open");
  });

  it("never lets a crawl suggestion the owner dropped affect matching", () => {
    const businesses = testBusinesses.map((business) =>
      business.id === "bedrift-1"
        ? { ...business, crawlSuggestions: ["ferdighet-3", "ferdighet-4"] }
        : business,
    );
    const state = createState({
      businesses,
      workers: [
        worker(ids.mats, { skillIds: ["ferdighet-3", "ferdighet-4"] }),
        worker(ids.amina, { skillIds: ["ferdighet-1"] }),
      ],
    });
    const result = publish(
      { requiredSkillIds: ["ferdighet-1"], acceptedSuggestionIds: [] },
      state,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const stored = result.state.marketplace.requests[0];
    expect(stored?.acceptedSuggestionIds).toEqual([]);
    expect(stored?.shortlist.map((item) => item.workerId)).toEqual([ids.amina]);
  });
});

describe("editRequest", () => {
  function edit(
    overrides: Record<string, unknown>,
    state: DemoState,
    actorId: string = ids.owner1,
    requestId = "oppdrag-1",
  ): CommandResult {
    return editRequest(
      state,
      { type: "editRequest", requestId, ...validFields, ...overrides },
      createContext(actorId, "2026-11-16T10:00:00+01:00", "ny"),
    );
  }

  const stateWith = (status: "open" | "shortlisted" = "open") =>
    createState({
      requests: [
        request("oppdrag-1", {
          status,
          additionalRequirements: "Gammel tekst",
        }),
      ],
    });

  it("replaces the fields, logs edited and runs matching", () => {
    const state = createState({
      requests: [request("oppdrag-1", { title: "Gammel tittel" })],
      workers: [worker(ids.mats)],
    });
    const result = edit({ title: "Ny tittel" }, deepFreeze(state));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const updated = requestIn(result.state, "oppdrag-1");
    expect(updated?.title).toBe("Ny tittel");
    expect(updated?.status).toBe("shortlisted");
    expect(updated?.log.map((e) => e.kind)).toEqual([
      "edited",
      "shortlisted",
      "status-changed",
    ]);
  });

  it("removes additional requirements when they are left out", () => {
    const result = edit({}, stateWith());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(
      requestIn(result.state, "oppdrag-1")?.additionalRequirements,
    ).toBeUndefined();
  });

  it("adds a duration notice event when needed", () => {
    const result = edit(
      { estimatedDuration: { amount: 1, unit: "months" } },
      stateWith(),
    );
    expect(result.ok).toBe(true);
    const unusual = edit(
      { estimatedDuration: { amount: 8, unit: "months" } },
      stateWith(),
    );
    expect(unusual.ok).toBe(true);
    if (!unusual.ok) {
      return;
    }
    expect(unusual.notices).toHaveLength(1);
    expect(
      requestIn(unusual.state, "oppdrag-1")?.log.map((e) => e.kind),
    ).toEqual(["edited", "duration-notice"]);
  });

  it("returns invalid-status for any status other than open", () => {
    for (const status of [
      "shortlisted",
      "offered",
      "agreed",
      "in-progress",
      "completed",
      "cancelled",
      "under-review",
    ] as const) {
      const state = createState({
        requests: [request("oppdrag-1", { status })],
      });
      const result = edit({}, state);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("invalid-status");
      }
    }
  });

  it("lets only the owner edit", () => {
    for (const actor of [ids.employee1, ids.owner2, ids.admin, ids.mats]) {
      const result = edit({}, stateWith(), actor);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("not-allowed");
      }
    }
  });

  it("returns not-found for an unknown request", () => {
    const result = edit({}, stateWith(), ids.owner1, "oppdrag-99");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-found");
    }
  });

  it("validates the fields like publishing does", () => {
    const result = edit({ title: "" }, stateWith());
    expect(fieldErrorsOf(result).title).toBeTruthy();
  });
});
