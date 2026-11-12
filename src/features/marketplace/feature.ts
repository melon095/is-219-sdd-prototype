import { createElement } from "react";
import type { FeatureDefinition, HomeCard } from "../../app/features";
import {
  isAdmin,
  ownedBusiness,
  workerProfileOf,
} from "../../domain/frame/people";
import { marketplaceCommandHandlers } from "../../domain/marketplace/commands";
import { expireOverdueOffers } from "../../domain/marketplace/offers";
import { isActiveWorker } from "../../domain/marketplace/visibility";
import { FeatureLayout } from "./components/FeatureSubNav";
import { AdminPage } from "./pages/AdminPage";
import { BusinessPage } from "./pages/BusinessPage";
import { RequestFormPage } from "./pages/RequestFormPage";
import { RequestListPage } from "./pages/RequestListPage";
import { RequestPage } from "./pages/RequestPage";
import { WorkerProfilePage } from "./pages/WorkerProfilePage";
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
      element: createElement(FeatureLayout),
      children: [
        { path: "/oppdrag", element: createElement(RequestListPage) },
        { path: "/oppdrag/ny", element: createElement(RequestFormPage) },
        { path: "/oppdrag/:requestId", element: createElement(RequestPage) },
        {
          path: "/oppdrag/:requestId/rediger",
          element: createElement(RequestFormPage),
        },
        { path: "/profil", element: createElement(WorkerProfilePage) },
        { path: "/bedrift", element: createElement(BusinessPage) },
        { path: "/admin", element: createElement(AdminPage) },
      ],
    },
  ],
  audienceGroups: { "marketplace.workers": isActiveWorker },
  commandHandlers: marketplaceCommandHandlers,
  stateSchema: marketplaceStateSchema,
  systemSteps: [expireOverdueOffers],
};
