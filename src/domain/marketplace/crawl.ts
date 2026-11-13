import {
  actorOf,
  addActivity,
  failWith,
  succeed,
  validationFailure,
} from "../frame/commandHelpers";
import type { CommandHandler, DemoState } from "../frame/types";
import { crawlActivity } from "./log";
import { crawlBlocker, crawlOptInBlocker } from "./permissions";
import type { CrawlRun, SetCrawlOptInInput } from "./types";

export const setCrawlOptIn: CommandHandler = (state, command, context) => {
  const input = command as unknown as SetCrawlOptInInput;
  const blocker = crawlOptInBlocker(
    actorOf(state, context),
    input.businessId,
    state,
  );
  if (blocker !== undefined) {
    return failWith(blocker);
  }
  if (typeof input.optIn !== "boolean") {
    return validationFailure({
      optIn: "Velg om bedriften skal få forslag eller ikke.",
    });
  }
  return succeed({
    ...state,
    frame: {
      ...state.frame,
      businesses: state.frame.businesses.map((business) =>
        business.id === input.businessId
          ? { ...business, crawlOptIn: input.optIn }
          : business,
      ),
    },
  });
};

export const simulateCrawl: CommandHandler = (state, _command, context) => {
  const blocker = crawlBlocker(actorOf(state, context));
  if (blocker !== undefined) {
    return failWith(blocker);
  }
  const roundNumber = state.marketplace.crawlRuns.length + 1;
  const crawled = state.frame.businesses.filter(
    (business) => business.crawlOptIn,
  );
  const skipped = state.frame.businesses.filter(
    (business) => !business.crawlOptIn,
  );
  const run: CrawlRun = {
    id: context.newId(),
    at: context.now,
    by: context.actorId,
    crawledBusinessIds: crawled.map((business) => business.id),
    skippedBusinessIds: skipped.map((business) => business.id),
    simulated: true,
  };
  const crawledIds = new Set(run.crawledBusinessIds);
  let next: DemoState = {
    ...state,
    frame: {
      ...state.frame,
      businesses: state.frame.businesses.map((business) => {
        if (!crawledIds.has(business.id)) {
          return business;
        }
        const rounds =
          state.marketplace.crawlCatalog.find(
            (entry) => entry.businessId === business.id,
          )?.rounds ?? [];
        const suggestions =
          rounds.length === 0
            ? []
            : (rounds[(roundNumber - 1) % rounds.length] ?? []);
        return {
          ...business,
          crawlSuggestions: [...suggestions],
          crawlSuggestionsUpdatedAt: context.now,
        };
      }),
    },
    marketplace: {
      ...state.marketplace,
      crawlRuns: [...state.marketplace.crawlRuns, run],
    },
  };
  next = addActivity(
    next,
    crawled.map((business) =>
      crawlActivity(context, context.actorId, business.ownerId),
    ),
  );
  return succeed(next);
};
