import type { ActivityEntry } from "../../src/domain/frame/types";
import type { MarketplaceState } from "../../src/domain/marketplace/types";
import type { FrameSeed } from "./frame";
import type { Rng } from "./random";

export function seedMarketplace(
  _rng: Rng,
  _frame: FrameSeed,
): { key: "marketplace"; data: MarketplaceState; activity: ActivityEntry[] } {
  return {
    key: "marketplace",
    data: {
      workerProfiles: [],
      requests: [],
      conversations: [],
      crawlCatalog: [],
      crawlRuns: [],
    },
    activity: [],
  };
}
