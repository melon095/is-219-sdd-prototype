import { describe, expect, it } from "vitest";
import type { Business, CommandResult, DemoState } from "../frame/types";
import { setCrawlOptIn, simulateCrawl } from "./crawl";
import {
  createContext,
  createState,
  deepFreeze,
  ids,
  request,
  testBusinesses,
} from "./testState";
import type { CrawlRun } from "./types";

const now = "2026-11-16T10:00:00+01:00";

const catalog = [
  {
    businessId: "bedrift-1",
    rounds: [
      ["ferdighet-1", "ferdighet-2", "ferdighet-3"],
      ["ferdighet-4", "ferdighet-5", "ferdighet-6"],
    ],
  },
  {
    businessId: "bedrift-2",
    rounds: [["ferdighet-3", "ferdighet-4", "ferdighet-5"]],
  },
];

function businessesWith(overrides: Record<string, Partial<Business>>) {
  return testBusinesses.map((business) => ({
    ...business,
    ...(overrides[business.id] ?? {}),
  }));
}

function previousRun(id: string): CrawlRun {
  return {
    id,
    at: "2026-11-09T10:00:00+01:00",
    by: ids.admin,
    crawledBusinessIds: ["bedrift-1"],
    skippedBusinessIds: ["bedrift-2"],
    simulated: true,
  };
}

function optIn(
  state: DemoState,
  actorId: string,
  businessId: string,
  value: unknown,
): CommandResult {
  return setCrawlOptIn(
    state,
    { type: "setCrawlOptIn", businessId, optIn: value },
    createContext(actorId, now),
  );
}

function crawl(state: DemoState, actorId: string = ids.admin): CommandResult {
  return simulateCrawl(
    state,
    { type: "simulateCrawl" },
    createContext(actorId, now),
  );
}

function okState(result: CommandResult): DemoState {
  if (!result.ok) {
    throw new Error(`Forventet suksess: ${result.error.message}`);
  }
  return result.state;
}

function errorOf(result: CommandResult) {
  if (result.ok) {
    throw new Error("Forventet en feil");
  }
  return result.error;
}

function businessOf(state: DemoState, id: string) {
  const found = state.frame.businesses.find((item) => item.id === id);
  if (found === undefined) {
    throw new Error(`Mangler ${id}`);
  }
  return found;
}

describe("setCrawlOptIn", () => {
  it("lets the owner switch opt-in off and on", () => {
    const off = okState(
      optIn(deepFreeze(createState()), ids.owner1, "bedrift-1", false),
    );
    expect(businessOf(off, "bedrift-1").crawlOptIn).toBe(false);

    const on = okState(optIn(createState(), ids.owner2, "bedrift-2", true));
    expect(businessOf(on, "bedrift-2").crawlOptIn).toBe(true);
  });

  it("keeps the existing suggestions and changes nothing else", () => {
    const state = createState({
      businesses: businessesWith({
        "bedrift-1": {
          crawlSuggestions: ["ferdighet-1", "ferdighet-2"],
          crawlSuggestionsUpdatedAt: "2026-11-09T10:00:00+01:00",
        },
      }),
    });
    const next = okState(optIn(state, ids.owner1, "bedrift-1", false));
    expect(businessOf(next, "bedrift-1")).toEqual({
      ...businessOf(state, "bedrift-1"),
      crawlOptIn: false,
    });
    expect(businessOf(next, "bedrift-2")).toEqual(
      businessOf(state, "bedrift-2"),
    );
    expect(next.frame.activity).toEqual([]);
    expect(next.marketplace.crawlRuns).toEqual([]);
  });

  it("is allowed only for the owner of that business", () => {
    for (const actor of [ids.employee1, ids.owner2, ids.admin, ids.mats]) {
      expect(
        errorOf(optIn(createState(), actor, "bedrift-1", false)).code,
      ).toBe("not-allowed");
    }
  });

  it("returns not-found for an unknown business", () => {
    expect(
      errorOf(optIn(createState(), ids.owner1, "bedrift-99", true)).code,
    ).toBe("not-found");
  });

  it("needs a true or false value", () => {
    for (const value of [undefined, "ja", 1]) {
      const error = errorOf(
        optIn(createState(), ids.owner1, "bedrift-1", value),
      );
      expect(error.code).toBe("validation");
      expect(error.fieldErrors?.optIn).toBeDefined();
    }
  });
});

describe("simulateCrawl", () => {
  const base = () => createState({ crawlCatalog: catalog });

  it("is allowed only for administrators", () => {
    for (const actor of [ids.owner1, ids.employee1, ids.owner2, ids.mats]) {
      expect(errorOf(crawl(base(), actor)).code).toBe("not-allowed");
    }
  });

  it("records a simulated run with crawled and skipped businesses", () => {
    const next = okState(crawl(deepFreeze(base())));
    expect(next.marketplace.crawlRuns).toEqual([
      {
        id: "ny-1",
        at: now,
        by: ids.admin,
        crawledBusinessIds: ["bedrift-1"],
        skippedBusinessIds: ["bedrift-2"],
        simulated: true,
      },
    ]);
  });

  it("gives each crawled business the suggestions of the first round", () => {
    const next = okState(crawl(base()));
    expect(businessOf(next, "bedrift-1").crawlSuggestions).toEqual([
      "ferdighet-1",
      "ferdighet-2",
      "ferdighet-3",
    ]);
    expect(businessOf(next, "bedrift-1").crawlSuggestionsUpdatedAt).toBe(now);
  });

  it("leaves businesses without opt-in untouched", () => {
    const state = createState({
      crawlCatalog: catalog,
      businesses: businessesWith({
        "bedrift-2": {
          crawlSuggestions: ["ferdighet-6"],
          crawlSuggestionsUpdatedAt: "2026-10-01T09:00:00+01:00",
        },
      }),
    });
    const next = okState(crawl(state));
    expect(businessOf(next, "bedrift-2")).toEqual(
      businessOf(state, "bedrift-2"),
    );
  });

  it("uses the opt-in value at the moment of the crawl", () => {
    const afterOptOut = okState(optIn(base(), ids.owner1, "bedrift-1", false));
    const afterOptIn = okState(
      optIn(afterOptOut, ids.owner2, "bedrift-2", true),
    );
    const next = okState(crawl(afterOptIn));
    const run = next.marketplace.crawlRuns[0];
    expect(run?.crawledBusinessIds).toEqual(["bedrift-2"]);
    expect(run?.skippedBusinessIds).toEqual(["bedrift-1"]);
    expect(businessOf(next, "bedrift-2").crawlSuggestions).toEqual([
      "ferdighet-3",
      "ferdighet-4",
      "ferdighet-5",
    ]);
  });

  it("uses round n modulo the number of rounds on later runs", () => {
    const first = okState(crawl(base()));
    const second = okState(crawl(first));
    expect(businessOf(second, "bedrift-1").crawlSuggestions).toEqual([
      "ferdighet-4",
      "ferdighet-5",
      "ferdighet-6",
    ]);
    const third = okState(crawl(second));
    expect(businessOf(third, "bedrift-1").crawlSuggestions).toEqual([
      "ferdighet-1",
      "ferdighet-2",
      "ferdighet-3",
    ]);
    expect(third.marketplace.crawlRuns).toHaveLength(3);
  });

  it("counts earlier runs when choosing the round", () => {
    const state = createState({
      crawlCatalog: catalog,
      crawlRuns: [previousRun("kjoring-1")],
    });
    const next = okState(crawl(state));
    expect(businessOf(next, "bedrift-1").crawlSuggestions).toEqual([
      "ferdighet-4",
      "ferdighet-5",
      "ferdighet-6",
    ]);
    expect(next.marketplace.crawlRuns.map((run) => run.id)).toEqual([
      "kjoring-1",
      "ny-1",
    ]);
  });

  it("never changes existing requests", () => {
    const requests = [
      request("oppdrag-1", {
        requiredSkillIds: ["ferdighet-2"],
        acceptedSuggestionIds: ["ferdighet-2"],
      }),
      request("oppdrag-2", {
        status: "shortlisted",
        requiredSkillIds: ["ferdighet-6"],
        acceptedSuggestionIds: [],
      }),
    ];
    const state = createState({ crawlCatalog: catalog, requests });
    const next = okState(crawl(okState(crawl(state))));
    expect(next.marketplace.requests).toEqual(requests);
  });

  it("announces new suggestions to the owner of each crawled business", () => {
    const state = createState({
      crawlCatalog: catalog,
      businesses: businessesWith({ "bedrift-2": { crawlOptIn: true } }),
    });
    const next = okState(crawl(state));
    expect(next.frame.activity).toHaveLength(2);
    expect(next.frame.activity.map((entry) => entry.audience)).toEqual([
      { personIds: [ids.owner1], groups: [] },
      { personIds: [ids.owner2], groups: [] },
    ]);
    for (const entry of next.frame.activity) {
      expect(entry.text).toBe("Nye forslag til ferdigheter (simulert)");
      expect(entry.featureId).toBe("marketplace");
      expect(entry.actor).toBe(ids.admin);
      expect(entry.at).toBe(now);
      expect(entry.target).toEqual({ route: "/bedrift" });
    }
  });

  it("adds no activity for businesses that are skipped", () => {
    const next = okState(crawl(base()));
    expect(next.frame.activity).toHaveLength(1);
    expect(next.frame.activity[0]?.audience.personIds).toEqual([ids.owner1]);
  });

  it("gives an empty suggestion list to a crawled business with no catalog entry", () => {
    const state = createState({
      businesses: businessesWith({
        "bedrift-1": { crawlSuggestions: ["ferdighet-6"] },
      }),
    });
    const next = okState(crawl(state));
    expect(businessOf(next, "bedrift-1").crawlSuggestions).toEqual([]);
    expect(next.marketplace.crawlRuns[0]?.crawledBusinessIds).toEqual([
      "bedrift-1",
    ]);
  });
});
