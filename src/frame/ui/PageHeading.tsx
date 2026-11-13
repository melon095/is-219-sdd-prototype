import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
} from "react";
import { useLocation } from "react-router";

type FocusTracker = {
  ready: boolean;
  lastKey: string | undefined;
};

const FocusTrackerContext = createContext<FocusTracker | null>(null);

export function PageFocusProvider({ children }: { children: ReactNode }) {
  const tracker = useRef<FocusTracker>({ ready: false, lastKey: undefined });

  useEffect(() => {
    const current = tracker.current;
    current.ready = true;
    return () => {
      current.ready = false;
      current.lastKey = undefined;
    };
  }, []);

  return (
    <FocusTrackerContext.Provider value={tracker.current}>
      {children}
    </FocusTrackerContext.Provider>
  );
}

export function PageHeading({ children }: { children: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const location = useLocation();
  const tracker = useContext(FocusTrackerContext);

  useEffect(() => {
    document.title = `${children} – Varodd`;
  }, [children]);

  useEffect(() => {
    if (tracker === null) {
      return;
    }
    if (!tracker.ready) {
      tracker.lastKey = location.key;
      return;
    }
    if (tracker.lastKey !== location.key) {
      tracker.lastKey = location.key;
      ref.current?.focus();
    }
  }, [location.key, tracker]);

  return (
    <h1 ref={ref} tabIndex={-1}>
      {children}
    </h1>
  );
}
