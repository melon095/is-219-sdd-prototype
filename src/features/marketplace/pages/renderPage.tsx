import type { ReactElement } from "react";
import type { RouteObject } from "react-router";
import type { Business, DemoState, Id } from "../../../domain/frame/types";
import type { Layout } from "../../../frame/store/useLayout";
import {
  createTestStore,
  renderFrame,
  testSeedState,
} from "../../../frame/test-utils";

export function withBusiness(
  state: DemoState,
  businessId: Id,
  changes: Partial<Business>,
): DemoState {
  return {
    ...state,
    frame: {
      ...state.frame,
      businesses: state.frame.businesses.map((business) =>
        business.id === businessId ? { ...business, ...changes } : business,
      ),
    },
  };
}

export type RenderPageOptions = {
  path: string;
  route: string;
  userId: Id;
  state?: DemoState;
  layout?: Layout;
  extraPages?: RouteObject[];
};

export function renderPage(
  element: ReactElement,
  {
    path,
    route,
    userId,
    state = testSeedState(),
    layout = "desktop",
    extraPages = [],
  }: RenderPageOptions,
) {
  const store = createTestStore({ state, userId });
  return renderFrame(<div hidden />, {
    store,
    route,
    layout,
    pages: [{ path, element }, ...extraPages],
  });
}
