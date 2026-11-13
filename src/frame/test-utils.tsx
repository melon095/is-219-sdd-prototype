import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import {
  RouterProvider as AriaRouterProvider,
  I18nProvider,
} from "react-aria-components";
import {
  createMemoryRouter,
  Outlet,
  type RouteObject,
  RouterProvider,
  useHref,
  useNavigate,
} from "react-router";
import {
  allCommandHandlers,
  allSystemSteps,
  storedStateSchema,
} from "../app/features";
import { createApplyCommand } from "../domain/frame/commands";
import type { DemoState, Id } from "../domain/frame/types";
import { STATE_KEY, type StorageLike, USER_KEY } from "./store/persistence";
import { loadSeedState } from "./store/seed";
import { createStore, type Store, StoreProvider } from "./store/store";
import type { Layout } from "./store/useLayout";
import { LiveAnnouncer } from "./ui/LiveAnnouncer";
import { PageFocusProvider } from "./ui/PageHeading";

export const testNow = "2026-11-16T12:00:00.000Z";

export function testSeedState(): DemoState {
  return loadSeedState(new Date(testNow));
}

export function memoryStorage(
  initial: Record<string, string> = {},
): StorageLike {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

export function brokenStorage(): StorageLike {
  return {
    getItem: () => {
      throw new Error("Ingen lagring");
    },
    setItem: () => {
      throw new Error("Ingen lagring");
    },
  };
}

export type TestStoreOptions = {
  state?: DemoState;
  userId?: Id;
  storage?: StorageLike;
};

export function createTestStore({
  state,
  userId,
  storage = memoryStorage(),
}: TestStoreOptions = {}): Store {
  if (state !== undefined) {
    storage.setItem(
      STATE_KEY,
      JSON.stringify({ format: 1, seedId: state.meta.seedId, state }),
    );
  }
  if (userId !== undefined) {
    storage.setItem(USER_KEY, JSON.stringify(userId));
  }
  let counter = 0;
  return createStore({
    applyCommand: createApplyCommand({
      handlers: allCommandHandlers,
      systemSteps: allSystemSteps,
    }),
    systemSteps: allSystemSteps,
    now: () => testNow,
    newId: () => {
      counter += 1;
      return `test-id-${counter}`;
    },
    storage,
    storedStateSchema,
  });
}

export function setLayout(layout: Layout) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: layout === "desktop",
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

function Shell({ children }: { children: ReactElement }) {
  const navigate = useNavigate();

  return (
    <AriaRouterProvider navigate={(to) => navigate(to)} useHref={useHref}>
      <PageFocusProvider>
        {children}
        <Outlet />
      </PageFocusProvider>
    </AriaRouterProvider>
  );
}

export type RenderFrameOptions = {
  store?: Store;
  route?: string;
  pages?: RouteObject[];
  layout?: Layout;
};

export function renderFrame(
  ui: ReactElement,
  {
    store = createTestStore(),
    route = "/",
    pages = [{ path: "*", element: null }],
    layout = "desktop",
  }: RenderFrameOptions = {},
) {
  setLayout(layout);
  const router = createMemoryRouter(
    [{ path: "/", element: <Shell>{ui}</Shell>, children: pages }],
    { initialEntries: [route] },
  );
  const result = render(
    <StoreProvider store={store}>
      <I18nProvider locale="nb-NO">
        <LiveAnnouncer>
          <RouterProvider router={router} />
        </LiveAnnouncer>
      </I18nProvider>
    </StoreProvider>,
  );
  return { ...result, store, router };
}
