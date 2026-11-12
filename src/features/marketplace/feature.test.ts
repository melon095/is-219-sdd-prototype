import { describe, expect, it } from "vitest";
import { expireOverdueOffers } from "../../domain/marketplace/offers";
import {
  createState,
  ids,
  testPeople,
  worker,
} from "../../domain/marketplace/testState";
import { marketplaceFeature } from "./feature";

const state = createState({
  workers: [
    worker(ids.mats),
    worker(ids.thea, { isDraft: true, skillIds: [] }),
  ],
});

function personOf(id: string) {
  const found = testPeople.find((item) => item.id === id);
  if (found === undefined) {
    throw new Error(`Mangler ${id}`);
  }
  return found;
}

describe("marketplace feature", () => {
  it("registers every US2 and US3 command", () => {
    expect(Object.keys(marketplaceFeature.commandHandlers).sort()).toEqual([
      "acceptOffer",
      "declineOffer",
      "editRequest",
      "inviteToInterview",
      "makeOffer",
      "publishRequest",
      "registerWorkerProfile",
      "rejectShortlist",
      "returnToOpen",
      "sendMessage",
      "simulateNavReferral",
      "simulateOfferExpiry",
      "updateWorkerProfile",
    ]);
  });

  it("registers the offer expiry system step", () => {
    expect(marketplaceFeature.systemSteps).toEqual([expireOverdueOffers]);
  });

  it("registers the workers audience group for non-draft profiles", () => {
    const isMember = marketplaceFeature.audienceGroups["marketplace.workers"];
    expect(isMember?.(personOf(ids.mats), state)).toBe(true);
    expect(isMember?.(personOf(ids.thea), state)).toBe(false);
    expect(isMember?.(personOf(ids.owner1), state)).toBe(false);
  });

  it("shows a home card to owners, workers and admins only", () => {
    expect(
      marketplaceFeature.homeCard(personOf(ids.owner1), state)?.title,
    ).toBe("Få hjelp med små oppdrag");
    expect(marketplaceFeature.homeCard(personOf(ids.mats), state)).toEqual({
      title: "Oppdrag som passer deg",
      text: "Vi matcher deg automatisk med oppdrag som passer ferdighetene dine.",
      actionLabel: "Se oppdrag",
      route: "/oppdrag",
    });
    expect(marketplaceFeature.homeCard(personOf(ids.admin), state)).toEqual({
      title: "Følg alle oppdrag",
      text: "Se alle oppdrag og det som venter på vurdering.",
      actionLabel: "Gå til oppdrag",
      route: "/oppdrag",
    });
    expect(
      marketplaceFeature.homeCard(personOf(ids.employee1), state),
    ).toBeNull();
  });
});
