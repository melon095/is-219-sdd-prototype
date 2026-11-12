import type { ReactElement } from "react";
import type { RouteObject } from "react-router";
import type { DemoState, Id } from "../../../domain/frame/types";
import type { Layout } from "../../../frame/store/useLayout";
import {
  createTestStore,
  renderFrame,
  testSeedState,
} from "../../../frame/test-utils";

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
