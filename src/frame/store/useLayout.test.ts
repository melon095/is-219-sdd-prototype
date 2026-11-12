import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DESKTOP_QUERY, useLayout } from "./useLayout";

type ChangeListener = (event: MediaQueryListEvent) => void;

let matches = true;
const listeners = new Set<ChangeListener>();
const queries: string[] = [];

function fakeMatchMedia(query: string): MediaQueryList {
  queries.push(query);
  return {
    get matches() {
      return matches;
    },
    media: query,
    onchange: null,
    addEventListener: (
      _type: string,
      listener: EventListenerOrEventListenerObject,
    ) => {
      listeners.add(listener as ChangeListener);
    },
    removeEventListener: (
      _type: string,
      listener: EventListenerOrEventListenerObject,
    ) => {
      listeners.delete(listener as ChangeListener);
    },
    addListener: (listener: ChangeListener | null) => {
      if (listener) listeners.add(listener);
    },
    removeListener: (listener: ChangeListener | null) => {
      if (listener) listeners.delete(listener);
    },
    dispatchEvent: () => true,
  };
}

function fireChange(nextMatches: boolean) {
  matches = nextMatches;
  for (const listener of listeners) {
    listener({ matches: nextMatches } as MediaQueryListEvent);
  }
}

beforeEach(() => {
  matches = true;
  listeners.clear();
  queries.length = 0;
  vi.stubGlobal("matchMedia", fakeMatchMedia);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useLayout", () => {
  it("asks for the desktop breakpoint", () => {
    renderHook(() => useLayout());
    expect(DESKTOP_QUERY).toBe("(min-width: 48rem)");
    expect(queries).toContain(DESKTOP_QUERY);
  });

  it('returns "desktop" when the query matches', () => {
    const { result } = renderHook(() => useLayout());
    expect(result.current).toBe("desktop");
  });

  it('returns "mobile" when the query does not match', () => {
    matches = false;
    const { result } = renderHook(() => useLayout());
    expect(result.current).toBe("mobile");
  });

  it("updates when the media query changes", () => {
    const { result } = renderHook(() => useLayout());
    expect(result.current).toBe("desktop");
    act(() => fireChange(false));
    expect(result.current).toBe("mobile");
    act(() => fireChange(true));
    expect(result.current).toBe("desktop");
  });

  it("stops listening when unmounted", () => {
    const { unmount } = renderHook(() => useLayout());
    expect(listeners.size).toBe(1);
    unmount();
    expect(listeners.size).toBe(0);
  });
});
