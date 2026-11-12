import { createElement } from "react";
import type { FeatureDefinition } from "../../app/features";
import { PageHeading } from "../../frame/ui/PageHeading";
import { marketplaceStateSchema } from "./schema";

export const marketplaceFeature: FeatureDefinition = {
  id: "marketplace",
  label: "Oppdrag",
  basePath: "/oppdrag",
  homeCard: () => ({
    title: "Få hjelp med små oppdrag",
    text: "Beskriv hva du trenger hjelp til, så finner vi folk som kan hjelpe deg.",
    actionLabel: "Gå til oppdrag",
    route: "/oppdrag",
  }),
  routes: [
    {
      path: "/oppdrag",
      element: createElement(PageHeading, null, "Oppdrag"),
    },
  ],
  audienceGroups: {},
  commandHandlers: {},
  stateSchema: marketplaceStateSchema,
  systemSteps: [],
};
