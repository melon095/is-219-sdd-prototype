import { useEffect, useState } from "react";
import { I18nProvider } from "react-aria-components";
import { RouterProvider } from "react-router";
import { createApplyCommand } from "../domain/frame/commands";
import { createStore, StoreProvider } from "../frame/store/store";
import { LiveAnnouncer } from "../frame/ui/LiveAnnouncer";
import {
  allCommandHandlers,
  allSystemSteps,
  storedStateSchema,
} from "./features";
import { router } from "./router";

export function App() {
  const [store] = useState(() =>
    createStore({
      applyCommand: createApplyCommand({
        handlers: allCommandHandlers,
        systemSteps: allSystemSteps,
      }),
      systemSteps: allSystemSteps,
      now: () => new Date().toISOString(),
      newId: () => crypto.randomUUID(),
      storage: window.localStorage,
      storedStateSchema,
    }),
  );

  useEffect(() => {
    store.startClock();
    return () => {
      store.stopClock();
    };
  }, [store]);

  return (
    <StoreProvider store={store}>
      <I18nProvider locale="nb-NO">
        <LiveAnnouncer>
          <RouterProvider router={router} />
        </LiveAnnouncer>
      </I18nProvider>
    </StoreProvider>
  );
}
