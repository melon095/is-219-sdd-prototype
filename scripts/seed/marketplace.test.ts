import { describe, expect, it } from "vitest";
import type { DemoState } from "../../src/domain/frame/types";
import {
  fillShortlist,
  rankCandidates,
} from "../../src/domain/marketplace/matching";
import type { TaskRequest } from "../../src/domain/marketplace/types";
import { marketplaceStateSchema } from "../../src/features/marketplace/schema";
import { buildSeedFileSchema } from "../../src/frame/store/schema";
import { buildSeedFile } from "./generate";

const seed = buildSeedFileSchema({ marketplace: marketplaceStateSchema }).parse(
  JSON.parse(buildSeedFile()),
);
const { workerProfiles, requests, conversations } = seed.marketplace;
const { people, businesses, skills } = seed.frame;

function daysBefore(date: string, days: number): string {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - days))
    .toISOString()
    .slice(0, 10);
}

function activeEntries(request: TaskRequest) {
  return request.shortlist.filter((entry) => entry.state === "active");
}

function stateWith(replaced?: TaskRequest): DemoState {
  return {
    meta: {
      seedId: seed.seedId,
      anchorDate: seed.anchorDate,
      loadedAt: `${seed.anchorDate}T08:00:00+01:00`,
    },
    frame: seed.frame,
    marketplace: {
      ...seed.marketplace,
      requests:
        replaced === undefined
          ? requests
          : requests.map((item) => (item.id === replaced.id ? replaced : item)),
    },
  };
}

describe("seeded worker profiles", () => {
  it("has 5–6 complete profiles, at least 2 with a NAV referral", () => {
    expect(workerProfiles.length).toBeGreaterThanOrEqual(5);
    expect(workerProfiles.length).toBeLessThanOrEqual(6);
    for (const profile of workerProfiles) {
      expect(profile.isDraft).toBe(false);
      expect(profile.skillIds.length).toBeGreaterThanOrEqual(1);
      expect(profile.experienceLevel).toBeDefined();
      expect(profile.availableFrom).toBeDefined();
      expect(profile.eligibleSince).toBeDefined();
    }
    expect(
      workerProfiles.filter((profile) => profile.navReferral !== undefined)
        .length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("belongs to people who seek work", () => {
    for (const profile of workerProfiles) {
      const person = people.find((item) => item.id === profile.personId);
      expect(person?.seeksWork).toBe(true);
    }
    expect(new Set(workerProfiles.map((item) => item.personId)).size).toBe(
      workerProfiles.length,
    );
  });
});

describe("seeded people without a worker profile", () => {
  it("has at least 2 people who seek work and have no profile", () => {
    const withoutProfile = people.filter(
      (person) =>
        person.seeksWork &&
        !workerProfiles.some((profile) => profile.personId === person.id),
    );
    expect(withoutProfile.length).toBeGreaterThanOrEqual(2);
  });

  it("has an open request without entries that a new profile could fit", () => {
    const open = requests.filter(
      (request) => request.status === "open" && request.shortlist.length === 0,
    );
    const target = open[0];
    expect(target).toBeDefined();
    if (target === undefined) {
      return;
    }
    const newcomer = {
      personId: "person-new",
      skillIds: target.requiredSkillIds,
      experienceLevel: "mid" as const,
      availableFrom: daysBefore(target.desiredStartDate, 1),
      isDraft: false,
    };
    expect(rankCandidates(target, [newcomer])).toHaveLength(1);
  });

  it("has an offered request where a further eligible worker is waiting", () => {
    const busy = new Set(
      requests
        .filter((item) => ["agreed", "in-progress"].includes(item.status))
        .map((item) => item.agreement?.workerId),
    );
    const waiting = requests
      .filter((request) => request.status === "offered")
      .map((request) => {
        const taken = new Set([
          ...request.shortlist
            .filter((entry) => entry.state !== "removed")
            .map((entry) => entry.workerId),
          ...request.excludedWorkerIds.map((item) => item.workerId),
        ]);
        return rankCandidates(
          request,
          workerProfiles.filter(
            (profile) =>
              !busy.has(profile.personId) && !taken.has(profile.personId),
          ),
        ).length;
      });
    expect(waiting.some((count) => count >= 1)).toBe(true);
  });
});

describe("seeded exclusions", () => {
  it("has a worker excluded after declining on one request", () => {
    expect(
      requests.some((request) =>
        request.excludedWorkerIds.some((item) => item.reason === "declined"),
      ),
    ).toBe(true);
  });

  it("has a worker excluded after an offer expired on another request", () => {
    const declined = requests.find((request) =>
      request.excludedWorkerIds.some((item) => item.reason === "declined"),
    );
    const expired = requests.find((request) =>
      request.excludedWorkerIds.some((item) => item.reason === "offer-expired"),
    );
    expect(expired).toBeDefined();
    expect(expired?.id).not.toBe(declined?.id);
  });

  it("logs the decline and the expiry on those requests", () => {
    for (const [reason, kind] of [
      ["declined", "offer-declined"],
      ["offer-expired", "offer-expired"],
    ] as const) {
      const request = requests.find((item) =>
        item.excludedWorkerIds.some((excluded) => excluded.reason === reason),
      );
      const excluded = request?.excludedWorkerIds.find(
        (item) => item.reason === reason,
      );
      expect(
        request?.log.some(
          (event) =>
            event.kind === kind && event.workerId === excluded?.workerId,
        ),
      ).toBe(true);
    }
  });
});

describe("seeded requests", () => {
  it("has 8–14 requests", () => {
    expect(requests.length).toBeGreaterThanOrEqual(8);
    expect(requests.length).toBeLessThanOrEqual(14);
  });

  it("has a request with a full shortlist of 3 active entries", () => {
    expect(
      requests.some(
        (request) =>
          request.status === "shortlisted" &&
          activeEntries(request).length === 3,
      ),
    ).toBe(true);
  });

  it("has a shortlisted request with 1 or 2 active entries", () => {
    expect(
      requests.some(
        (request) =>
          request.status === "shortlisted" &&
          [1, 2].includes(activeEntries(request).length),
      ),
    ).toBe(true);
  });

  it("has an open request with no entries because no worker is eligible", () => {
    const open = requests.filter(
      (request) => request.status === "open" && request.shortlist.length === 0,
    );
    expect(open.length).toBeGreaterThanOrEqual(1);
    for (const request of open) {
      expect(rankCandidates(request, workerProfiles)).toEqual([]);
    }
  });

  it("has an offered request whose entry was offered 2 days before the anchor date", () => {
    const offered = requests.filter((request) => request.status === "offered");
    expect(offered.length).toBeGreaterThanOrEqual(1);
    const match = offered.some((request) =>
      request.shortlist.some(
        (entry) =>
          entry.state === "offered" &&
          entry.offeredAt?.slice(0, 10) === daysBefore(seed.anchorDate, 2),
      ),
    );
    expect(match).toBe(true);
  });

  it("has an under-review request with a rejection reason", () => {
    const review = requests.filter(
      (request) => request.status === "under-review",
    );
    expect(review.length).toBeGreaterThanOrEqual(1);
    for (const request of review) {
      expect(request.rejection?.reason.length).toBeGreaterThan(0);
      expect(
        request.excludedWorkerIds.some(
          (item) => item.reason === "shortlist-rejected",
        ),
      ).toBe(true);
    }
  });

  it("has an agreed request with an agreement", () => {
    const agreed = requests.filter((request) => request.status === "agreed");
    expect(agreed.length).toBeGreaterThanOrEqual(1);
    for (const request of agreed) {
      expect(request.agreement).toBeDefined();
    }
  });

  it("never lists an excluded worker as active or offered", () => {
    for (const request of requests) {
      const excluded = new Set(
        request.excludedWorkerIds.map((item) => item.workerId),
      );
      for (const entry of request.shortlist) {
        if (entry.state !== "removed") {
          expect(excluded.has(entry.workerId)).toBe(false);
        }
      }
    }
  });
});

describe("seeded request lifecycle", () => {
  it("has every request status at least once", () => {
    const statuses = new Set(requests.map((request) => request.status));
    for (const status of [
      "open",
      "shortlisted",
      "offered",
      "agreed",
      "in-progress",
      "completed",
      "cancelled",
      "under-review",
    ]) {
      expect(statuses.has(status as TaskRequest["status"]), status).toBe(true);
    }
  });

  it("has all four exclusion reasons", () => {
    const reasons = new Set(
      requests.flatMap((request) =>
        request.excludedWorkerIds.map((item) => item.reason),
      ),
    );
    for (const reason of [
      "declined",
      "offer-expired",
      "withdrew",
      "shortlist-rejected",
    ]) {
      expect(reasons.has(reason as never), reason).toBe(true);
    }
  });

  it("has a completed request with outcome permanent at an E-Waves member and a full log", () => {
    const completed = requests.filter(
      (request) =>
        request.status === "completed" && request.outcome === "permanent",
    );
    expect(completed.length).toBeGreaterThanOrEqual(1);
    for (const request of completed) {
      const business = businesses.find(
        (item) => item.id === request.businessId,
      );
      expect(business?.isEWavesMember).toBe(true);
      const kinds = new Set(request.log.map((event) => event.kind));
      for (const kind of [
        "published",
        "shortlisted",
        "interview-invited",
        "offered",
        "offer-accepted",
        "started",
        "completed",
      ]) {
        expect(kinds.has(kind as never), kind).toBe(true);
      }
      expect(request.agreement).toBeDefined();
      expect(request.actualStartDate).toBeDefined();
    }
  });

  it("keeps another active shortlist entry on the agreed request", () => {
    const agreed = requests.filter((request) => request.status === "agreed");
    expect(agreed.length).toBeGreaterThanOrEqual(1);
    for (const request of agreed) {
      expect(
        activeEntries(request).filter(
          (entry) => entry.workerId !== request.agreement?.workerId,
        ).length,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("has an in-progress request with a start date and an agreed worker", () => {
    const inProgress = requests.filter(
      (request) => request.status === "in-progress",
    );
    expect(inProgress.length).toBe(1);
    expect(inProgress[0]?.actualStartDate).toBeDefined();
    expect(inProgress[0]?.agreement).toBeDefined();
  });

  it("has a cancelled request with a reason", () => {
    const cancelled = requests.filter(
      (request) => request.status === "cancelled",
    );
    expect(cancelled.length).toBeGreaterThanOrEqual(1);
    for (const request of cancelled) {
      expect(request.cancellation?.reason.length).toBeGreaterThan(0);
      expect(request.log.some((event) => event.kind === "cancelled")).toBe(
        true,
      );
    }
  });

  it("has a request where a worker withdrew", () => {
    const withdrawn = requests.filter((request) =>
      request.excludedWorkerIds.some((item) => item.reason === "withdrew"),
    );
    expect(withdrawn.length).toBeGreaterThanOrEqual(1);
    for (const request of withdrawn) {
      const excluded = request.excludedWorkerIds.find(
        (item) => item.reason === "withdrew",
      );
      expect(
        request.shortlist.some(
          (entry) =>
            entry.workerId === excluded?.workerId &&
            entry.state === "removed" &&
            entry.removedReason === "withdrew",
        ),
      ).toBe(true);
      expect(
        request.log.some(
          (event) =>
            event.kind === "withdrew" && event.workerId === excluded?.workerId,
        ),
      ).toBe(true);
      expect(request.agreement).toBeUndefined();
    }
  });

  it("never has a worker agreed on two requests that are agreed or in progress", () => {
    const agreedWorkers = requests
      .filter((request) => ["agreed", "in-progress"].includes(request.status))
      .map((request) => request.agreement?.workerId);
    expect(new Set(agreedWorkers).size).toBe(agreedWorkers.length);
  });
});

describe("seeded crawl", () => {
  const { crawlCatalog, crawlRuns } = seed.marketplace;
  const skillIds = new Set(skills.map((item) => item.id));

  it("has one catalog entry per business with 2–3 rounds of 3–5 known skills", () => {
    expect(crawlCatalog.map((item) => item.businessId).sort()).toEqual(
      businesses.map((item) => item.id).sort(),
    );
    for (const entry of crawlCatalog) {
      expect(entry.rounds.length).toBeGreaterThanOrEqual(2);
      expect(entry.rounds.length).toBeLessThanOrEqual(3);
      for (const round of entry.rounds) {
        expect(round.length).toBeGreaterThanOrEqual(3);
        expect(round.length).toBeLessThanOrEqual(5);
        expect(new Set(round).size).toBe(round.length);
        for (const skillId of round) {
          expect(skillIds.has(skillId)).toBe(true);
        }
      }
    }
  });

  it("has exactly one simulated crawl run by an administrator a week before the anchor date", () => {
    expect(crawlRuns).toHaveLength(1);
    const run = crawlRuns[0];
    expect(run?.simulated).toBe(true);
    expect(people.find((item) => item.id === run?.by)?.isVaroddAdmin).toBe(
      true,
    );
    expect(run?.at.slice(0, 10)).toBe(daysBefore(seed.anchorDate, 7));
    expect(run?.crawledBusinessIds.sort()).toEqual(
      businesses
        .filter((item) => item.crawlOptIn)
        .map((item) => item.id)
        .sort(),
    );
    expect(run?.skippedBusinessIds.sort()).toEqual(
      businesses
        .filter((item) => !item.crawlOptIn)
        .map((item) => item.id)
        .sort(),
    );
  });

  it("gives every opted-in business suggestions and no other business any", () => {
    for (const business of businesses) {
      if (business.crawlOptIn) {
        expect(business.crawlSuggestions.length).toBeGreaterThan(0);
        expect(business.crawlSuggestions).toEqual(
          crawlCatalog.find((item) => item.businessId === business.id)
            ?.rounds[0],
        );
        expect(business.crawlSuggestionsUpdatedAt).toBe(crawlRuns[0]?.at);
      } else {
        expect(business.crawlSuggestions).toEqual([]);
        expect(business.crawlSuggestionsUpdatedAt).toBeUndefined();
      }
    }
  });

  it("leaves every seeded request without accepted suggestions", () => {
    for (const request of requests) {
      expect(request.acceptedSuggestionIds).toEqual([]);
    }
  });
});

describe("seeded shortlists", () => {
  it("equals what fillShortlist produces from the seeded profiles", () => {
    let counter = 0;
    const context = {
      actorId: "system",
      now: `${seed.anchorDate}T08:00:00+01:00`,
      newId: () => {
        counter += 1;
        return `test-${counter}`;
      },
    };
    const refillable = requests.filter((request) =>
      ["open", "shortlisted", "offered"].includes(request.status),
    );
    expect(refillable.length).toBeGreaterThanOrEqual(1);
    for (const request of refillable) {
      const stripped: TaskRequest = {
        ...request,
        shortlist: request.shortlist.filter(
          (entry) => entry.state !== "active",
        ),
      };
      const refilled = fillShortlist(
        stripped,
        stateWith(stripped),
        context,
      ).marketplace.requests.find((item) => item.id === request.id);
      const summarise = (list: typeof request.shortlist) =>
        list.map((entry) => ({
          workerId: entry.workerId,
          matchedSkillIds: entry.matchedSkillIds,
          missingSkillIds: entry.missingSkillIds,
        }));
      expect(summarise(activeEntries(refilled ?? request))).toEqual(
        summarise(activeEntries(request)),
      );
    }
  });

  it("records matched and missing skills that agree with the profiles", () => {
    for (const request of requests) {
      for (const entry of request.shortlist) {
        const profile = workerProfiles.find(
          (item) => item.personId === entry.workerId,
        );
        expect(profile).toBeDefined();
        const ranked = rankCandidates(request, profile ? [profile] : []);
        expect(ranked[0]?.matchedSkillIds).toEqual(entry.matchedSkillIds);
        expect(ranked[0]?.missingSkillIds).toEqual(entry.missingSkillIds);
      }
    }
  });

  it("keeps at most 3 active or offered entries per request", () => {
    for (const request of requests) {
      expect(
        request.shortlist.filter((entry) => entry.state !== "removed").length,
      ).toBeLessThanOrEqual(3);
    }
  });
});

describe("seeded references", () => {
  it("points every worker, business, person and skill at an existing record", () => {
    const personIds = new Set(people.map((item) => item.id));
    const businessIds = new Set(businesses.map((item) => item.id));
    const skillIds = new Set(skills.map((item) => item.id));
    const requestIds = new Set(requests.map((item) => item.id));
    for (const profile of workerProfiles) {
      expect(personIds.has(profile.personId)).toBe(true);
      for (const skillId of profile.skillIds) {
        expect(skillIds.has(skillId)).toBe(true);
      }
    }
    for (const request of requests) {
      expect(businessIds.has(request.businessId)).toBe(true);
      for (const skillId of [
        ...request.requiredSkillIds,
        ...request.acceptedSuggestionIds,
      ]) {
        expect(skillIds.has(skillId)).toBe(true);
      }
      for (const entry of request.shortlist) {
        expect(personIds.has(entry.workerId)).toBe(true);
      }
      for (const excluded of request.excludedWorkerIds) {
        expect(personIds.has(excluded.workerId)).toBe(true);
      }
      for (const event of request.log) {
        if (event.actor !== "system") {
          expect(personIds.has(event.actor)).toBe(true);
        }
        if (event.workerId !== undefined) {
          expect(personIds.has(event.workerId)).toBe(true);
        }
      }
    }
    for (const item of conversations) {
      expect(requestIds.has(item.requestId)).toBe(true);
      expect(personIds.has(item.ownerId)).toBe(true);
      expect(personIds.has(item.workerId)).toBe(true);
      for (const message of item.messages) {
        expect(personIds.has(message.authorId)).toBe(true);
      }
    }
    for (const entry of seed.frame.activity) {
      for (const personId of entry.audience.personIds) {
        expect(personIds.has(personId)).toBe(true);
      }
      if (entry.target.route.startsWith("/oppdrag/")) {
        const requestId = entry.target.route.replace("/oppdrag/", "");
        expect(requestIds.has(requestId)).toBe(true);
      } else {
        expect(["/profil", "/bedrift"]).toContain(entry.target.route);
      }
    }
  });

  it("has at least one conversation with messages", () => {
    expect(conversations.some((item) => item.messages.length > 0)).toBe(true);
  });

  it("uses readable counter IDs for requests, messages, log events and activity", () => {
    for (const request of requests) {
      expect(request.id).toMatch(/^oppdrag-\d+$/);
      for (const event of request.log) {
        expect(event.id).toMatch(/^logg-\d+$/);
      }
    }
    for (const item of conversations) {
      for (const message of item.messages) {
        expect(message.id).toMatch(/^melding-\d+$/);
      }
    }
    for (const entry of seed.frame.activity) {
      expect(entry.id).toMatch(/^aktivitet-\d+$/);
    }
    const allIds = [
      ...requests.map((item) => item.id),
      ...requests.flatMap((item) => item.log.map((event) => event.id)),
      ...conversations.flatMap((item) => item.messages.map((m) => m.id)),
      ...seed.frame.activity.map((item) => item.id),
    ];
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("has activity entries in time order", () => {
    const times = seed.frame.activity.map((entry) => Date.parse(entry.at));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(times.length).toBeGreaterThan(0);
  });
});
