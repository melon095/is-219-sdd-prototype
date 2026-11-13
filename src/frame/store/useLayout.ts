import { useSyncExternalStore } from "react";

export type Layout = "desktop" | "mobile";

export const DESKTOP_QUERY = "(min-width: 48rem)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}

function getSnapshot(): Layout {
  return window.matchMedia(DESKTOP_QUERY).matches ? "desktop" : "mobile";
}

function getServerSnapshot(): Layout {
  return "desktop";
}

export function useLayout(): Layout {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
