import { createElement } from "react";
import type { FeatureDefinition, HomeCard } from "../../app/features";
import {
  isAdmin,
  ownedBusiness,
  workerProfileOf,
} from "../../domain/frame/people";
import { marketplaceCommandHandlers } from "../../domain/marketplace/commands";
import { isActiveWorker } from "../../domain/marketplace/visibility";
import { PageHeading } from "../../frame/ui/PageHeading";
import { marketplaceStateSchema } from "./schema";

const ownerCard: HomeCard = {
  title: "Få hjelp med små oppdrag",
  text: "Beskriv hva du trenger hjelp til, så finner vi folk som kan hjelpe deg.",
  actionLabel: "Gå til oppdrag",
  route: "/oppdrag",
};

const workerCard: HomeCard = {
  title: "Oppdrag som passer deg",
  text: "Vi matcher deg automatisk med oppdrag som passer ferdighetene dine.",
  actionLabel: "Se oppdrag",
  route: "/oppdrag",
};

const adminCard: HomeCard = {
  title: "Følg alle oppdrag",
  text: "Se alle oppdrag og det som venter på vurdering.",
  actionLabel: "Gå til oppdrag",
  route: "/oppdrag",
};

export const marketplaceFeature: FeatureDefinition = {
  id: "marketplace",
  label: "Oppdrag",
  basePath: "/oppdrag",
  homeCard: (person, state) => {
    if (ownedBusiness(person.id, state) !== undefined) {
      return ownerCard;
    }
    if (person.seeksWork || workerProfileOf(person.id, state) !== undefined) {
      return workerCard;
    }
    if (isAdmin(person)) {
      return adminCard;
    }
    return null;
  },
  routes: [
    {
      path: "/oppdrag",
      element: createElement(PageHeading, null, "Oppdrag"),
    },
  ],
  audienceGroups: { "marketplace.workers": isActiveWorker },
  commandHandlers: marketplaceCommandHandlers,
  stateSchema: marketplaceStateSchema,
  systemSteps: [],
};
